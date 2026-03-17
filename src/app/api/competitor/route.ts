import { NextRequest, NextResponse } from 'next/server'

function safeParseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T
    }
    throw new Error('Could not parse JSON')
  }
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text ?? ''
  }
  throw new Error('Unsupported AI provider')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessName, businessUrl, market, competitors, brandLogo } = body as {
      businessName: string
      businessUrl: string
      market?: string
      competitors: { name: string; url: string }[]
      brandLogo?: string
    }

    const competitorList = competitors
      .filter(c => c.name && c.url)
      .map(c => `- ${c.name} (${c.url})`)
      .join('\n')

    const context = `
Business: ${businessName} (${businessUrl})
Market/Industry: ${market ?? 'Not specified'}
Competitors to analyse:
${competitorList}
`.trim()

    const systemPrompt = `You are a competitive intelligence analyst. Respond ONLY with valid JSON. No markdown, no explanation, no preamble.`

    // ── CALL 1: Profiles + Claims Matrix + Headline Findings ──────────────────
    const call1 = await callAI(systemPrompt, `
Analyse these businesses and return ONLY this JSON structure (no markdown):

${context}

{
  "headlineFindings": [
    { "number": 1, "title": "string", "detail": "string" }
  ],
  "profiles": [
    {
      "name": "string",
      "url": "string",
      "tier": "Premium|Mid|Budget",
      "positioning": "string",
      "whatTheyDoWell": "string",
      "hookType": "string",
      "hookHeadline": "string",
      "hookEffectiveness": "string",
      "primaryAnxiety": "string",
      "outcomePromised": "string",
      "howTheyProve": "string",
      "actionTrigger": "string"
    }
  ],
  "claimsMatrix": {
    "claimTypes": ["string"],
    "rows": [
      { "claimType": "string", "values": { "BusinessName": "Yes|No|Partial" } }
    ]
  }
}

Keep each string field under 30 words. Return only the JSON.
`)

    // ── CALL 2: Strategy + Insights ───────────────────────────────────────────
    const call2 = await callAI(systemPrompt, `
Analyse these businesses and return ONLY this JSON structure (no markdown):

${context}

{
  "tableStakes": ["string"],
  "whiteSpace": [
    { "opportunity": "string", "rationale": "string", "owner": "string" }
  ],
  "noiseToAvoid": ["string"],
  "buyerAnxieties": [
    { "concern": "string", "addressedBy": "string", "ignoredBy": "string" }
  ],
  "strategicImplications": [
    { "number": 1, "title": "string", "detail": "string" }
  ],
  "quickWins": [
    { "action": "string", "why": "string", "effort": "Easy|Medium|Hard" }
  ],
  "summary": "string"
}

Keep each string field under 30 words. Return only the JSON.
`)

    // ── Merge both responses ──────────────────────────────────────────────────
    const part1 = safeParseJSON<Record<string, unknown>>(call1)
    const part2 = safeParseJSON<Record<string, unknown>>(call2)

    const result = {
      businessName,
      businessUrl,
      market: market ?? '',
      date: new Date().toISOString(),
      brandLogo: brandLogo ?? '',
      ...part1,
      ...part2,
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error('Competitor analysis error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
