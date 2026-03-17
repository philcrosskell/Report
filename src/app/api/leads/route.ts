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

    const prompt = `Find ${count || 5} real ${industry} businesses near ${location}. Search for each, find their website, and assess quality.

Return ONLY a JSON array, no markdown. ${count || 5} items, sorted by overallScore ascending:
[{"businessName":"","website":"","overallScore":0,"categories":{"seo":0,"ux":0,"conversion":0,"mobile":0,"content":0,"brand":0},"criticalIssues":0,"opportunityScore":0,"pitchHook":"","issues":["",""],"opportunities":[""]}]

Rules: real websites only, focus on scores under 60, keep all strings under 10 words.`

    // Use sdk with web search tool
    const sdk = client as AnyRecord
    const response = await sdk.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
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
