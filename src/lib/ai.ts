import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AuditRequest, AuditReport } from './types'
import { buildPrompt } from './prompt'

async function callAnthropic(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Unexpected Anthropic response type')
  return block.text
}

async function callOpenAI(prompt: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an SEO auditor. Respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
  })
  return res.choices[0].message.content ?? ''
}

function parseReport(raw: string): AuditReport {
  const clean = raw.replace(/^```json\s*/i, '').replace(/^```/i, '').replace(/```$/i, '').trim()
  const parsed = JSON.parse(clean) as AuditReport
  if (typeof parsed.scores?.seo !== 'number') throw new Error('Invalid report structure')
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
