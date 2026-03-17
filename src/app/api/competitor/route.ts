import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { CompetitorIntelligenceReport } from '@/lib/types'

async function callAI(prompt: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const res = await client.chat.completions.create({
      model: 'gpt-4o', max_tokens: 16000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a competitive intelligence analyst. Return valid complete JSON only.' },
        { role: 'user', content: prompt },
      ],
    })
    return res.choices[0].message.content ?? ''
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Bad response type')
  return block.text
}

function parseJSON<T>(raw: string): T {
  const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return safeParseJSON(clean) as Record<string, unknown> as T }
  catch {
    const start = clean.indexOf('{'), end = clean.lastIndexOf('}')
    if (start !== -1 && end > start) return safeParseJSON(clean.slice(start, end + 1) as Record<string, unknown>) as T
    throw new Error('Could not parse JSON')
  }
}


function safeParseJSON(raw: string): unknown {
  // Strip markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  try {
    return safeParseJSON(cleaned) as Record<string, unknown>
  } catch {
    // Attempt to repair truncated JSON by closing open structures
    let fixed = cleaned
    // Count open braces/brackets and close them
    const opens = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length
    const openArr = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length
    // Remove trailing comma if present
    fixed = fixed.replace(/,\s*$/, '')
    for (let i = 0; i < openArr; i++) fixed += ']'
    for (let i = 0; i < opens; i++) fixed += '}'
    return safeParseJSON(fixed) as Record<string, unknown>
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      businessName: string
      businessUrl: string
      competitors: { name: string; url: string }[]
      market?: string
    }

    const { businessName, businessUrl, competitors, market } = body
    if (!businessUrl) return NextResponse.json({ success: false, error: 'Business URL required' }, { status: 400 })
    if (!competitors?.length) return NextResponse.json({ success: false, error: 'At least one competitor required' }, { status: 400 })

    const allPlayers = [
      { name: businessName || 'Client', url: businessUrl, isClient: true },
      ...competitors.map(c => ({ ...c, isClient: false })),
    ]

    const prompt = `You are a senior competitive intelligence analyst producing a detailed market analysis report.

Business being analysed: ${businessName} (${businessUrl})
Market/Industry: ${market || 'infer from URLs and business names'}
Competitors:
${competitors.map((c, i) => `${i + 1}. ${c.name} (${c.url})`).join('\n')}

Analyse all ${allPlayers.length} players and produce a comprehensive competitive intelligence report in the style of a senior strategy consultant.

You cannot visit these URLs live. Use domain names, business names, URL paths, TLDs, and industry context to make accurate professional assessments.

Return ONLY valid complete JSON:

{
  "businessName": "${businessName}",
  "businessUrl": "${businessUrl}",
  "date": "${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}",
  "market": "inferred market description",
  "headlineFindings": [
    { "number": 1, "title": "Short punchy title of finding 1", "detail": "2-3 sentences explaining the finding and its significance for ${businessName}" },
    { "number": 2, "title": "Short punchy title of finding 2", "detail": "2-3 sentences" },
    { "number": 3, "title": "Short punchy title of finding 3", "detail": "2-3 sentences" }
  ],
  "profiles": [
    {
      "name": "${businessName}",
      "url": "${businessUrl}",
      "tier": "Client",
      "positioning": "how this business positions itself",
      "whatTheyDoWell": "2-3 specific strengths",
      "hookType": "Services List|Outcome|Authority|Transformation+Proof|Location+Services",
      "hookHeadline": "inferred or likely hero headline",
      "hookEffectiveness": "assessment of headline effectiveness",
      "primaryAnxiety": "the buyer anxiety this business addresses",
      "outcomePromised": "the outcome they promise",
      "howTheyProve": "how they back up their claims",
      "actionTrigger": "their primary CTA"
    }
  ],
  "claimsMatrix": {
    "claimTypes": ["Quality / Expertise", "Speed of Results", "Price / Value", "Trust / Social Proof", "Video / Creative Production", "Team / People", "Geographic Reach", "Vertical Specialisation"],
    "rows": [
      {
        "claimType": "Quality / Expertise",
        "values": {
          "${businessName}": "what they claim or 'Not mentioned'",
          "Competitor1Name": "what they claim or 'Not mentioned'"
        }
      }
    ]
  },
  "tableStakes": [
    "claim that 3+ competitors make — not a differentiator",
    "another table stake claim",
    "another table stake claim",
    "another table stake claim",
    "another table stake claim"
  ],
  "whiteSpace": [
    { "opportunity": "specific unclaimed positioning opportunity", "rationale": "why this matters and who it would resonate with", "owner": "${businessName} — available to claim now" },
    { "opportunity": "another white space opportunity", "rationale": "specific rationale", "owner": "who could own this" },
    { "opportunity": "another opportunity", "rationale": "specific rationale", "owner": "who could own this" }
  ],
  "noiseToAvoid": [
    "generic claim that sounds good but differentiates nothing",
    "another generic claim",
    "another generic claim"
  ],
  "buyerAnxieties": [
    { "concern": "Will it actually work — do you have proof?", "addressedBy": "names of competitors who address this well", "ignoredBy": "names of those who ignore it" },
    { "concern": "How long until I see results?", "addressedBy": "names", "ignoredBy": "names" },
    { "concern": "Will I get ripped off or locked into a contract?", "addressedBy": "names", "ignoredBy": "names" },
    { "concern": "Do you understand my industry or market?", "addressedBy": "names", "ignoredBy": "names" },
    { "concern": "Can I trust you to handle everything?", "addressedBy": "names", "ignoredBy": "names" }
  ],
  "strategicImplications": [
    { "number": 1, "title": "Title of implication 1", "detail": "2-3 paragraphs of strategic analysis specific to ${businessName}'s position in this market" },
    { "number": 2, "title": "Title of implication 2", "detail": "2-3 paragraphs" },
    { "number": 3, "title": "Title of implication 3", "detail": "2-3 paragraphs" }
  ],
  "quickWins": [
    { "action": "Specific actionable change — executable in 30 days", "why": "why this matters given the competitive landscape", "effort": "Easy" },
    { "action": "Another quick win", "why": "specific rationale", "effort": "Easy" },
    { "action": "Another quick win", "why": "specific rationale", "effort": "Medium" },
    { "action": "Another quick win", "why": "specific rationale", "effort": "Easy" },
    { "action": "Another quick win", "why": "specific rationale", "effort": "Medium" }
  ],
  "summary": "One paragraph summarising ${businessName}'s position, the key opportunity, and the single most important strategic move"
}

IMPORTANT: The profiles array must include ALL ${allPlayers.length} players: ${allPlayers.map(p => p.name).join(', ')}.
The claimsMatrix rows must have values for every player.
Make all analysis specific to the actual businesses and market — avoid generic advice.`

    const raw = await callAI(prompt)
    const report = parseJSON<CompetitorIntelligenceReport>(raw)

    return NextResponse.json({ success: true, report })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Competitor analysis error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
