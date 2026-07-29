import { NextRequest, NextResponse } from 'next/server'
import { generateAuditReport } from '@/lib/ai'
import { AuditRequest } from '@/lib/types'

export async function POST(request: NextRequest): Promise<Response> {
let body: AuditRequest
try {
body = (await request.json()) as AuditRequest
} catch {
return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
}
if (!body.url) return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
try { new URL(body.url) } catch { return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 }) }

const encoder = new TextEncoder()
const stream = new ReadableStream({
async start(controller) {
let closed = false
const send = (obj: unknown) => { if (!closed) { try { controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n')) } catch { closed = true } } }
const heartbeat = setInterval(() => send({ type: 'heartbeat' }), 15000)
try {
const report = await generateAuditReport(body)
send({ type: 'done', success: true, report })
} catch (err) {
const msg = err instanceof Error ? err.message : 'Unknown error'
console.error('Audit error:', msg)
send({ type: 'error', success: false, error: msg })
} finally {
clearInterval(heartbeat)
closed = true
controller.close()
}
},
})

return new Response(stream, {
status: 200,
headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
})
}