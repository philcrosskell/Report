import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ComparisonResult, Audit } from '@/lib/types'

async function callAI(prompt: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  if (provider === 'openai') {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const res = await client.chat.completions.create({
      model: 'gpt-4o', max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a competitive intelligence analyst. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
    })
    return res.choices[0].message.content ?? ''
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Bad response type')
  return block.text
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { audits: Audit[]; projectName: string; businessUrl: string }
    const { audits, projectName, businessUrl } = body

    if (!audits || audits.length < 1) {
      return NextResponse.json({ success: false, error: 'At least one audit is required' }, { status: 400 })
    }

    const auditSummaries = audits.map(a => ({
      url: a.url,
      label: a.label,
      assignedTo: a.assignedTo,
      seo: a.scores.seo,
      lp: a.scores.lp,
      overall: a.scores.overall,
      grade: a.scores.grade,
      hookType: a.report.competitorAnalysis.hookType,
      positioningStrength: a.report.competitorAnalysis.positioningStrength,
      strengths: a.report.strengthsWeaknesses.strengths.slice(0, 3),
      weaknesses: a.report.strengthsWeaknesses.weaknesses.slice(0, 3),
      quickWins: a.report.priorityFixes.filter(f => f.difficulty === 'Easy').map(f => f.title).slice(0, 3),
      tableStakes: a.report.competitorAnalysis.tableStakes.slice(0, 3),
      whiteSpace: a.report.competitorAnalysis.whiteSpace.slice(0, 2).map(w => w.opportunity),
    }))

    const prompt = `You are a competitive intelligence analyst. Analyse these ${audits.length} audited pages from the project "${projectName}" and produce a competitive comparison report.

Business: ${businessUrl}
Pages audited:
${JSON.stringify(auditSummaries, null, 2)}

Return ONLY valid JSON, no markdown:
{
  "insights": {
    "leader": "name/label of the page with the highest overall score",
    "leaderUrl": "URL of the leader",
    "biggestGap": "One sentence describing the most significant performance gap between the best and worst performers",
    "sharedWeaknesses": ["weakness all or most pages share", "another shared weakness", "another"],
    "differentiators": ["what sets the leader apart from the others", "another key differentiator"],
    "recommendation": "One specific, actionable sentence about the most important improvement opportunity across the competitive set"
  },
  "pageInsights": [
    {
      "url": "page url",
      "vsLeader": "Ahead / On Par / Behind",
      "keyAdvantage": "What this page does better than competitors",
      "keyVulnerability": "What competitors are exploiting that this page misses",
      "priorityAction": "Single most important action for this specific page"
    }
  ]
}`

    const raw = await callAI(prompt)
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()
    const aiInsights = JSON.parse(clean) as {
      insights: ComparisonResult['insights']
      pageInsights: { url: string; vsLeader: string; keyAdvantage: string; keyVulnerability: string; priorityAction: string }[]
    }

    const result: ComparisonResult = {
      projectName,
      businessUrl,
      pages: audits.map(a => ({
        id: a.id,
        url: a.url,
        label: a.label,
        assignedTo: a.assignedTo,
        scores: a.scores,
        hookType: a.report.competitorAnalysis.hookType,
        positioningStrength: a.report.competitorAnalysis.positioningStrength,
        topStrengths: a.report.strengthsWeaknesses.strengths.slice(0, 3),
        topWeaknesses: a.report.strengthsWeaknesses.weaknesses.slice(0, 3),
        quickWins: a.report.priorityFixes.filter(f => f.difficulty === 'Easy').map(f => f.title).slice(0, 2),
      })),
      insights: aiInsights.insights,
    }

    return NextResponse.json({ success: true, result, pageInsights: aiInsights.pageInsights })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Competitor analysis error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
