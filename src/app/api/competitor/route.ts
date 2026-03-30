import { NextRequest, NextResponse } from 'next/server'
import { scrapePage } from '@/lib/scraper'
import { runTechnicalChecks } from '@/lib/ai'

function safeParseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  try { return JSON.parse(cleaned) as T } catch {
    const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T
    throw new Error('Could not parse JSON: ' + cleaned.slice(0, 200))
  }
}

async function callAI(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessName, businessUrl, market, competitors, brandLogo } = body as {
      businessName: string; businessUrl: string; market?: string
      competitors: { name: string; url: string }[]; brandLogo?: string
    }

    const ensureHttps = (u: string) => u.startsWith('http') ? u : `https://${u}`
    const compList = competitors.filter(c => c.name && c.url).map(c => `- ${c.name} (${c.url})`).join('\n')

    // Pre-scrape all pages to get real metadata for the AI context
    const metaMap: Record<string, { title: string; description: string }> = {}
    await Promise.allSettled(
      [{ name: businessName, url: ensureHttps(businessUrl) }, ...competitors.filter(c => c.name && c.url).map(c => ({ name: c.name, url: ensureHttps(c.url) }))].map(async ({ name, url }) => {
        try {
          const s = await scrapePage(url)
          if (!s.error) metaMap[name] = { title: s.title || '', description: s.metaDescription || '' }
        } catch { /* ignore */ }
      })
    )

    const metaLines = Object.entries(metaMap).map(([n, m]) => `  ${n}: "${m.title}" â ${m.description}`).join('\n')
    const ctx = `Business: ${businessName} (${businessUrl})\nMarket: ${market ?? 'Not specified'}\nCompetitors:\n${compList}\n\nActual page titles & descriptions (use these â do NOT guess):\n${metaLines}`
    const sys = `You are a competitive intelligence analyst. Respond ONLY with valid JSON. No markdown. Keep ALL string values under 20 words.`

    // Call 1: Profiles + Claims + Headlines
    const r1 = await callAI(sys, `Analyse these businesses. Return ONLY this JSON, all strings max 20 words:\n\n${ctx}\n\n{
  "headlineFindings": [{"number":1,"title":"string","detail":"string"}],
  "profiles": [{
    "name":"string","url":"string","tier":"Premium|Mid|Budget",
    "positioning":"string","whatTheyDoWell":"string",
    "hookType":"string","hookHeadline":"string","hookEffectiveness":"string",
    "primaryAnxiety":"string","outcomePromised":"string","howTheyProve":"string","actionTrigger":"string"
  }],
  "claimsMatrix":{"claimTypes":["string"],"rows":[{"claimType":"string","values":{"BusinessName":"Yes|No|Partial"}}]}
}`)

    // Call 2: Strategy
    const r2 = await callAI(sys, `Analyse these businesses. Return ONLY this JSON, all strings max 20 words:\n\n${ctx}\n\n{
  "tableStakes":["string"],
  "whiteSpace":[{"opportunity":"string","rationale":"string","owner":"string"}],
  "noiseToAvoid":["string"],
  "buyerAnxieties":[{"concern":"string","addressedBy":"string","ignoredBy":"string"}],
  "strategicImplications":[{"number":1,"title":"string","detail":"string"}],
  "quickWins":[{"action":"string","why":"string","effort":"Easy|Medium|Hard"}],
  "summary":"string"
}`)

    // Call 3: Social proof audit per business
  const r3 = await callAI(sys, `Analyse the social proof for each business. Return ONLY this JSON, all strings max 20 words:\n\n${ctx}\n\n{ "socialProof": [{ "name": "string", "hasTestimonials": true, "testimonialCount": 0, "hasReviews": true, "reviewPlatforms": ["string"], "reviewRating": 0.0, "reviewCount": 0, "hasCaseStudies": true, "caseStudyCount": 0, "hasTrustBadges": true, "trustBadgeTypes": ["string"], "hasStarRatings": true, "socialProofScore": 0, "socialProofSummary": "string" }] }\n\nsocialProofScore 0-100 (higher = more). Start with {`)
  const part1 = safeParseJSON<Record<string, unknown>>(r1)
    const part2 = safeParseJSON<Record<string, unknown>>(r2)
    const part3 = safeParseJSON<Record<string, unknown>>(r3)

    // Scrape and score all URLs in parallel
    const allUrls = [
      { name: businessName, url: ensureHttps(businessUrl) },
      ...competitors.filter(c => c.name && c.url).map(c => ({ name: c.name, url: ensureHttps(c.url) }))
    ]
    const seoScores: Record<string, { score: number; breakdown: Record<string, number> }> = {}
    await Promise.allSettled(
      allUrls.map(async ({ name, url }) => {
        try {
          const scraped = await scrapePage(url)
          if (!scraped.error) {
            const tech = runTechnicalChecks(scraped)
            // Store by normalised URL so we can match reliably
            const normUrl = url.replace(/https?:\/\//, '').replace(/\/$/, '').toLowerCase()
            seoScores[normUrl] = { score: tech.score, breakdown: tech.breakdown }
          }
        } catch { /* skip failed scrapes */ }
      })
    )

    // Attach SEO scores to profiles â match by URL (reliable) then name (fallback)
    const profiles = (part1.profiles as Record<string, unknown>[] ?? []).map(p => {
      const pUrl = ((p.url as string) ?? '').replace(/https?:\/\//, '').replace(/\/$/, '').toLowerCase()
      const pName = (p.name as string ?? '').toLowerCase()
      // Try URL match first
      const urlMatch = seoScores[pUrl]
      if (urlMatch) return { ...p, seoScore: urlMatch.score, seoBreakdown: urlMatch.breakdown }
      // Fallback: partial name match against the allUrls list
      const nameMatch = allUrls.find(u => {
        const uName = u.name.toLowerCase()
        return uName.includes(pName) || pName.includes(uName)
      })
      if (nameMatch) {
        const normFallback = nameMatch.url.replace(/https?:\/\//, '').replace(/\/$/, '').toLowerCase()
        const fallbackScore = seoScores[normFallback]
        if (fallbackScore) return { ...p, seoScore: fallbackScore.score, seoBreakdown: fallbackScore.breakdown }
      }
      return p
    })

    return NextResponse.json({ success: true, report: {
      businessName, businessUrl, market: market ?? '', date: new Date().toISOString(),
      brandLogo: brandLogo ?? '', ...part1, profiles, seoScores, ...part2, ...part3
    }})
  } catch (err) {
    console.error('Competitor analysis error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
