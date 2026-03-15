import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AuditRequest, AuditReport } from './types'
import { buildPromptPart1, buildPromptPart2 } from './prompt'
import { scrapePage, ScrapedPage } from './scraper'

async function callAnthropic(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
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
    max_tokens: 8000,
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

function normaliseJSON(raw: string): string {
  // Strip markdown fences
  let s = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // Find the JSON object boundaries
  const start = s.indexOf('{')
  if (start > 0) s = s.slice(start)

  // Remove JavaScript-style comments (// and /* */)
  s = s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

  // Replace single-quoted strings with double-quoted
  // Only do this outside of already double-quoted strings
  s = s.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (match, inner) => {
    // Don't replace if this looks like a contraction inside a value
    return `"${inner.replace(/"/g, '\\"')}"`
  })

  // Fix trailing commas before } or ]
  s = s.replace(/,(\s*[}\]])/g, '$1')

  // Fix unquoted keys: look for word: pattern not inside a string
  s = s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')

  return s
}

function parseJSON<T>(raw: string): T {
  const normalised = normaliseJSON(raw)

  // Find the first { and the matching closing } by tracking depth
  const start = normalised.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  let depth = 0, end = -1, inString = false, escaped = false
  for (let i = start; i < normalised.length; i++) {
    const ch = normalised[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }

  if (end !== -1) {
    try { return JSON.parse(normalised.slice(start, end + 1)) as T }
    catch { /* fall through to repair */ }
  }

  // Truncated — attempt structural repair
  const repaired = repairJSON(normalised.slice(start))
  return JSON.parse(repaired) as T
}

function repairJSON(partial: string): string {
  const stack: string[] = []
  let inString = false
  let escaped = false
  for (const ch of partial) {
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }
  let result = partial
  if (inString) result += '"'
  result = result.replace(/,\s*$/, '')
  while (stack.length > 0) result += stack.pop()
  return result
}

export async function generateAuditReport(req: AuditRequest): Promise<AuditReport & { scraped?: ScrapedPage }> {
  // Step 1: Fetch real page data (runs in parallel-friendly — fast timeout)
  console.log(`Scraping: ${req.url}`)
  let scraped: ScrapedPage | undefined
  try {
    scraped = await scrapePage(req.url)
    if (scraped.error) {
      console.warn(`Scrape failed for ${req.url}: ${scraped.error}`)
    } else {
      console.log(`Scraped: ${scraped.wordCount} words, ${scraped.formCount} forms, ${scraped.responseTimeMs}ms`)
    }
  } catch (e) {
    console.warn('Scraper threw:', e)
    scraped = undefined
  }

  // Step 2: AI Call 1 — overview + SEO + LP scoring using real data
  const prompt1 = buildPromptPart1(req, scraped)
  const raw1 = await callAI(prompt1)

  type Part1 = Pick<AuditReport, 'overview' | 'scores' | 'seoCategories' | 'lpScoring' | 'projectedScoreAfterFixes'>
  const part1 = parseJSON<Part1>(raw1)
  if (typeof part1.scores?.seo !== 'number') throw new Error('Part 1 missing scores')

  // Inject real values directly — don't trust AI to copy numbers correctly
  if (scraped && !scraped.error) {
    part1.overview.wordCount = scraped.wordCount
    part1.overview.internalLinks = scraped.internalLinks
    part1.overview.externalLinks = scraped.externalLinks
    part1.overview.mediaFiles = scraped.images
    part1.overview.responseTime = `${scraped.responseTimeMs}ms`
    part1.overview.fileSize = `${Math.round(scraped.htmlSizeBytes / 1024)} kB`
    if (scraped.title) part1.overview.title = scraped.title
    if (scraped.metaDescription) part1.overview.description = scraped.metaDescription
  }

  const summary = `SEO: ${part1.scores.seo}, LP: ${part1.scores.lp}, Overall: ${part1.scores.overall}, Grade: ${part1.scores.grade}. Page: ${part1.overview.pageType}. ${part1.overview.summary}`

  // Step 3: AI Call 2 — gap analysis + fixes + competitor + recommendations
  const prompt2 = buildPromptPart2(req, summary, scraped)
  const raw2 = await callAI(prompt2)

  type Part2 = Pick<AuditReport, 'gapAnalysis' | 'competitorAnalysis' | 'priorityFixes' | 'strengthsWeaknesses' | 'recommendations'>
  const part2 = parseJSON<Part2>(raw2)
  if (!part2.gapAnalysis || !part2.priorityFixes) throw new Error('Part 2 missing required sections')

  return {
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
    scraped,
  }
}
