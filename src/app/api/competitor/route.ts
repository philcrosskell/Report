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
    const metaMap: Record<string, { title: string; description: string; ctaCount: number; hasForms: boolean; hasTestimonials: boolean; testimonialCount: number; hasStarRatings: boolean; phoneNumbers: string[]; wordCount: number }> = {}
    const metaScrapeTargets = [{ name: businessName, url: ensureHttps(businessUrl) }, ...competitors.filter(c => c.name && c.url).map(c => ({ name: c.name, url: ensureHttps(c.url) }))]
  await Promise.allSettled(metaScrapeTargets.map(mt => (async () => {
    try {
      const ms = await scrapePage(mt.url)
      if (!ms.error) metaMap[mt.name] = { title: ms.title || '', description: ms.metaDescription || '', ctaCount: ms.ctaButtonCount || 0, hasForms: ms.hasForms || false, hasTestimonials: ms.hasTestimonials || false, testimonialCount: ms.testimonialCount || 0, hasStarRatings: ms.hasStarRatings || false, phoneNumbers: ms.phoneNumbers || [], wordCount: ms.wordCount || 0 }
    } catch { /* ignore */ }
  })()))

    const metaLinesParts: string[] = []
  for (const ek in metaMap) {
    const ev = metaMap[ek]
    metaLinesParts.push(`  ${ek}: "${ev.title}" — ${ev.description} | CTAs:${ev.ctaCount||0} Forms:${ev.hasForms?'y':'n'} Testimonials:${ev.testimonialCount||0} Stars:${ev.hasStarRatings?'y':'n'} Phone:${ev.phoneNumbers&&ev.phoneNumbers.length?ev.phoneNumbers[0]:'none'} Words:${ev.wordCount||0}`)
  }
  const metaLines = metaLinesParts.join('\n')
    const ctx = `Business: ${businessName} (${businessUrl})\nMarket: ${market ?? 'Not specified'}\nCompetitors:\n${compList}\n\nActual page titles & descriptions (use these â do NOT guess):\n${metaLines}`
    const sys = `You are a competitive intelligence analyst. Respond ONLY with valid JSON. No markdown. Keep ALL string values under 20 words — except the "summary" field which must be 2-3 plain English sentences written for a business owner, not a consultant. No jargon.`

    // Call 1: Profiles + Claims + Headlines
    const r1 = await callAI(sys, `Analyse these businesses. Return ONLY this JSON, all strings max 20 words:\n\n${ctx}\n\n{
  "headlineFindings": [{"number":1,"title":"string","detail":"string"}],
  "profiles": [{
    "name":"string","url":"string","tier":"Premium|Mid|Budget",
    "positioning":"string","whatTheyDoWell":"string",
    "hookType":"string","hookHeadline":"string","hookEffectiveness":"string",
    "primaryAnxiety":"string","outcomePromised":"string","howTheyProve":"string","actionTrigger":"string"
  }],
  "claimsMatrix":{"claimTypes":["string"],"rows":[{"claimType":"string","values":{"BusinessName":"Yes|No|Partial"}}]},
  "openingSummary":"3-4 plain English sentences: who leads this market and why, where the primary business sits vs each competitor, and the single most important opportunity. Name competitors. No jargon."
}`)

    // Call 2: Strategy
    const r2 = await callAI(sys, `Analyse these businesses. Return ONLY this JSON, all strings max 20 words:\n\n${ctx}\n\n{
  "tableStakes":["string"],
  "whiteSpace":[{"opportunity":"string","rationale":"string","owner":"string"}],
  "noiseToAvoid":["string"],
  "buyerAnxieties":[{"concern":"string","addressedBy":"string","ignoredBy":"string"}],
  "strategicImplications":[{"number":1,"title":"string","detail":"string"}],
  "quickWins":[{"action":"string","why":"string","effort":"Easy|Medium|Hard"}],
  "summary":"2-3 plain English sentences explaining what this means for the business owner — no jargon, no buzzwords, just clear practical insight"
}`)

    // Call 4: Content & Messaging Analysis
  const r4 = await callAI(sys, `Analyse the content and messaging for each business. Return ONLY this JSON:\n\n${ctx}\n\n{"messagingAnalysis":[{"name":"string","primaryMessage":"string","painPointsAddressed":["string"],"targetAudience":"string","tone":"string","contentThemes":["string"]}],"contentGaps":["string"]}\n\nprimaryMessage: their core homepage value prop in max 10 words. painPointsAddressed: 2-3 specific customer problems they call out. targetAudience: who they speak to in max 8 words. tone: one of Formal/Casual/Urgent/Aspirational/Fear-based/Trust-based. contentThemes: 2-3 topics they focus on. contentGaps: 2-3 topics none of the competitors address. Start with {`)

  // Call 3: Social proof
  const r3 = await callAI(sys, `Analyse social proof for each business. Return ONLY this JSON:\n\n${ctx}\n\n{"socialProof":[{"name":"string","hasTestimonials":true,"testimonialCount":0,"hasReviews":true,"reviewRating":0.0,"reviewCount":0,"hasCaseStudies":true,"caseStudyCount":0,"hasTrustBadges":true,"trustBadgeTypes":["string"],"hasStarRatings":true,"socialProofScore":0,"socialProofSummary":"string"}]}\n\nsocialProofScore 0-100. Start with {`)
  const part1 = safeParseJSON<Record<string, unknown>>(r1)
    const part2 = safeParseJSON<Record<string, unknown>>(r2)
    const part3 = safeParseJSON<Record<string, unknown>>(r3)
    const part4 = safeParseJSON<Record<string, unknown>>(r4)

    // Scrape and score all URLs in parallel
    const allUrls = [
      { name: businessName, url: ensureHttps(businessUrl) },
      ...competitors.filter(c => c.name && c.url).map(c => ({ name: c.name, url: ensureHttps(c.url) }))
    ]
    const seoScores: Record<string, { score: number; breakdown: Record<string, number> }> = {}
    await Promise.allSettled(allUrls.map(item => (async () => {
      try {
        const seoPage = await scrapePage(item.url)
        if (!seoPage.error) {
          const tech = runTechnicalChecks(seoPage)
          const normUrl = item.url.replace(/https?:\/\//, '').replace(/\/$/, '').toLowerCase()
          seoScores[normUrl] = { score: tech.score, breakdown: tech.breakdown }
        }
      } catch { /* skip */ }
    })()))

    // Attach SEO scores to profiles â match by URL (reliable) then name (fallback)
    const profilesList = part1.profiles as Record<string, unknown>[] ?? []
  const profiles: Record<string, unknown>[] = []
  for (let pi = 0; pi < profilesList.length; pi++) {
    const prof = profilesList[pi]
    const profUrl = ((prof.url as string) ?? '').replace(/https?:\/\//, '').replace(/\/$/, '').toLowerCase()
    const profName = ((prof.name as string) ?? '').toLowerCase()
    const urlMatch = seoScores[profUrl]
    if (urlMatch) { profiles.push({ ...prof, seoScore: urlMatch.score, seoBreakdown: urlMatch.breakdown }); continue }
    let matched = false
    for (let ui = 0; ui < allUrls.length; ui++) {
      const uName = allUrls[ui].name.toLowerCase()
      if (uName.includes(profName) || profName.includes(uName)) {
        const normFb = allUrls[ui].url.replace(/https?:\/\//, '').replace(/\/$/, '').toLowerCase()
        const fbScore = seoScores[normFb]
        if (fbScore) { profiles.push({ ...prof, seoScore: fbScore.score, seoBreakdown: fbScore.breakdown }); matched = true; break }
      }
    }
    if (!matched) profiles.push(prof)
  }

    return NextResponse.json({ success: true, report: {
      businessName, businessUrl, market: market ?? '', date: new Date().toISOString(),
      brandLogo: brandLogo ?? '', ...part1, profiles, seoScores, ...part2, ...part3, ...part4
    }})
  } catch (err) {
    console.error('Competitor analysis error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
