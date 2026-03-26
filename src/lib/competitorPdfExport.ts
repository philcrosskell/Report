import type { CompetitorIntelligenceReport } from './types'

export async function exportCompetitorPDF(report: CompetitorIntelligenceReport): Promise<void> {
  const res = await fetch('/api/generate_competitor_pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`PDF generation failed: ${msg}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `competitor-${report.businessName.toLowerCase().replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${Date.now()}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
