import { SavedCompetitorReport } from './types'

const YELLOW: [number,number,number] = [255, 229, 0]
const BLACK: [number,number,number] = [20, 20, 20]
const DARK: [number,number,number] = [40, 40, 40]
const GREY: [number,number,number] = [100, 100, 110]
const LIGHT_GREY: [number,number,number] = [180, 180, 190]
const BG_GREY: [number,number,number] = [248, 248, 250]
const WHITE: [number,number,number] = [255, 255, 255]
const GREEN: [number,number,number] = [34, 197, 94]
const AMBER: [number,number,number] = [245, 158, 11]
const RED: [number,number,number] = [239, 68, 68]

const STRIPE_W = 8
const M = 22
const RT = 15
const W = 210
const CW = W - M - RT

export async function exportCompetitorPDF(saved: SavedCompetitorReport, brandLogo = ''): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const r = saved.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function lastY() { return (doc as any).lastAutoTable.finalY + 6 }

  function addPage() {
    doc.addPage()
    doc.setFillColor(...WHITE); doc.rect(0, 0, W, 297, 'F')
    doc.setFillColor(...YELLOW); doc.rect(0, 0, STRIPE_W, 297, 'F')
    y = 18
  }

  function np(need = 20) { if (y + need > 275) addPage() }

  function secHeader(title: string, color: [number,number,number] = YELLOW) {
    np(16)
    doc.setFillColor(...color); doc.rect(M, y, CW, 8, 'F')
    const isYellow = color[0] > 200 && color[1] > 200 && color[2] < 50
    doc.setTextColor(...(isYellow ? BLACK : WHITE))
    doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), M + 3, y + 5.5)
    y += 12; doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  }

  function subHead(title: string) {
    np(12)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(title, M, y); y += 7
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  }

  function bodyText(text: string, indent = 0, color: [number,number,number] = DARK) {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CW - indent) as string[]
    np(lines.length * 5.5 + 2)
    doc.text(lines, M + indent, y); y += lines.length * 5.5 + 2
  }

  function smartBody(text: string, indent = 0, color: [number,number,number] = DARK) {
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text]
    const cleaned = sentences.map(s => s.trim()).filter(Boolean)
    if (cleaned.length <= 1) { bodyText(text, indent, color); return }
    cleaned.forEach(s => bodyText(s, indent, color))
  }

  function divider() {
    np(6); doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.2)
    doc.line(M, y, M + CW, y); y += 5
  }

  // ════════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════════
  doc.setFillColor(...WHITE); doc.rect(0, 0, W, 297, 'F')
  doc.setFillColor(...YELLOW); doc.rect(0, 0, STRIPE_W, 297, 'F')
  doc.setFillColor(...YELLOW); doc.rect(STRIPE_W, 0, W - STRIPE_W, 3, 'F')

  // Logo
  if (brandLogo && !brandLogo.startsWith('data:image/svg')) {
    try {
      const ext = brandLogo.startsWith('data:image/png') ? 'PNG' : brandLogo.startsWith('data:image/webp') ? 'WEBP' : 'JPEG'
      doc.addImage(brandLogo, ext, M, 22, 55, 22, undefined, 'FAST')
    } catch { /* skip */ }
  } else {
    // Draw BEAL logo mark
    doc.setFillColor(...YELLOW); doc.roundedRect(M, 28, 5, 22, 1, 1, 'F')
    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text('BEAL', M + 9, 40)
    doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    doc.text('Creative', M + 9, 49)
  }

  // Divider
  doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.4)
  doc.line(M, 60, W - RT, 60)

  // Report type badge
  doc.setFillColor(...YELLOW); doc.roundedRect(M, 68, 90, 9, 2, 2, 'F')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text('COMPETITOR INTELLIGENCE REPORT', M + 3, 74)

  // Title
  doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  const titleLines = doc.splitTextToSize(`How ${r.market}`, CW) as string[]
  titleLines.forEach((l, i) => doc.text(l, M, 90 + i * 11))
  const afterTitle = 90 + titleLines.length * 11

  doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text(`Competitors in This Market`, M, afterTitle + 6)

  // Meta
  doc.setFontSize(10); doc.setTextColor(...DARK)
  doc.text(`Prepared for: ${r.businessName}`, M, afterTitle + 20)
  doc.text(`Analysed: ${r.businessUrl} vs. ${r.profiles.length - 1} competitor${r.profiles.length !== 2 ? 's' : ''}`, M, afterTitle + 28)
  doc.text(`Date: ${r.date}`, M, afterTitle + 36)

  // Cover footer
  doc.setFontSize(8); doc.setTextColor(...LIGHT_GREY); doc.setFont('helvetica', 'normal')
  doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.3); doc.line(M, 272, W - RT, 272)
  doc.text('Prepared by BEAL Creative — Audit Machine', M, 278)
  doc.text('CONFIDENTIAL', W - RT, 278, { align: 'right' })

  // ════════════════════════════════════════════════════════════
  // THE SHORT VERSION
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('The Short Version')
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  bodyText(`${r.profiles.length} businesses analysed in this market.`, 0, GREY)
  y += 2

  r.headlineFindings.forEach(f => {
    np(30)
    const startY = y
    doc.setFillColor(...BG_GREY); doc.roundedRect(M, y - 2, CW, 2, 1, 1, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...YELLOW)
    // Draw yellow number circle
    doc.setFillColor(...YELLOW); doc.circle(M + 5, y + 5, 5, 'F')
    doc.setTextColor(...BLACK); doc.text(String(f.number), M + 3.2, y + 6.8)
    doc.setTextColor(...BLACK); const titleL = doc.splitTextToSize(f.title, CW - 14) as string[]
    doc.text(titleL, M + 13, y + 6)
    y += titleL.length * 6.5 + 4
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    smartBody(f.detail, 4)
    // Background behind the whole item
    doc.setFillColor(...BG_GREY); doc.roundedRect(M, startY - 2, CW, y - startY + 6, 2, 2, 'F')
    // Redraw text on top of bg
    doc.setFillColor(...YELLOW); doc.circle(M + 5, startY + 5, 5, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(String(f.number), M + 3.2, startY + 6.8)
    doc.text(titleL, M + 13, startY + 6)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    let ty = startY + titleL.length * 6.5 + 4
    const dSentences = f.detail.match(/[^.!?]+[.!?]+[\s]*/g) ?? [f.detail]
    dSentences.forEach(s => {
      doc.setTextColor(...GREY)
      const sl = doc.splitTextToSize(s.trim(), CW - 18) as string[]
      doc.text(sl, M + 13, ty); ty += sl.length * 5.5 + 2
    })
    y = ty + 6
  })

  // ════════════════════════════════════════════════════════════
  // COMPETITOR PROFILES
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Who We Looked At')
  autoTable(doc, {
    startY: y,
    head: [['Business', 'Tier', 'Their Positioning', 'What They Do Well']],
    body: r.profiles.map(p => [`${p.name}\n${p.url}`, p.tier, p.positioning, p.whatTheyDoWell]),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 18 }, 2: { cellWidth: 60 }, 3: { cellWidth: CW - 118 } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 1) {
        const t = String(d.cell.raw)
        d.cell.styles.textColor = t === 'Client' ? [20, 120, 20] : t === 'Premium' ? [20, 100, 180] : [100, 100, 110]
        d.cell.styles.fontStyle = 'bold'
      }
    },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════
  // HOOK ANALYSIS
  // ════════════════════════════════════════════════════════════
  secHeader('Opening Hook Analysis')
  autoTable(doc, {
    startY: y,
    head: [['Business', 'Hook Type', 'Effectiveness']],
    body: r.profiles.map(p => [p.name, p.hookType, p.hookEffectiveness]),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40 }, 2: { cellWidth: CW - 80 } },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════
  // CLAIMS MATRIX
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('How the Market Talks to Customers')
  bodyText('What each business claims — and how specifically.', 0, GREY)
  y += 2

  const playerNames = r.profiles.map(p => p.name)
  const nameColW = 40
  const playerColW = Math.floor((CW - nameColW) / playerNames.length)
  autoTable(doc, {
    startY: y,
    head: [['Claim Type', ...playerNames]],
    body: r.claimsMatrix.rows.map(row => [row.claimType, ...playerNames.map(p => row.values[p] ?? '—')]),
    margin: { left: M, right: RT },
    styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: {
      0: { cellWidth: nameColW, fontStyle: 'bold' },
      ...Object.fromEntries(playerNames.map((_, i) => [i + 1, { cellWidth: playerColW }])),
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index > 0) {
        const val = String(d.cell.raw)
        if (val === 'Not mentioned' || val === '—') {
          d.cell.styles.textColor = LIGHT_GREY
          d.cell.styles.fontStyle = 'italic'
        }
      }
    },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════
  // TABLE STAKES vs WHITE SPACE (2 columns)
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader("What Everyone Says vs. What No One Says")
  const halfW = (CW - 6) / 2

  // Column headers
  np(14)
  doc.setFillColor(240, 240, 242); doc.rect(M, y, halfW, 8, 'F')
  doc.setFillColor(220, 255, 235); doc.rect(M + halfW + 6, y, halfW, 8, 'F')
  doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK); doc.text('TABLE STAKES — EVERYONE CLAIMS THIS', M + 3, y + 5.5)
  doc.setTextColor(20, 120, 60); doc.text('WHITE SPACE — WORTH CLAIMING', M + halfW + 9, y + 5.5)
  y += 11

  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text('Expected — not differentiating.', M, y)
  doc.text('Strong differentiation potential.', M + halfW + 6, y)
  y += 7

  const stakesStartY = y
  r.tableStakes.forEach(t => {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(`• ${t}`, halfW - 4) as string[]
    np(lines.length * 5.5 + 2); doc.text(lines, M + 2, y); y += lines.length * 5.5 + 3
  })
  const stakesEndY = y

  y = stakesStartY
  r.whiteSpace.forEach(ws => {
    const titleL = doc.splitTextToSize(ws.opportunity, halfW - 4) as string[]
    np(titleL.length * 5.5 + 2)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(titleL, M + halfW + 8, y); y += titleL.length * 5.5 + 1
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    const ratL = doc.splitTextToSize(ws.rationale, halfW - 4) as string[]
    doc.text(ratL, M + halfW + 8, y); y += ratL.length * 5 + 2
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 120, 60)
    doc.text(ws.owner, M + halfW + 8, y); y += 7
  })
  y = Math.max(stakesEndY, y) + 6

  if (r.noiseToAvoid?.length) {
    np(14); subHead('Noise — Too Generic to Differentiate')
    r.noiseToAvoid.forEach(n => {
      np(7); doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GREY)
      doc.text(`"${n}"`, M + 3, y); y += 7
    })
    y += 4
  }

  // ════════════════════════════════════════════════════════════
  // BUYER ANXIETIES
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('What Customers Worry About')
  autoTable(doc, {
    startY: y,
    head: [['Common Concern', 'Who Addresses It Well', 'Who Ignores It']],
    body: r.buyerAnxieties.map(b => [b.concern, b.addressedBy, b.ignoredBy]),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 52 }, 2: { cellWidth: CW - 122 } },
    didParseCell: (d) => {
      if (d.section === 'body') {
        if (d.column.index === 1) d.cell.styles.textColor = [20, 120, 60] as [number,number,number]
        if (d.column.index === 2) d.cell.styles.textColor = LIGHT_GREY
      }
    },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════
  // STRATEGIC IMPLICATIONS
  // ════════════════════════════════════════════════════════════
  secHeader('Strategic Implications')
  r.strategicImplications.forEach(s => {
    np(30)
    doc.setFillColor(...YELLOW); doc.circle(M + 5, y + 5, 5, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(String(s.number), M + 3.2, y + 6.5)
    const titleL = doc.splitTextToSize(s.title, CW - 14) as string[]
    doc.setFontSize(12); doc.text(titleL, M + 13, y + 6)
    y += titleL.length * 7 + 5
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    smartBody(s.detail, 4, GREY)
    y += 4; divider()
  })

  // ════════════════════════════════════════════════════════════
  // QUICK WINS — 2 column
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Quick Wins — 30 Days', GREEN)
  bodyText('Actionable changes tied to the analysis. Executable without a full rebrand.', 0, GREY)
  y += 4

  const winColW = (CW - 8) / 2
  const leftWins = r.quickWins.filter((_, i) => i % 2 === 0)
  const rightWins = r.quickWins.filter((_, i) => i % 2 === 1)

  for (let i = 0; i < Math.max(leftWins.length, rightWins.length); i++) {
    const renderWin = (win: typeof leftWins[0] | undefined, xOff: number) => {
      if (!win) return
      const ec: [number,number,number] = win.effort === 'Easy' ? GREEN : win.effort === 'Medium' ? AMBER : RED
      doc.setFillColor(...ec); doc.circle(M + xOff + 4, y + 4.5, 3.5, 'F')
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
      doc.text(String(i + 1), M + xOff + 2.5, y + 6)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      const titleL = doc.splitTextToSize(win.action, winColW - 14) as string[]
      doc.text(titleL, M + xOff + 11, y + 5.5)
      let ty = y + titleL.length * 6 + 4
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const detailL = doc.splitTextToSize(win.why, winColW - 14) as string[]
      doc.text(detailL, M + xOff + 11, ty); ty += detailL.length * 5.5 + 2
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...ec)
      doc.text(`${win.effort} effort`, M + xOff + 11, ty)
    }
    const startY = y
    renderWin(leftWins[i], 0)
    const leftEndY = y + 30
    y = startY
    renderWin(rightWins[i], winColW + 8)
    y = Math.max(y + 30, leftEndY) + 5
    if (i < Math.max(leftWins.length, rightWins.length) - 1) {
      doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.2)
      doc.line(M, y - 2, M + CW, y - 2)
    }
  }

  // ════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Summary')
  const sentences = r.summary.match(/[^.!?]+[.!?]+/g) ?? [r.summary]
  const intro = sentences[0]?.trim() ?? ''
  const bullets = sentences.slice(1, -1).map(s => s.trim()).filter(Boolean)
  const closing = sentences.length > 1 ? sentences[sentences.length - 1]?.trim() : ''

  if (intro) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    const il = doc.splitTextToSize(intro, CW) as string[]
    np(il.length * 6 + 4); doc.text(il, M, y); y += il.length * 6 + 5
  }
  bullets.forEach(b => {
    np(10); doc.setFillColor(...DARK); doc.circle(M + 2, y - 1, 1.5, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    const bl = doc.splitTextToSize(b, CW - 8) as string[]
    doc.text(bl, M + 7, y); y += bl.length * 5.5 + 3
  })
  if (closing) {
    np(22); y += 4
    const cl = doc.splitTextToSize(closing, CW - 8) as string[]
    doc.setFillColor(255, 249, 180); doc.roundedRect(M, y - 3, CW, cl.length * 5.5 + 14, 2, 2, 'F')
    doc.setFillColor(...YELLOW); doc.rect(M, y - 3, 3, cl.length * 5.5 + 14, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text('★  KEY RECOMMENDATION', M + 6, y + 3.5)
    y += 9; doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 60, 0)
    doc.text(cl, M + 6, y); y += cl.length * 5.5 + 8
  }

  // ════════════════════════════════════════════════════════════
  // FOOTER all pages
  // ════════════════════════════════════════════════════════════
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFillColor(...YELLOW); doc.rect(0, 0, STRIPE_W, 297, 'F')
    if (p > 1) {
      doc.setFontSize(8); doc.setTextColor(...LIGHT_GREY); doc.setFont('helvetica', 'normal')
      doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.2); doc.line(M, 286, W - RT, 286)
      doc.text(`Audit Machine — BEAL Creative — ${r.businessName}`, M, 290)
      doc.text(`Page ${p} of ${pages}`, W - RT, 290, { align: 'right' })
    }
  }

  doc.save(`competitor-intelligence-${r.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.pdf`)
}
