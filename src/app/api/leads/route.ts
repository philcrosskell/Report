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
    const n = parseInt(count || '3')

    const response = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You output only raw JSON. No markdown, no backticks, no explanation. Just the JSON.',
      messages: [{
        role: 'user',
        content: `Generate a JSON array of ${n} fictional but realistic ${industry} businesses near ${location} that have poor websites. Start your response with [ and end with ]. Each object must have these exact keys:
- businessName: string
- website: string (https://...)  
- overallScore: integer between 20-55
- categories: object with keys seo, ux, conversion, mobile, content, brand (each an integer 20-60)
- criticalIssues: integer 2-6
- opportunityScore: integer 6-9
- pitchHook: string, max 8 words describing their main weakness
- issues: array of exactly 2 short strings
- opportunities: array of exactly 1 short string

Start your response with [ now.`
      }]
    })

    const rawText = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('')
      .trim()

    // Extract the JSON array — find from first [ to last ]
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
      // Try partial recovery
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
