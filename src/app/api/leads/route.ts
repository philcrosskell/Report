import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as AnyRecord
    const { industry, postcode, suburb, count } = body as {
      industry: string; postcode: string; suburb?: string; count?: string
    }

    if (!industry || !postcode) {
      return NextResponse.json({ success: false, error: 'Industry and postcode are required' }, { status: 400 })
    }

    const client = new Anthropic()
    const location = suburb ? suburb + ' ' + postcode + ' Australia' : postcode + ' Australia'
    const n = parseInt(count || '5')

    const response = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a digital marketing analyst finding real local businesses with weak online presence. Search for real businesses, then evaluate their websites. Output only raw JSON — no markdown, no backticks.',
      messages: [{
        role: 'user',
        content: `Search Google to find REAL ${industry} businesses that actually exist in ${location}.

Do 2-3 searches:
1. Search: "${industry} ${suburb || postcode} NSW" to find actual local businesses
2. Search: "${industry} near ${suburb || postcode}" to find more
3. Search: "${industry} ${suburb || postcode} contact" to find ones with websites

Find ${n} REAL businesses that actually exist in or near ${location}. Only include businesses with real websites. Focus on finding ones with a WEAK online presence — outdated sites, few reviews, poor SEO — as these are the best prospects to pitch digital marketing services to.

Return ONLY a raw JSON array (no markdown) of ${n} objects, each with:
- businessName: real business name you found
- website: their actual website URL (must start with https://, or use their Facebook/Google listing URL if no website)
- industry: "${industry}"
- overallScore: integer 20-55 (how weak is their online presence — lower = weaker = better prospect)
- categories: object with keys seo, ux, conversion, mobile, content, brand (each 20-60)
- criticalIssues: integer 2-6
- opportunityScore: integer 6-9
- pitchHook: max 8 words describing their main weakness
- issues: array of exactly 2 short strings describing specific weaknesses
- opportunities: array of exactly 1 short string describing the biggest opportunity

Only include businesses that actually exist in or near ${location}. Start response with [ now.`
      }]
    })

    const rawText = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()

    const start = rawText.indexOf('[')
    const end = rawText.lastIndexOf(']')

    if (start === -1 || end === -1) {
      return NextResponse.json({ success: false, error: 'No results — please try again' }, { status: 422 })
    }

    const jsonStr = rawText.substring(start, end + 1)
    let prospects: AnyRecord[] = []

    try {
      prospects = JSON.parse(jsonStr) as AnyRecord[]
    } catch {
      const objMatches = jsonStr.match(/\{[^{}]+\}/g)
      if (objMatches) {
        for (const m of objMatches) {
          try { prospects.push(JSON.parse(m) as AnyRecord) } catch { continue }
        }
      }
    }

    if (!prospects.length) {
      return NextResponse.json({ success: false, error: 'Could not parse results — please try again' }, { status: 422 })
    }

    return NextResponse.json({ success: true, prospects })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
