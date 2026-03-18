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
      system: 'You are a JSON generator. Output only valid JSON, nothing else.',
      messages: [
        {
          role: 'user',
          content: `Generate ${n} fictional but realistic ${industry} businesses near ${location} with poor websites. Return a JSON array of ${n} objects. Each object must have: businessName (string), website (string starting with https://), overallScore (integer 20-55), categories (object with keys seo, ux, conversion, mobile, content, brand all integers 20-60), criticalIssues (integer 2-6), opportunityScore (integer 6-9), pitchHook (string under 10 words), issues (array of 2 short strings), opportunities (array of 1 short string).`
        },
        {
          role: 'assistant',
          content: '['
        }
      ]
    })

    const rawText = '[' + (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('')

    // Find the last complete object — handle truncation
    let prospects: AnyRecord[] = []
    try {
      prospects = JSON.parse(rawText) as AnyRecord[]
    } catch {
      // Try to recover partial JSON by finding complete objects
      const objMatches = rawText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)
      if (objMatches) {
        for (const m of objMatches) {
          try { prospects.push(JSON.parse(m) as AnyRecord) } catch { continue }
        }
      }
    }

    if (!prospects.length) {
      return NextResponse.json({ success: false, error: 'No results — please try again' }, { status: 422 })
    }

    return NextResponse.json({ success: true, prospects })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
