import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AuditRequest, AuditReport } from './types'
import { buildPromptPart1, buildPromptPart2 } from './prompt'

async function callAnthropic(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')
  return block.text
}

async function callOpenAI(prompt: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 6000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a senior SEO auditor. Return only valid complete JSON. Never truncate.' },
      { role: 'user', content: prompt },
    ],
  })
  return res.choices[0].message.content ?? ''
}

async function callAI(prompt: string): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
    return callOpenAI(prompt)
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
  return callAnthropic(prompt)
}

function cleanJSON(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

function parseJSON<T>(raw: string): T {
  const clean = cleanJSON(raw)
  try {
    return JSON.parse(clean) as T
  } catch {
    // Find the outermost { ... } and try again
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(clean.slice(start, end + 1)) as T
    }
    throw new Error('Could not parse JSON response')
  }
}

export async function generateAuditReport(req: AuditRequest): Promise<AuditReport> {
  // Call 1: overview + scores + SEO + LP scoring (~4000 tokens output)
  const prompt1 = buildPromptPart1(req)
  const raw1 = await callAI(prompt1)

  type Part1 = Pick<AuditReport, 'overview' | 'scores' | 'seoCategories' | 'lpScoring' | 'projectedScoreAfterFixes'>
  const part1 = parseJSON<Part1>(raw1)

  if (typeof part1.scores?.seo !== 'number') {
    throw new Error('Part 1 response missing scores')
  }

  // Build a compact summary to give part 2 context
  const summary = `SEO: ${part1.scores.seo}, LP: ${part1.scores.lp}, Overall: ${part1.scores.overall}, Grade: ${part1.scores.grade}. Page type: ${part1.overview.pageType}. Summary: ${part1.overview.summary}`

  // Call 2: gap analysis + competitor + fixes + S&W + recommendations (~3000 tokens output)
  const prompt2 = buildPromptPart2(req, summary)
  const raw2 = await callAI(prompt2)

  type Part2 = Pick<AuditReport, 'gapAnalysis' | 'competitorAnalysis' | 'priorityFixes' | 'strengthsWeaknesses' | 'recommendations'>
  const part2 = parseJSON<Part2>(raw2)

  if (!part2.gapAnalysis || !part2.priorityFixes) {
    throw new Error('Part 2 response missing required sections')
  }

  // Merge into a complete report
  const report: AuditReport = {
    overview: part1.overview,
    scores: part1.scores,
    seoCategories: part1.seoCategories,
    lpScoring: part1.lpScoring,
    projectedScoreAfterFixes: part1.projectedScoreAfterFixes,
    gapAnalysis: part2.gapAnalysis,
    competitorAnalysis: part2.competitorAnalysis,
    priorityFixes: part2.priorityFixes,
    strengthsWeaknesses: part2.strengthsWeaknesses,
    recommendations: part2.recommendations,
  }

  return report
}
