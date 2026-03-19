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
      return NextResponse.json({ success: false, error: 'Keyword and postcode are required' }, { status: 400 })
    }

    const client = new Anthropic()
    const location = suburb ? suburb + ' NSW' : 'NSW ' + postcode
    const n = parseInt(count || '5')

    const response = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a local business researcher. You find real businesses by searching Google, then verify each one is genuinely local by checking their website for a physical address. Output only raw JSON.',
      messages: [{
        role: 'user',
        content: `I need to find real ${industry} businesses genuinely located in ${location} ${postcode}.

STEP 1 — Search for candidates:
Search: "${industry} ${suburb || postcode}"
Search: "${industry} ${suburb || ''} NSW"
Collect the websites of up to 15 results.

STEP 2 — Verify each is genuinely local:
For each website found, fetch the page (homepage or /contact page) and look for a physical street address. The business is GENUINELY LOCAL only if their website shows a street address in ${location} or postcode ${postcode} or nearby suburbs. 
- If no physical address is found anywhere on their site: NOT LOCAL
- If the only mention of "${suburb || postcode}" is in their page copy or URL slug (like /web-design-albury/): NOT LOCAL — this is just an SEO page
- If they have a real street address in the area: LOCAL

STEP 3 — From the verified local businesses, return the ${n} with the WEAKEST online presence (low reviews, poor website, weak SEO) — these are the best prospects to pitch.

Return ONLY a raw JSON array (no markdown) with these fields:
- businessName: string
- website: string (https://...)
- industry: "${industry}"
- address: the physical address you found (or "Not found" if none)
- isLocal: true or false
- overallScore: integer 15-55 (lower = weaker online presence = better prospect)
- categories: object with keys seo, ux, conversion, mobile, content, brand (each 15-60)
- criticalIssues: integer 2-6
- opportunityScore: integer 6-9
- pitchHook: max 8 words describing their main weakness
- issues: array of 2 short strings
- opportunities: array of 1 short string

Only include businesses where isLocal is true. Start with [`
      }]
    })

    const text = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()

    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start === -1 || end === -1) {
      return NextResponse.json({ success: false, error: 'No local businesses found — please try again' }, { status: 422 })
    }

    let prospects: AnyRecord[] = []
    try {
      prospects = JSON.parse(text.substring(start, end + 1)) as AnyRecord[]
    } catch {
      const objMatches = text.substring(start, end + 1).match(/\{[^{}]+\}/g)
      if (objMatches) {
        for (const m of objMatches) {
          try { prospects.push(JSON.parse(m) as AnyRecord) } catch { continue }
        }
      }
    }

    // Filter to only genuinely local businesses
    prospects = prospects.filter(p => p.isLocal !== false)

    if (!prospects.length) {
      return NextResponse.json({ success: false, error: 'No verified local businesses found — try a different keyword' }, { status: 422 })
    }

    return NextResponse.json({ success: true, prospects })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
