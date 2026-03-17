import type { SavedCompetitorReport } from './types'

export async function exportCompetitorPDF(saved: SavedCompetitorReport, _brandLogo = ''): Promise<void> {
  const res = await fetch('/api/generate_competitor_pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(saved),
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`PDF generation failed: ${msg}`)
  }

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `competitor-intelligence-${saved.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
