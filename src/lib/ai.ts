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
    system: 'You are a senior SEO and landing page auditor. Respond ONLY with a valid JSON object. Start with { and end with }. No markdown, no explanation, no text outside the JSON.',
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

function cleanRaw(raw: string): string {
  // 1. Strip markdown fences
  let s = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  // 2. Find the first { — discard any preamble before it
  const start = s.indexOf('{')
  if (start > 0) s = s.slice(start)

  // 3. Walk character by character: fix control chars inside strings,
  //    fix trailing commas, but do NOT touch key names (too risky)
  let out = ''
  let inStr = false
  let esc = false
  let prev = ''

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const code = s.charCodeAt(i)

    if (esc) { esc = false; out += ch; prev = ch; continue }
    if (ch === '\\' && inStr) { esc = true; out += ch; prev = ch; continue }
    if (ch === '"') { inStr = !inStr; out += ch; prev = ch; continue }

    if (inStr) {
      // Replace illegal control characters inside strings
      if (code < 0x20) {
        if (code === 0x09) { out += '\\t'; prev = 't'; continue }
        out += ' '; prev = ' '; continue
      }
      out += ch; prev = ch; continue
    }

    // Outside strings — fix trailing comma before } or ]
    if ((ch === '}' || ch === ']') && prev.trim() === ',') {
      // Remove the trailing comma from out
      out = out.trimEnd()
      if (out.endsWith(',')) out = out.slice(0, -1)
    }

    out += ch; prev = ch
  }

  return out
}

function extractJSON(s: string): string {
  const start = s.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  // Find matching closing brace by tracking depth
  let depth = 0, end = -1, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break } }
  }

  if (end !== -1) return s.slice(start, end + 1)

  // Truncated — repair
  return repairJSON(s.slice(start))
}

function repairJSON(partial: string): string {
  const stack: string[] = []
  let inStr = false, esc = false
  for (const ch of partial) {
    if (esc) { esc = false; continue }
    if (ch === '\\' && inStr) { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') stack.pop()
  }
  let result = partial
  if (inStr) result += '"'
  result = result.replace(/,\s*$/, '')
  while (stack.length > 0) result += stack.pop()
  return result
}

function parseJSON<T>(raw: string): T {
  // Log first 200 chars to help debug future issues
  console.log('AI response start:', raw.slice(0, 200).replace(/\n/g, '↵'))

  const cleaned = cleanRaw(raw)
  const extracted = extractJSON(cleaned)

  try {
    return JSON.parse(extracted) as T
  } catch (e) {
    // Last resort: try the raw extracted without our cleaning (in case we broke it)
    const rawExtracted = extractJSON(raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim())
    try {
      return JSON.parse(rawExtracted) as T
    } catch {
      console.error('Failed JSON (first 500):', extracted.slice(0, 500))
      throw e
    }
  }
}

export async function generateAuditReport(req: AuditRequest): Promise<AuditReport & { scraped?: ScrapedPage }> {
  // Step 1: Scrape live page
  console.log(`Scraping: ${req.url}`)
  let scraped: ScrapedPage | undefined
  try {
    scraped = await scrapePage(req.url)
    if (scraped.error) console.warn(`Scrape failed: ${scraped.error}`)
    else console.log(`Scraped: ${scraped.wordCount} words, ${scraped.formCount} forms, ${scraped.responseTimeMs}ms`)
  } catch (e) {
    console.warn('Scraper threw:', e)
    scraped = undefined
  }

  // Step 2: Part 1 — overview + SEO + LP
  const raw1 = await callAI(buildPromptPart1(req, scraped))
  type Part1 = Pick<AuditReport, 'overview' | 'scores' | 'seoCategories' | 'lpScoring' | 'projectedScoreAfterFixes'>
  let part1: Part1
  try {
    part1 = parseJSON<Part1>(raw1)
  } catch (e) {
    throw new Error(`Part 1 JSON parse failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Unwrap if nested under a wrapper key
  const p1 = part1 as Record<string, unknown>
  if (!part1.scores && p1.report) part1 = p1.report as Part1
  if (!part1.scores && p1.data) part1 = p1.data as Part1

  if (typeof part1.scores?.seo !== 'number') {
    console.error('Part 1 keys:', Object.keys(part1))
    throw new Error(`Part 1 missing scores — got keys: ${Object.keys(part1).join(', ')}`)
  }

  // Inject real scraped values
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

  // Step 3: Part 2 — gap analysis + fixes + competitor + recommendations
  const raw2 = await callAI(buildPromptPart2(req, summary, scraped))
  type Part2 = Pick<AuditReport, 'gapAnalysis' | 'competitorAnalysis' | 'priorityFixes' | 'strengthsWeaknesses' | 'recommendations'>
  let part2: Part2
  try {
    part2 = parseJSON<Part2>(raw2)
  } catch (e) {
    throw new Error(`Part 2 JSON parse failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  const p2 = part2 as Record<string, unknown>
  if (!part2.gapAnalysis && p2.report) part2 = p2.report as Part2
  if (!part2.gapAnalysis && p2.data) part2 = p2.data as Part2

  if (!part2.gapAnalysis || !part2.priorityFixes) {
    console.error('Part 2 keys:', Object.keys(part2))
    throw new Error(`Part 2 missing required sections — got: ${Object.keys(part2).join(', ')}`)
  }

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
