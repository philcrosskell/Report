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

    const prompt = `List ${count || 3} real ${industry} businesses near ${location} that have poor websites. Output ONLY a JSON array, nothing else, no markdown fences.

Each object MUST have exactly these keys with real values (not empty strings, not zero):
businessName, website, overallScore, categories (object with keys seo ux conversion mobile content brand all numbers 0-100), criticalIssues, opportunityScore, pitchHook, issues (array of 2 strings), opportunities (array of 1 string)

Example of ONE object (output ${count || 3} like this):
{"businessName":"Albury Plumbing Co","website":"https://alburyplumbing.com.au","overallScore":32,"categories":{"seo":25,"ux":35,"conversion":28,"mobile":40,"content":30,"brand":32},"criticalIssues":4,"opportunityScore":8,"pitchHook":"No CTAs and not ranking locally","issues":["No meta tags","Slow mobile load"],"opportunities":["Claim Google Business"]}

Output the JSON array now:`

    // Use sdk with web search tool
    const sdk = client as AnyRecord
    const response = await sdk.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
system: 'You are a JSON API. You ONLY output raw JSON arrays. Never output text, explanations, or markdown. Only output a JSON array of objects.',
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
