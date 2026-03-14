import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AuditRequest, AuditReport } from './types'
import { buildPrompt } from './prompt'

async function callAnthropic(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Anthropic')
  return block.text
}

async function callOpenAI(prompt: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a senior SEO auditor. Return only valid, complete JSON. Never truncate your response.' },
      { role: 'user', content: prompt },
    ],
  })
  return res.choices[0].message.content ?? ''
}

function extractJSON(raw: string): string {
  // Strip markdown fences if present
  let clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  // If JSON looks complete, return as-is
  if (clean.startsWith('{') && clean.endsWith('}')) return clean

  // Try to find the largest valid JSON object in the response
  const start = clean.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')

  // Walk backwards from the end to find the last closing brace
  let depth = 0, lastValidEnd = -1
  for (let i = start; i < clean.length; i++) {
    if (clean[i] === '{') depth++
    else if (clean[i] === '}') {
      depth--
      if (depth === 0) { lastValidEnd = i; break }
    }
  }

  if (lastValidEnd === -1) {
    // JSON was truncated — attempt to close open arrays/objects
    clean = repairTruncatedJSON(clean.slice(start))
  } else {
    clean = clean.slice(start, lastValidEnd + 1)
  }

  return clean
}

function repairTruncatedJSON(partial: string): string {
  // Track what needs closing
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

  // Close any open strings first
  let result = partial
  if (inString) result += '"'

  // Close any trailing comma before we close containers
  result = result.replace(/,\s*$/, '')

  // Close remaining open containers
  while (stack.length > 0) {
    result += stack.pop()
  }

  return result
}

function parseReport(raw: string): AuditReport {
  const clean = extractJSON(raw)
  const parsed = JSON.parse(clean) as AuditReport
  if (typeof parsed.scores?.seo !== 'number') throw new Error('Invalid report structure — scores missing')
  return parsed
}

export async function generateAuditReport(req: AuditRequest): Promise<AuditReport> {
  const provider = process.env.AI_PROVIDER ?? 'anthropic'
  const prompt = buildPrompt(req)

  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in environment variables')
    return parseReport(await callOpenAI(prompt))
  }

  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set in environment variables')
  return parseReport(await callAnthropic(prompt))
}
