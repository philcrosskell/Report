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
3. Search: "${industry}" "${location}" "NSW" -site:jezweb.com.au -site:niftywebsites.com.au -site:simplepixels.com.au

From the results, find ${n} businesses that:
- Have a real physical address in ${location} area
- Are NOT just national agencies with local landing pages
- Actually operate in the ${location} region

Return ONLY a raw JSON array of ${n} objects:
- businessName: real business name
- website: their actual website URL (https://...) or their directory listing URL if no website
- industry: "${industry}"
- overallScore: integer 15-55 (how weak is their digital presence)
- categories: object with keys seo, ux, conversion, mobile, content, brand (each 15-60)
- criticalIssues: integer 2-6
- opportunityScore: integer 6-9
- pitchHook: max 8 words describing their main weakness
- issues: array of 2 short strings
- opportunities: array of 1 short string

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

    let prospects: AnyRecord[] = []
    try {
      prospects = JSON.parse(rawText.substring(start, end + 1)) as AnyRecord[]
    } catch {
      const objMatches = rawText.substring(start, end + 1).match(/\{[^{}]+\}/g)
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
