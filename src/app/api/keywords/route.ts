import { NextRequest, NextResponse } from 'next/server'
import { scrapePage } from '@/lib/scraper'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

async function callAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: 'You are an expert SEO strategist. Respond ONLY with valid JSON. No markdown.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AnyRecord
    const { url, location, seedTopic } = body as { url: string; location?: string; seedTopic?: string }

    if (!url) return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })

    // Scrape the page
    const scraped = await scrapePage(url)
    const pageContext = [
      'URL: ' + url,
      'Title: ' + (scraped.title || 'unknown'),
      'Description: ' + (scraped.metaDescription || 'none'),
      'H1s: ' + scraped.h1.join(', '),
      'H2s: ' + scraped.h2.slice(0, 8).join(', '),
      'Word count: ' + scraped.wordCount,
    ].join('\n')

    const locationCtx = location ? 'Target location: ' + location : 'No specific location provided'
    const seedCtx = seedTopic ? 'Seed topic/service: ' + seedTopic : 'Infer topics from page content'

    const prompt = `Analyse this website and generate keyword recommendations for a content strategy.

${pageContext}
${locationCtx}
${seedCtx}

Return ONLY this JSON structure:
{
  "businessSummary": "1 sentence describing what this business does and who they serve",
  "primaryKeywords": [
    { "keyword": "string", "intent": "commercial|informational|navigational", "suggestedUse": "string", "contentNote": "string" }
  ],
  "longTailKeywords": [
    { "keyword": "string", "intent": "commercial|informational|navigational", "suggestedUse": "string", "contentNote": "string" }
  ],
  "localKeywords": [
    { "keyword": "string", "intent": "commercial|informational|navigational", "suggestedUse": "string", "contentNote": "string" }
  ],
  "gapKeywords": [
    { "keyword": "string", "intent": "commercial|informational|navigational", "suggestedUse": "string", "contentNote": "string" }
  ]
}

Rules:
- primaryKeywords: 8-10 core terms the site should rank for
- longTailKeywords: 8-10 specific phrases (questions, how-to, best X for Y)
- localKeywords: 8-10 location-based variants (use the location provided or infer from page)
- gapKeywords: 8-10 terms competitors likely rank for that this site is missing
- suggestedUse: one of: Page Title, Blog Post, FAQ, Service Page, Meta Description, Landing Page
- contentNote: max 10 words — specific angle or tip for using this keyword
- All strings max 15 words
Start with {`

    const raw = await callAI(prompt)
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    let result: AnyRecord
    try {
      result = JSON.parse(cleaned) as AnyRecord
    } catch {
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start === -1 || end === -1) return NextResponse.json({ success: false, error: 'Could not parse keywords — please try again' }, { status: 422 })
      result = JSON.parse(cleaned.slice(start, end + 1)) as AnyRecord
    }

    return NextResponse.json({ success: true, keywords: result, scrapedTitle: scraped.title || url })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
