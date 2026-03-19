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
    const n = parseInt(count || '5')

    const response = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You output only raw JSON. No markdown, no backticks, no explanation. Just the JSON array.',
      messages: [{
        role: 'user',
        content: `Generate a JSON array of ${n} fictional but realistic ${industry} businesses located specifically within postcode ${postcode} in Australia. These are the BEST businesses in the area - they rank well on Google, have strong websites, great GBP profiles, lots of reviews, and present themselves professionally online. Use ${location} as the location context.\n\nStart your response with [ and end with ]. Each object must have these exact keys:\n- businessName: string (realistic local business name)\n- website: string (https://...)\n- overallScore: integer between 75-98\n- categories: object with keys seo, ux, conversion, mobile, content, brand (each integer 70-99)\n- reviewCount: integer 20-200\n- reviewRating: number 4.2-5.0\n- strengthScore: integer 7-10\n- whyTheyRank: string max 10 words, the single biggest reason they dominate locally\n- strengths: array of exactly 3 short strings describing what they do well online\n- keyTactics: array of exactly 2 short strings - specific tactics worth borrowing for a competitor\n\nStart your response with [ now.`
      }]
    })

    const rawText = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()

    const start = rawText.indexOf('[')
    const end = rawText.lastIndexOf(']')
    if (start === -1 || end === -1) {
      return NextResponse.json({ success: false, error: 'No results - please try again' }, { status: 422 })
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
      return NextResponse.json({ success: false, error: 'Could not parse results - please try again' }, { status: 422 })
    }

    return NextResponse.json({ success: true, greats })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
