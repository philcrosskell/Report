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
    const location = suburb ? `${suburb} ${postcode} Australia` : `${postcode} Australia`

    const prompt = `You are a lead generation and web audit assistant. Find ${count || 5} real local businesses in the ${industry} industry located in or near ${location}.

For each business, search the web to find their actual website URL, then audit the website.

Return ONLY a valid JSON array (no markdown, no explanation) with exactly ${count || 5} objects, sorted by overallScore ascending (worst first). Each object:
{
  "businessName": "string",
  "website": "https://...",
  "industry": "${industry}",
  "overallScore": number 0-100,
  "categories": {
    "seo": number 0-100,
    "ux": number 0-100,
    "conversion": number 0-100,
    "mobile": number 0-100,
    "content": number 0-100,
    "brand": number 0-100
  },
  "criticalIssues": number,
  "opportunityScore": number 1-10,
  "pitchHook": "one sentence describing their biggest weakness and the opportunity",
  "issues": ["string", "string"],
  "opportunities": ["string"]
}

Be concise — keep strings short (under 12 words each). Only include businesses with real verifiable websites. Prioritise poor websites (score under 60).`

    // Use sdk with web search tool
    const sdk = client as AnyRecord
    const response = await sdk.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    }) as AnyRecord

    const text = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('')

    // Find all [...] blocks and try each from largest to smallest
    const matches = [...text.matchAll(/\[([\s\S]*?)\]/g)].sort((a,b) => b[0].length - a[0].length)
    if (!matches.length) {
      return NextResponse.json({ success: false, error: 'No results found — try a different industry or postcode' }, { status: 422 })
    }
    let prospects: AnyRecord[] = []
    for (const m of matches) {
      try { prospects = JSON.parse(m[0]) as AnyRecord[]; break } catch { continue }
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
