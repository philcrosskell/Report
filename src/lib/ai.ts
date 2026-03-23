import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AuditRequest, AuditReport } from './types'
import { buildPromptPart1, buildPromptPart2 } from './prompt'
import { scrapePage, ScrapedPage } from './scraper'

// âââ Deterministic AEO Scoring (out of 40 points) âââââââââââââââââââââââââââ
function runAeoChecks(s: ScrapedPage, pageType?: string): { total: number; grade: string; breakdown: Record<string, number | null> } {
  const b: Record<string, number> = {}

  // Schema present (8pts) â foundation of AEO
  b.schemaPresent = s.hasSchema ? 8 : 0

  // Schema relevance (6pts) â right type for the page
  if (s.hasSchema) {
    const aeoSchemas = ['FAQPage','HowTo','Article','BlogPosting','LocalBusiness','Product','Service','Organization','WebPage','QAPage']
    const hasRelevant = s.schemaTypes.some(t => aeoSchemas.includes(t))
    const hasFaq = s.schemaTypes.includes('FAQPage') || s.schemaTypes.includes('QAPage')
    b.schemaRelevance = hasFaq ? 6 : hasRelevant ? 4 : 2
  } else { b.schemaRelevance = 0 }

  // Question-phrased headings (6pts) â AI tools love Q&A structure
  const isNaPage = pageType === 'contact' || pageType === 'about'
  if (isNaPage) {
    b.questionHeadings = null
  } else if (s.questionHeadings >= 3) b.questionHeadings = 6
  else if (s.questionHeadings === 2) b.questionHeadings = 4
  else if (s.questionHeadings === 1) b.questionHeadings = 2
  else b.questionHeadings = 0

  // Structured lists and tables (4pts) â extractable by AI
  const structureScore = Math.min(s.listCount + s.tableCount, 4)
  b.structuredLists = structureScore

  // FAQ content detected (4pts) â look for FAQ in schema types OR question headings
  const hasFaqSchema = s.schemaTypes.some(t => t.toLowerCase().includes('faq') || t.toLowerCase().includes('qa'))
  b.faqContent = isNaPage ? null : hasFaqSchema ? 4 : s.questionHeadings >= 2 ? 2 : 0

  // Meta description as a direct answer (3pts) â concise, informative
  if (s.metaDescription) {
    const len = s.metaDescription.length
    // Good meta = 80-160 chars, reads as a complete sentence/answer
    b.metaAsAnswer = len >= 80 && len <= 160 ? 3 : len > 0 ? 1 : 0
  } else { b.metaAsAnswer = 0 }

  // Entity signals (3pts) â business name/contact info present
  const hasEntities = s.phoneNumbers.length > 0 || s.emailAddresses.length > 0
  b.entitySignals = hasEntities ? 3 : 0

  // Content depth (3pts) â enough content to be citable
  if (s.wordCount >= 800) b.contentDepth = 3
  else if (s.wordCount >= 400) b.contentDepth = 2
  else if (s.wordCount >= 200) b.contentDepth = 1
  else b.contentDepth = 0

  // Open Graph / social metadata (2pts) â authority signal
  b.openGraph = s.hasOpenGraph ? 2 : 0

  // HTTPS + canonical (1pt) â trust signals
  b.httpsCanonical = (s.hasHttps && s.hasCanonical) ? 1 : 0

  const total = (Object.values(b) as (number | null)[]).reduce((a, v) => a + (v ?? 0), 0)
  const grade = total >= 34 ? 'A' : total >= 26 ? 'B' : total >= 18 ? 'C' : total >= 10 ? 'D' : 'F'
  return { total, grade, breakdown: b }
}

// âââ Deterministic Technical SEO Scoring (60 points) âââââââââââââââââââââââââ
// These checks are pass/fail based on real scraped data â no AI variance
function runTechnicalChecks(s: ScrapedPage): { score: number; breakdown: Record<string, number> } {
  const b: Record<string, number> = {}

  // Title (10pts)
  if (s.title) {
    const len = s.title.length
    b.title = len >= 30 && len <= 65 ? 10 : len > 0 ? 6 : 0
  } else { b.title = 0 }

  // Meta description (8pts)
  if (s.metaDescription) {
    const len = s.metaDescription.length
    b.metaDescription = len >= 80 && len <= 165 ? 8 : len > 0 ? 4 : 0
  } else { b.metaDescription = 0 }

  // H1 â exactly one is ideal (8pts)
  if (s.h1.length === 1) b.h1 = 8
  else if (s.h1.length > 1) b.h1 = 4  // multiple H1s â SEO issue
  else b.h1 = 0  // no H1

  // Word count (8pts)
  if (s.wordCount >= 800) b.wordCount = 8
  else if (s.wordCount >= 400) b.wordCount = 5
  else if (s.wordCount >= 200) b.wordCount = 2
  else b.wordCount = 0

  // HTTPS (6pts)
  b.https = s.hasHttps ? 6 : 0

  // Mobile viewport (5pts)
  b.viewport = s.hasViewport ? 5 : 0

  // Image alt text (5pts) â proportional based on % with alt
  if (s.images === 0) {
    b.imageAlt = 3  // no images â neutral, slight deduction
  } else {
    const pct = s.imagesWithAlt / s.images
    b.imageAlt = Math.round(pct * 5)
  }

  // Title / H1 keyword alignment (5pts)
  // Check if meaningful words from title appear in H1 and vice versa
  if (s.title && s.h1.length > 0) {
    const stopWords = new Set(['the','a','an','and','or','of','to','in','for','on','with','is','are','was','were','it','its','this','that','be','at','by','from'])
    const titleWords = s.title.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
    const h1Words = s.h1[0].toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w))
    const shared = titleWords.filter(w => h1Words.some(hw => hw.includes(w) || w.includes(hw)))
    const pct = titleWords.length > 0 ? shared.length / titleWords.length : 0
    if (pct >= 0.5) b.titleH1Alignment = 5
    else if (pct >= 0.25) b.titleH1Alignment = 3
    else if (shared.length > 0) b.titleH1Alignment = 1
    else b.titleH1Alignment = 0
  } else if (s.title && s.h1.length === 0) {
    b.titleH1Alignment = 0  // no H1 to compare
  } else {
    b.titleH1Alignment = 0
  }

  // Schema markup (4pts)
  b.schema = s.hasSchema ? 4 : 0

  // Canonical tag (3pts)
  b.canonical = s.hasCanonical ? 3 : 0

  // Response time (3pts)
  if (s.responseTimeMs < 400) b.responseTime = 3
  else if (s.responseTimeMs < 1000) b.responseTime = 2
  else if (s.responseTimeMs < 2000) b.responseTime = 1
  else b.responseTime = 0

  const score = Object.values(b).reduce((a, v) => a + v, 0)
  return { score, breakdown: b }
}

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
  let s = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  const start = s.indexOf('{')
  if (start > 0) s = s.slice(start)
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
      if (code < 0x20) {
        if (code === 0x09) { out += '\\t'; prev = 't'; continue }
        out += ' '; prev = ' '; continue
      }
      out += ch; prev = ch; continue
    }
    if ((ch === '}' || ch === ']') && prev.trim() === ',') {
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
  console.log('AI response start:', raw.slice(0, 200).replace(/\n/g, 'âµ'))
  const cleaned = cleanRaw(raw)
  const extracted = extractJSON(cleaned)
  try {
    return JSON.parse(extracted) as T
  } catch (e) {
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

  // Step 2: Run deterministic technical checks
  let techScore = 0
  let techBreakdown: Record<string, number> = {}
  if (scraped && !scraped.error) {
    const tech = runTechnicalChecks(scraped)
    techScore = tech.score
    techBreakdown = tech.breakdown
    console.log(`Technical score: ${techScore}/60`, techBreakdown)
  }

  let aeoScore: import('./types').AeoScore | undefined

    // Step 3: Part 1 â Claude analyses content quality only (qualitative, 40 pts max)
  const raw1 = await callAI(buildPromptPart1(req, scraped))
  type Part1 = Pick<AuditReport, 'overview' | 'scores' | 'seoCategories' | 'lpScoring' | 'projectedScoreAfterFixes'>
  let part1: Part1
  try {
    part1 = parseJSON<Part1>(raw1)
  } catch (e) {
    throw new Error(`Part 1 JSON parse failed: ${e instanceof Error ? e.message : String(e)}`)
  }
  const p1 = part1 as Record<string, unknown>
  if (!part1.scores && p1.report) part1 = p1.report as Part1
  if (!part1.scores && p1.data) part1 = p1.data as Part1
  if (typeof part1.scores?.seo !== 'number') {
    console.error('Part 1 keys:', Object.keys(part1))
    throw new Error(`Part 1 missing scores â got keys: ${Object.keys(part1).join(', ')}`)
  }

  // Step 3b: Run AEO checks — after Part 1 so we have pageType
  if (scraped && !scraped.error) {
    const aeo = runAeoChecks(scraped, part1.overview.pageType)
    aeoScore = { total: aeo.total, grade: aeo.grade, breakdown: aeo.breakdown as import('./types').AeoScore['breakdown'] }
    console.log('AEO score:', aeo.total + '/40', aeo.grade, '| pageType:', part1.overview.pageType)
  }

    // Step 4: Blend scores â technical (60pts) + Claude qualitative (40pts)
  // Claude's seo score is rescaled from 0-100 to 0-40 (qualitative portion only)
  if (scraped && !scraped.error) {
    const techMax = 65  // max possible from technical checks (was 60, +5 for title/H1 alignment)
    const techNormalised = Math.round((techScore / techMax) * 60)
    const claudeQualitative = Math.round((part1.scores.seo / 100) * 40)
    const blendedSeo = Math.min(100, techNormalised + claudeQualitative)
    console.log(`Blended SEO: ${techScore} (technical) + ${claudeQualitative} (qualitative) = ${blendedSeo}`)
    part1.scores.seo = blendedSeo
    // Recalculate overall as average of blended seo + lp
    part1.scores.overall = Math.round((blendedSeo + part1.scores.lp) / 2)
    // Recalculate grade
    const overall = part1.scores.overall
    part1.scores.grade = overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : overall >= 40 ? 'D' : 'F'
  }

  // Step 5: Inject real scraped values into overview
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

  // Step 6: Part 2 â gap analysis + fixes + competitor + recommendations
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
    throw new Error(`Part 2 missing required sections â got: ${Object.keys(part2).join(', ')}`)
  }

  return {
    overview: part1.overview,
    scores: part1.scores,
    aeoScore,
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