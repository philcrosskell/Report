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
    const location = suburb ? suburb + ' ' + postcode : postcode
    const locationFull = suburb ? suburb + ' NSW ' + postcode : 'NSW ' + postcode
    const n = parseInt(count || '5')

    const response = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a local business researcher. Find real businesses using local directories and Google Maps. Never include businesses that just have SEO landing pages targeting the area without a real physical presence. Output only raw JSON.',
      messages: [{
        role: 'user',
        content: `I need to find REAL ${industry} businesses that are genuinely located in ${locationFull} Australia. NOT businesses that just have SEO pages targeting the area.

Search these sources specifically:
1. Search: site:yellowpages.com.au "${industry}" "${location}"
2. Search: site:localsearch.com.au "${industry}" "${location}"
3. Search: "${industry}" "${location}" "NSW" Google Maps reviews

From the results, find ${n} businesses that:
- Have a real physical address in ${location} area
- Are NOT just national agencies with local landing pages
- Actually operate in the ${location} region
- Have strong online presence: good reviews, professional website, active Google Business Profile

Return ONLY a raw JSON array of ${n} objects:
- businessName: real business name
- website: their actual website URL (https://...)
- overallScore: integer 65-98 (how strong is their digital presence)
- categories: object with keys seo, ux, conversion, mobile, content, brand (each 60-99)
- reviewCount: number of Google reviews
- reviewRating: Google rating e.g. 4.8
- strengthScore: integer 7-10
- whyTheyRank: one sentence max 12 words — the main reason they dominate locally
- strengths: array of 3 short strings
- keyTactics: array of 2 short strings worth copying

Start with [`
      }]
    })

    const rawText = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()

    const start = rawText.indexOf('[')
    const end = rawText.lastIndexOf(']')
    if (start === -1 || end === -1) {
      return NextResponse.json({ success: false, error: 'No results found — please try again' }, { status: 422 })
    }

    let greats: AnyRecord[] = []
    try {
      greats = JSON.parse(rawText.substring(start, end + 1)) as AnyRecord[]
    } catch {
      const objMatches = rawText.substring(start, end + 1).match(/\{[^{}]+\}/g)
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
