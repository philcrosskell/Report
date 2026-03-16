import type { Audit } from './types'

export async function exportPDF(audit: Audit): Promise<void> {
  const res = await fetch('/api/generate_pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(audit),
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(`PDF generation failed: ${msg}`)
  }

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `audit-machine-${audit.url.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${Date.now()}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
