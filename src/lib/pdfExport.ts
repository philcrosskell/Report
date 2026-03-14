import { Audit } from './types'

export async function exportPDF(audit: Audit): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const r = audit.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, M = 15, CW = W - M * 2
  let y = 20

  function newPage(need = 20) { if (y + need > 270) { doc.addPage(); y = 20 } }
  function sec(title: string) {
    newPage(16)
    doc.setFillColor(124, 106, 247)
    doc.rect(M, y, CW, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), M + 3, y + 5.5)
    y += 12; doc.setTextColor(15, 15, 17); doc.setFont('helvetica', 'normal')
  }
  function scol(n: number): [number, number, number] { return n >= 70 ? [52, 211, 153] : n >= 40 ? [251, 191, 36] : [248, 113, 113] }

  // Header
  doc.setFillColor(15, 15, 17); doc.rect(0, 0, W, 40, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.setFont('helvetica', 'bold')
  doc.text('AuditIQ', M, 18)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 160, 184); doc.text('Page Audit Report', M, 26)
  doc.text(new Date(audit.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }), W - M, 26, { align: 'right' })
  y = 50

  // Title
  doc.setTextColor(15, 15, 17); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
  doc.text(audit.label || r.overview.pageType, M, y); y += 7
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 120)
  doc.text(audit.url, M, y); y += 8
  doc.setTextColor(15, 15, 17)
  const sumLines = doc.splitTextToSize(r.overview.summary, CW)
  doc.text(sumLines, M, y); y += sumLines.length * 5 + 8

  // Score boxes
  const boxes = [{ l: 'SEO', v: r.scores.seo }, { l: 'LP', v: r.scores.lp }, { l: 'Overall', v: r.scores.overall }]
  const bw = CW / 4 - 3
  boxes.forEach((b, i) => {
    const bx = M + i * (bw + 4)
    doc.setFillColor(245, 245, 250); doc.roundedRect(bx, y, bw, 20, 2, 2, 'F')
    doc.setFontSize(7); doc.setTextColor(100, 100, 120)
    doc.text(b.l, bx + bw / 2, y + 6, { align: 'center' })
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(b.v))
    doc.text(String(b.v), bx + bw / 2, y + 15, { align: 'center' })
    doc.setFont('helvetica', 'normal')
  })
  const gx = M + 3 * (bw + 4)
  doc.setFillColor(245, 245, 250); doc.roundedRect(gx, y, bw, 20, 2, 2, 'F')
  doc.setFontSize(7); doc.setTextColor(100, 100, 120); doc.text('Grade', gx + bw / 2, y + 6, { align: 'center' })
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(r.scores.overall))
  doc.text(r.scores.grade, gx + bw / 2, y + 15, { align: 'center' })
  doc.setFont('helvetica', 'normal'); y += 28

  // SEO categories
  sec('SEO Analysis')
  const catLabels: Record<string, string> = { metaInformation: 'Meta Information', pageQuality: 'Page Quality', pageStructure: 'Page Structure', linkStructure: 'Link Structure', serverTechnical: 'Server & Technical', externalFactors: 'External Factors' }
  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    newPage(10)
    doc.setFontSize(8); doc.setTextColor(15, 15, 17); doc.text(catLabels[k] ?? k, M, y + 4)
    doc.setFillColor(230, 230, 240); doc.rect(M + 55, y, 110, 5, 'F')
    doc.setFillColor(...scol(cat.score)); doc.rect(M + 55, y, 110 * (cat.score / 100), 5, 'F')
    doc.setTextColor(...scol(cat.score)); doc.setFont('helvetica', 'bold')
    doc.text(`${cat.score}%`, M + 170, y + 4, { align: 'right' })
    doc.setFont('helvetica', 'normal'); y += 9
  })
  y += 4

  // LP scoring
  sec('Landing Page Scoring')
  const lpLabels: Record<string, string> = { messageClarity: 'Message & Value Clarity', trustSocialProof: 'Trust & Social Proof', ctaForms: 'CTA & Forms', technicalPerformance: 'Technical Performance', visualUX: 'Visual Design & UX' }
  autoTable(doc, {
    startY: y,
    head: [['Category', 'Score', '%', 'Assessment']],
    body: Object.entries(r.lpScoring).map(([k, c]) => [lpLabels[k] ?? k, `${c.score}/${c.maxScore}`, `${c.percentage}%`, c.assessment]),
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 20 }, 2: { cellWidth: 15 }, 3: { cellWidth: 90 } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8

  // Priority fixes
  sec('Priority Fixes')
  r.priorityFixes.forEach(f => {
    newPage(25)
    doc.setFillColor(245, 245, 250); doc.roundedRect(M, y, CW, 6, 1, 1, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 15, 17)
    doc.text(`${f.rank}. ${f.title}`, M + 2, y + 4.5)
    y += 8; doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 120)
    const pLines = doc.splitTextToSize(`Problem: ${f.problem}`, CW - 4)
    doc.text(pLines, M + 2, y); y += pLines.length * 4 + 2
    const fLines = doc.splitTextToSize(`Fix: ${f.fix}`, CW - 4)
    doc.setTextColor(15, 15, 17); doc.text(fLines, M + 2, y); y += fLines.length * 4 + 6
  })

  // Recommendations
  sec('Recommendations')
  autoTable(doc, {
    startY: y,
    head: [['Priority', 'Area', 'Action']],
    body: r.recommendations.map(rec => [rec.priority, rec.area, rec.action]),
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 28 }, 2: { cellWidth: 132 } },
  })

  // Footer
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(7); doc.setTextColor(100, 100, 120)
    doc.text(`AuditIQ — ${audit.url}`, M, 290)
    doc.text(`Page ${p} of ${pages}`, W - M, 290, { align: 'right' })
  }

  doc.save(`auditiq-${audit.url.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${Date.now()}.pdf`)
}
