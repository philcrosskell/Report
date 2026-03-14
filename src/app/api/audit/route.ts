import { NextRequest, NextResponse } from 'next/server'
import { generateAuditReport } from '@/lib/ai'
import { AuditRequest, AuditResponse } from '@/lib/types'

export async function POST(request: NextRequest): Promise<NextResponse<AuditResponse>> {
  try {
    const body = (await request.json()) as AuditRequest
    if (!body.url) return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    try { new URL(body.url) } catch { return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 }) }
    const report = await generateAuditReport(body)
    return NextResponse.json({ success: true, report })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Audit error:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
