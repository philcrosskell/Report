import { SavedCompetitorReport } from './types'

export async function exportCompetitorPDF(saved: SavedCompetitorReport): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const r = saved.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, M = 15, CW = W - M * 2
  let y = 0

  const DARK = [15, 15, 17] as [number, number, number]
  const PURPLE = [124, 106, 247] as [number, number, number]
  const GREEN = [52, 211, 153] as [number, number, number]
  const AMBER = [251, 191, 36] as [number, number, number]
  const RED = [248, 113, 113] as [number, number, number]
  const GREY = [100, 100, 120] as [number, number, number]
  const LIGHT = [240, 240, 245] as [number, number, number]

  function np(need = 20) { if (y + need > 270) { doc.addPage(); y = 20 } }
  function sec(title: string, color: [number,number,number] = PURPLE) {
    np(16)
    doc.setFillColor(...color); doc.rect(M, y, CW, 8, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), M + 3, y + 5.5)
    y += 12; doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal')
  }
  function wrap(text: string, maxW: number): string[] {
    return doc.splitTextToSize(text, maxW) as string[]
  }

  // ── Cover page ──
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 297, 'F')
  doc.setFillColor(...PURPLE); doc.rect(0, 0, W, 4, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY); doc.text('COMPETITOR INTELLIGENCE REPORT', M, 40)
  doc.setTextColor(255, 255, 255); doc.setFontSize(28); doc.setFont('helvetica', 'bold')
  const titleLines = wrap(`How ${r.market}`, CW)
  titleLines.forEach((l, i) => doc.text(l, M, 55 + i * 12))
  const afterTitle = 55 + titleLines.length * 12 + 6
  doc.setFontSize(18); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text(`Competitors in This Market`, M, afterTitle)
  doc.setFontSize(11); doc.setTextColor(...LIGHT)
  doc.text(`Prepared for: ${r.businessName}`, M, afterTitle + 20)
  doc.text(`Analysed: ${r.businessUrl} vs. ${r.profiles.length - 1} competitor${r.profiles.length > 2 ? 's' : ''}`, M, afterTitle + 28)
  doc.text(`Date: ${r.date}`, M, afterTitle + 36)
  doc.setFontSize(9); doc.setTextColor(...GREY)
  doc.text('CONFIDENTIAL — Prepared exclusively for ' + r.businessName, M, 270)
  doc.addPage(); y = 20

  // ── Short version ──
  sec('The Short Version')
  r.headlineFindings.forEach(f => {
    np(30)
    doc.setFillColor(30, 30, 40); doc.roundedRect(M, y, CW, 6, 1, 1, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...LIGHT)
    doc.text(`${f.number}`, M + 3, y + 4.2)
    doc.setTextColor(...PURPLE); doc.text(f.title, M + 9, y + 4.2)
    y += 8
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...DARK)
    const lines = wrap(f.detail, CW - 4)
    doc.text(lines, M + 2, y)
    y += lines.length * 5 + 8
  })

  // ── Competitor profiles ──
  sec('Who We Looked At')
  autoTable(doc, {
    startY: y,
    head: [['Business', 'Tier', 'Positioning', 'What They Do Well']],
    body: r.profiles.map(p => [p.name + '\n' + p.url, p.tier, p.positioning, p.whatTheyDoWell]),
    margin: { left: M, right: M },
    styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 18 }, 2: { cellWidth: 55 }, 3: { cellWidth: 59 } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const tier = data.cell.raw as string
        data.cell.styles.textColor = tier === 'Client' ? [124, 106, 247] : tier === 'Premium' ? [52, 211, 153] : [160, 160, 180]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10

  // ── Claims matrix ──
  sec('How the Market Talks to Customers')
  const players = r.profiles.map(p => p.name)
  const colW = Math.min(30, (CW - 45) / players.length)
  autoTable(doc, {
    startY: y,
    head: [['Claim Type', ...players]],
    body: r.claimsMatrix.rows.map(row => [row.claimType, ...players.map(p => row.values[p] ?? '—')]),
    margin: { left: M, right: M },
    styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      ...Object.fromEntries(players.map((_, i) => [i + 1, { cellWidth: colW }])),
    },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10

  // ── Table stakes vs white space ──
  sec('What Everyone Says vs. What No One Says')
  np(10)
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Table Stakes — You Must Have These', M, y); y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY)
  doc.text('Claims made by 3+ competitors. Expected by prospects — not differentiating.', M, y); y += 7
  r.tableStakes.forEach(t => {
    np(7)
    doc.setTextColor(...DARK); doc.setFontSize(8.5)
    doc.text(`• ${t}`, M + 3, y); y += 6
  })
  y += 4
  np(10)
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('White Space — Opportunities Worth Claiming', M, y); y += 6
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY)
  doc.text('Claims made by 0–1 competitors. Strong differentiation potential.', M, y); y += 7
  autoTable(doc, {
    startY: y,
    head: [['Opportunity', 'Why It Matters', 'Who Could Own It']],
    body: r.whiteSpace.map(w => [w.opportunity, w.rationale, w.owner]),
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 80 }, 2: { cellWidth: 45 } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10

  if (r.noiseToAvoid?.length) {
    np(14)
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text('Noise — Too Generic to Differentiate', M, y); y += 7
    r.noiseToAvoid.forEach(n => {
      np(6); doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      doc.text(`"${n}"`, M + 3, y); y += 6
    })
    y += 4
  }

  // ── Buyer anxieties ──
  sec('What Customers Worry About')
  autoTable(doc, {
    startY: y,
    head: [['Common Concern', 'Who Addresses It Well', 'Who Ignores It']],
    body: r.buyerAnxieties.map(b => [b.concern, b.addressedBy, b.ignoredBy]),
    margin: { left: M, right: M },
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 55 }, 2: { cellWidth: 45 } },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10

  // ── Strategic implications ──
  sec('Strategic Implications')
  r.strategicImplications.forEach(s => {
    np(20)
    doc.setFillColor(30, 30, 40); doc.roundedRect(M, y, 8, 8, 1, 1, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PURPLE)
    doc.text(`${s.number}`, M + 2.8, y + 5.8)
    doc.setFontSize(9); doc.setTextColor(...DARK)
    doc.text(s.title, M + 11, y + 5.5)
    y += 12
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 40, 60)
    const lines = wrap(s.detail, CW - 4)
    doc.text(lines, M + 2, y)
    y += lines.length * 5 + 8
  })

  // ── Quick wins ──
  sec('Quick Wins — 30 Days', GREEN)
  doc.setTextColor(...DARK)
  r.quickWins.forEach((w, i) => {
    np(18)
    const effortColor: [number,number,number] = w.effort === 'Easy' ? GREEN : w.effort === 'Medium' ? AMBER : RED
    doc.setFillColor(...effortColor); doc.circle(M + 3, y + 3, 2.5, 'F')
    doc.setFontSize(7); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
    doc.text(`${i + 1}`, M + 2.2, y + 3.8)
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text(w.action, M + 8, y + 4)
    y += 7
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY)
    const lines = wrap(w.why, CW - 8)
    doc.text(lines, M + 8, y)
    y += lines.length * 5 + 3
    doc.setFontSize(7.5); doc.setTextColor(...effortColor)
    doc.text(`${w.effort} effort`, M + 8, y); y += 7
  })

  // ── Summary ──
  sec('Summary')
  np(30)
  doc.setFillColor(245, 245, 252); doc.roundedRect(M, y, CW, 2, 1, 1, 'F')
  const sumLines = wrap(r.summary, CW - 8)
  doc.setFillColor(245, 245, 252); doc.roundedRect(M, y, CW, sumLines.length * 5.5 + 12, 2, 2, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  doc.text(sumLines, M + 4, y + 7)
  y += sumLines.length * 5.5 + 16

  // ── Footer all pages ──
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7); doc.setTextColor(...GREY)
    doc.text(`${r.businessName} — Competitor Intelligence Report`, M, 290)
    doc.text(`Page ${p} of ${pages}`, W - M, 290, { align: 'right' })
    doc.setFillColor(...PURPLE); doc.rect(0, 293, W, 1, 'F')
  }

  doc.save(`competitor-intelligence-${r.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.pdf`)
}
