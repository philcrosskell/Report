import { NextRequest, NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

async function callAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: 'You are a senior Google Ads and GA4 analyst writing a client-facing performance report. Respond ONLY with valid JSON. No markdown, no text outside the JSON.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

function extractJson(raw: string): AnyRecord {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    return JSON.parse(cleaned) as AnyRecord
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('Could not parse AI response as JSON')
    return JSON.parse(cleaned.slice(start, end + 1)) as AnyRecord
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as AnyRecord
    const { clientName, periodLabel, summary } = body as { clientName: string; periodLabel: string; summary: string }

    if (!summary) return NextResponse.json({ success: false, error: 'Report summary is required' }, { status: 400 })

    const prompt = `You are drafting the "Recommendations & Next Steps" section, plus keyword add/exclude suggestions, for a monthly Google Ads + GA4 client report.

Client: ${clientName || 'the client'}
Reporting period: ${periodLabel || 'this period'}

Here is the computed performance data for the period (already calculated — do not recompute, just interpret it):

${summary}

Return ONLY this JSON structure:
{
  "recommendations": [
    { "title": "string, max 10 words", "description": "1-2 sentences explaining why and what to do", "priority": "quick" | "strategic" }
  ],
  "longTailKeywords": [
    { "term": "string", "note": "max 12 words on why it's worth adding" }
  ],
  "negativeKeywords": [
    { "term": "string", "reason": "max 8 words, e.g. 'Competitor brand', 'Wrong intent', 'Out of service area'" }
  ]
}

Rules:
- recommendations: 5-8 items, ordered most important first. Mix "quick" (this month, low effort) and "strategic" (1-3 month) priorities. Ground every recommendation in a specific number from the data above — no generic advice.
- longTailKeywords: pick up to 10 of the strongest untapped search terms from the data (not already in the existing keyword list) worth adding as dedicated keywords.
- negativeKeywords: pick up to 10 search terms from the data that look like wasted spend (competitor brand names, out-of-area searches, wrong intent) — only include terms actually present in the data.
- Write in plain, client-friendly language — this is read by a business owner, not an ads specialist.
- Never invent numbers that aren't in the data provided.
Start with {`

    const raw = await callAI(prompt)
    const result = extractJson(raw)

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
