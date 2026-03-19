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
      system: 'You are a digital marketing analyst. Search for real, existing businesses and evaluate their online presence. Output only raw JSON — no markdown, no backticks.',
      messages: [{
        role: 'user',
        content: `Search Google to find REAL ${industry} businesses that actually exist in ${location}.

Do 2-3 searches:
1. Search: "${industry} ${suburb || postcode} site:google.com" or "${industry} near ${suburb || postcode} NSW"  
2. Search: "best ${industry} ${suburb || postcode}" to find well-reviewed ones
3. Search: "${industry} ${suburb || postcode} reviews" to find ones with strong online presence

Find ${n} REAL businesses that actually exist in or near ${location}. Only include businesses with real websites. Look for ones that have strong online presence: good Google reviews, professional website, active GBP.

Return ONLY a raw JSON array (no markdown) of ${n} objects, each with:
- businessName: real business name you found
- website: their actual website URL (must start with https://)
- overallScore: integer 65-98 (how strong is their online presence overall)
- categories: object with keys seo, ux, conversion, mobile, content, brand (each 60-99)
- reviewCount: number of Google reviews you found (or estimate from what you saw)
- reviewRating: their Google rating (e.g. 4.8)
- strengthScore: integer 7-10
- whyTheyRank: one sentence max 12 words, the main reason they rank well locally
- strengths: array of 3 short strings — specific things they do well online
- keyTactics: array of 2 short strings — specific tactics worth copying

Only include businesses with real websites. Start response with [ now.`
      }]
    })

    const text = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()

    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start === -1 || end === -1) {
      return NextResponse.json({ success: false, error: 'No results found — please try again' }, { status: 422 })
    }

    let greats: AnyRecord[] = []
    try {
      greats = JSON.parse(text.substring(start, end + 1)) as AnyRecord[]
    } catch {
      const objMatches = text.substring(start, end + 1).match(/\{[^{}]+\}/g)
      if (objMatches) {
        for (const m of objMatches) {
          try { greats.push(JSON.parse(m) as AnyRecord) } catch { continue }
        }
      }
    }

    if (!greats.length) {
      return NextResponse.json({ success: false, error: 'Could not parse results — please try again' }, { status: 422 })
    }

    return NextResponse.json({ success: true, greats })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
