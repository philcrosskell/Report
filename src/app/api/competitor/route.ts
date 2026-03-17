import { NextRequest, NextResponse } from 'next/server'

function safeParseJSON<T>(raw: string): T {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  try { return JSON.parse(cleaned) as T } catch {
    const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T
    throw new Error('Could not parse JSON: ' + cleaned.slice(0, 200))
  }
}

async function callAI(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessName, businessUrl, market, competitors, brandLogo } = body as {
      businessName: string; businessUrl: string; market?: string
      competitors: { name: string; url: string }[]; brandLogo?: string
    }

    const compList = competitors.filter(c => c.name && c.url).map(c => `- ${c.name} (${c.url})`).join('\n')
    const ctx = `Business: ${businessName} (${businessUrl})\nMarket: ${market ?? 'Not specified'}\nCompetitors:\n${compList}`
    const sys = `You are a competitive intelligence analyst. Respond ONLY with valid JSON. No markdown. Keep ALL string values under 20 words.`

    // Call 1: Profiles + Claims + Headlines
    const r1 = await callAI(sys, `Analyse these businesses. Return ONLY this JSON, all strings max 20 words:\n\n${ctx}\n\n{
  "headlineFindings": [{"number":1,"title":"string","detail":"string"}],
  "profiles": [{
    "name":"string","url":"string","tier":"Premium|Mid|Budget",
    "positioning":"string","whatTheyDoWell":"string",
    "hookType":"string","hookHeadline":"string","hookEffectiveness":"string",
    "primaryAnxiety":"string","outcomePromised":"string","howTheyProve":"string","actionTrigger":"string"
  }],
  "claimsMatrix":{"claimTypes":["string"],"rows":[{"claimType":"string","values":{"BusinessName":"Yes|No|Partial"}}]}
}`)

    // Call 2: Strategy
    const r2 = await callAI(sys, `Analyse these businesses. Return ONLY this JSON, all strings max 20 words:\n\n${ctx}\n\n{
  "tableStakes":["string"],
  "whiteSpace":[{"opportunity":"string","rationale":"string","owner":"string"}],
  "noiseToAvoid":["string"],
  "buyerAnxieties":[{"concern":"string","addressedBy":"string","ignoredBy":"string"}],
  "strategicImplications":[{"number":1,"title":"string","detail":"string"}],
  "quickWins":[{"action":"string","why":"string","effort":"Easy|Medium|Hard"}],
  "summary":"string"
}`)

    const part1 = safeParseJSON<Record<string, unknown>>(r1)
    const part2 = safeParseJSON<Record<string, unknown>>(r2)

    return NextResponse.json({ success: true, result: {
      businessName, businessUrl, market: market ?? '', date: new Date().toISOString(),
      brandLogo: brandLogo ?? '', ...part1, ...part2
    }})
  } catch (err) {
    console.error('Competitor analysis error:', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
