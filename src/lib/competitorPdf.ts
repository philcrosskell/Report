import { SavedCompetitorReport } from './types'

export async function exportCompetitorPDF(saved: SavedCompetitorReport, brandLogo = ''): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const r = saved.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, M = 16, CW = W - M * 2
  let y = 0

  // ── Colours ──
  const DARK: [number,number,number] = [15, 15, 17]
  const PURPLE: [number,number,number] = [255, 229, 0]   // BEAL yellow — used for section headers
  const GREEN: [number,number,number] = [52, 211, 153]
  const AMBER: [number,number,number] = [251, 191, 36]
  const RED: [number,number,number] = [248, 113, 113]
  const GREY: [number,number,number] = [110, 110, 130]
  const LIGHT: [number,number,number] = [235, 235, 245]
  const BG2: [number,number,number] = [245, 245, 252]

  function np(need = 25) {
    if (y + need > 272) { doc.addPage(); y = 18 }
  }

  function secHeader(title: string, color: [number,number,number] = PURPLE) {
    np(18)
    doc.setFillColor(...color)
    doc.rect(M, y, CW, 9, 'F')
    // Yellow needs black text, other colours (green) use white
    const isYellow = color[0] > 200 && color[1] > 200 && color[2] < 100
    doc.setTextColor(...(isYellow ? DARK : [255, 255, 255] as [number,number,number]))
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), M + 4, y + 6.2)
    y += 13
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'normal')
  }

  function bodyText(text: string, indent = 0, color: [number,number,number] = DARK) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CW - indent - 2) as string[]
    np(lines.length * 5.5 + 4)
    doc.text(lines, M + indent, y)
    y += lines.length * 5.5 + 3
  }

  function bulletPoint(text: string, indent = 4, color: [number,number,number] = DARK) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CW - indent - 8) as string[]
    np(lines.length * 5.5 + 3)
    doc.setFillColor(...color)
    doc.circle(M + indent + 1.5, y - 1.2, 1, 'F')
    doc.text(lines, M + indent + 5, y)
    y += lines.length * 5.5 + 2
  }

  function subHeading(text: string) {
    np(12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(text, M, y)
    y += 8
  }

  function divider() {
    np(6)
    doc.setDrawColor(...GREY)
    doc.setLineWidth(0.3)
    doc.line(M, y, M + CW, y)
    y += 6
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function lastTableY() { return (doc as any).lastAutoTable.finalY + 10 }

  // ════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 297, 'F')
  // BEAL yellow top bar
  doc.setFillColor(255, 229, 0)
  doc.rect(0, 0, W, 5, 'F')
  doc.setFillColor(30, 30, 45)
  doc.rect(0, 5, W, 85, 'F')
  // Yellow vertical bar motif (BEAL logo)
  doc.setFillColor(255, 229, 0)
  doc.roundedRect(M, 14, 4, 65, 2, 2, 'F')

  // Logo if provided
  if (brandLogo && !brandLogo.startsWith('data:image/svg')) {
    try {
      const ext = brandLogo.startsWith('data:image/png') ? 'PNG' : brandLogo.startsWith('data:image/webp') ? 'WEBP' : 'JPEG'
      doc.addImage(brandLogo, ext, M + 8, 12, 55, 22, undefined, 'FAST')
    } catch { /* skip */ }
  }

  doc.setTextColor(...GREY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('COMPETITOR INTELLIGENCE REPORT', M + 8, brandLogo ? 40 : 28)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(`How ${r.market} Competes`, CW - 8) as string[]
  const titleStart = brandLogo ? 50 : 38
  titleLines.forEach((l, i) => doc.text(l, M + 8, titleStart + i * 11))

  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text(`Where ${r.businessName} is Being Undervalued`, M + 8, titleStart + titleLines.length * 11 + 4)

  doc.setFontSize(10)
  doc.setTextColor(...GREY)
  doc.text(`Prepared for: ${r.businessName}`, M, 108)
  doc.text(`Analysed: ${r.businessUrl} vs. ${r.profiles.length - 1} competitor${r.profiles.length > 2 ? 's' : ''}`, M, 116)
  doc.text(`Date: ${r.date}`, M, 124)

  doc.setFontSize(8)
  doc.setTextColor(60, 60, 80)
  doc.text('CONFIDENTIAL — Prepared exclusively for ' + r.businessName, M, 270)

  doc.addPage()
  y = 18

  // ════════════════════════════════════════════
  // THE SHORT VERSION
  // ════════════════════════════════════════════
  secHeader('The Short Version')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  bodyText(`${r.profiles.length} findings from analysing ${r.profiles.length} businesses in this market.`, 0, GREY)
  y += 2

  r.headlineFindings.forEach(f => {
    np(35)
    doc.setFillColor(...BG2)
    const startY = y
    // We'll draw the box after calculating height
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PURPLE)
    doc.text(`${f.number}`, M + 4, y + 7)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    const titleL = doc.splitTextToSize(f.title, CW - 16) as string[]
    doc.text(titleL, M + 12, y + 7)
    y += titleL.length * 6.5 + 5

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    const detailL = doc.splitTextToSize(f.detail, CW - 12) as string[]
    np(detailL.length * 5.5 + 8)
    doc.text(detailL, M + 12, y)
    y += detailL.length * 5.5 + 4

    // Draw background box behind the item
    doc.setFillColor(...BG2)
    doc.roundedRect(M, startY, CW, y - startY + 2, 2, 2, 'F')
    // Redraw text on top
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PURPLE)
    doc.text(`${f.number}`, M + 4, startY + 7)
    doc.setTextColor(...DARK)
    doc.text(titleL, M + 12, startY + 7)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    doc.text(detailL, M + 12, startY + titleL.length * 6.5 + 10)
    y += 6
  })

  // ════════════════════════════════════════════
  // WHO WE LOOKED AT
  // ════════════════════════════════════════════
  secHeader('Who We Looked At')
  autoTable(doc, {
    startY: y,
    head: [['Business', 'Tier', 'Their Positioning', 'What They Do Well']],
    body: r.profiles.map(p => [`${p.name}\n${p.url}`, p.tier, p.positioning, p.whatTheyDoWell]),
    margin: { left: M, right: M },
    styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak', lineColor: [220, 220, 230], lineWidth: 0.3 },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 18 }, 2: { cellWidth: 60 }, 3: { cellWidth: CW - 40 - 18 - 60 } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const tier = String(data.cell.raw)
        data.cell.styles.textColor = tier === 'Client' ? [255, 229, 0] : tier === 'Premium' ? [52, 211, 153] : [160, 160, 180]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
  y = lastTableY()

  // ════════════════════════════════════════════
  // HOOK ANALYSIS
  // ════════════════════════════════════════════
  secHeader('Opening Hook Analysis — The 3-Second Test')
  autoTable(doc, {
    startY: y,
    head: [['Business', 'Hook Type', 'Effectiveness']],
    body: r.profiles.map(p => [p.name, p.hookType, p.hookEffectiveness]),
    margin: { left: M, right: M },
    styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak', lineColor: [220, 220, 230], lineWidth: 0.3 },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 45 }, 2: { cellWidth: CW - 40 - 45 } },
  })
  y = lastTableY()

  // ════════════════════════════════════════════
  // CLAIMS MATRIX
  // ════════════════════════════════════════════
  secHeader('How the Market Talks to Customers')
  bodyText('What each business claims — and how specifically.', 0, GREY)
  y += 2
  const playerNames = r.profiles.map(p => p.name)
  const nameColW = 42
  const playerColW = Math.floor((CW - nameColW) / playerNames.length)
  autoTable(doc, {
    startY: y,
    head: [['Claim Type', ...playerNames]],
    body: r.claimsMatrix.rows.map(row => [row.claimType, ...playerNames.map(p => row.values[p] ?? '—')]),
    margin: { left: M, right: M },
    styles: { fontSize: 9, cellPadding: 3.5, overflow: 'linebreak', lineColor: [220, 220, 230], lineWidth: 0.3 },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: {
      0: { cellWidth: nameColW, fontStyle: 'bold' },
      ...Object.fromEntries(playerNames.map((_, i) => [i + 1, { cellWidth: playerColW }])),
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 0) {
        if (String(data.cell.raw) === 'Not mentioned' || String(data.cell.raw) === '—') {
          data.cell.styles.textColor = [160, 160, 180]
          data.cell.styles.fontStyle = 'italic'
        }
      }
    },
  })
  y = lastTableY()

  // ════════════════════════════════════════════
  // TABLE STAKES vs WHITE SPACE (2 columns)
  // ════════════════════════════════════════════
  secHeader("What Everyone Says vs. What No One Says")
  const halfW = (CW - 6) / 2

  // Left col header
  np(14)
  doc.setFillColor(40, 40, 55)
  doc.rect(M, y, halfW, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('TABLE STAKES — YOU MUST HAVE THESE', M + 3, y + 5.5)
  // Right col header
  doc.setFillColor(...GREEN)
  doc.rect(M + halfW + 6, y, halfW, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text('WHITE SPACE — WORTH CLAIMING', M + halfW + 9, y + 5.5)
  y += 11

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text('Expected by prospects — not differentiating.', M, y)
  doc.text('Strong differentiation potential.', M + halfW + 6, y)
  y += 7

  // Stakes list
  const stakesStartY = y
  r.tableStakes.forEach(t => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(`• ${t}`, halfW - 4) as string[]
    np(lines.length * 5.5 + 2)
    doc.text(lines, M + 2, y)
    y += lines.length * 5.5 + 3
  })
  const stakesEndY = y

  // White space list (reset y to stakesStartY to align columns)
  y = stakesStartY
  r.whiteSpace.forEach(w => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    const titleL = doc.splitTextToSize(w.opportunity, halfW - 4) as string[]
    np(titleL.length * 5.5 + 2)
    doc.text(titleL, M + halfW + 8, y)
    y += titleL.length * 5.5 + 1
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    const ratL = doc.splitTextToSize(w.rationale, halfW - 4) as string[]
    doc.text(ratL, M + halfW + 8, y)
    y += ratL.length * 5 + 2
    doc.setTextColor(...GREEN)
    doc.setFontSize(9)
    doc.text(w.owner, M + halfW + 8, y)
    y += 7
  })

  y = Math.max(stakesEndY, y) + 6

  if (r.noiseToAvoid?.length) {
    np(14)
    subHeading('Noise — Too Generic to Differentiate')
    r.noiseToAvoid.forEach(n => {
      doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(...GREY)
      np(7)
      doc.text(`"${n}"`, M + 3, y); y += 7
    })
    y += 4
  }

  // ════════════════════════════════════════════
  // BUYER ANXIETIES
  // ════════════════════════════════════════════
  secHeader('What Customers Worry About')
  autoTable(doc, {
    startY: y,
    head: [['Common Concern', 'Who Addresses It Well', 'Who Ignores It']],
    body: r.buyerAnxieties.map(b => [b.concern, b.addressedBy, b.ignoredBy]),
    margin: { left: M, right: M },
    styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak', lineColor: [220, 220, 230], lineWidth: 0.3 },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 52 }, 2: { cellWidth: CW - 70 - 52 } },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 1) data.cell.styles.textColor = [52, 150, 100]
        if (data.column.index === 2) data.cell.styles.textColor = [160, 160, 180]
      }
    },
  })
  y = lastTableY()

  // ════════════════════════════════════════════
  // STRATEGIC IMPLICATIONS
  // ════════════════════════════════════════════
  secHeader('Three Strategic Implications')
  r.strategicImplications.forEach(s => {
    np(30)
    // Numbered circle
    doc.setFillColor(...PURPLE)
    doc.circle(M + 5, y + 5, 5, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(String(s.number), M + 3.5, y + 6.5)

    // Title
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    const titleL = doc.splitTextToSize(s.title, CW - 15) as string[]
    doc.text(titleL, M + 13, y + 6)
    y += titleL.length * 7 + 6

    // Detail — split into sentences as separate paragraphs
    const sentences = s.detail.split(/(?<=\.)\s+/)
    const paragraphs: string[][] = []
    let current: string[] = []
    sentences.forEach(sent => {
      current.push(sent)
      if (current.length >= 2) { paragraphs.push([...current]); current = [] }
    })
    if (current.length) paragraphs.push(current)

    paragraphs.forEach(para => {
      const text = para.join(' ')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GREY)
      const lines = doc.splitTextToSize(text, CW - 13) as string[]
      np(lines.length * 5.5 + 4)
      doc.text(lines, M + 13, y)
      y += lines.length * 5.5 + 4
    })
    y += 5
    divider()
  })

  // ════════════════════════════════════════════
  // QUICK WINS — 2 column layout
  // ════════════════════════════════════════════
  secHeader('Quick Wins — 30 Days', GREEN)
  bodyText('Actionable changes tied directly to the analysis. Executable without a full rebrand.', 0, GREY)
  y += 4

  const winColW = (CW - 8) / 2
  const leftWins = r.quickWins.filter((_, i) => i % 2 === 0)
  const rightWins = r.quickWins.filter((_, i) => i % 2 === 1)
  const maxWins = Math.max(leftWins.length, rightWins.length)

  for (let i = 0; i < maxWins; i++) {
    const lw = leftWins[i], rw = rightWins[i]
    const startItemY = y

    // Calculate heights for both columns
    const renderWin = (win: typeof lw | undefined, xOffset: number, measure = false) => {
      if (!win) return 0
      const ec: [number,number,number] = win.effort === 'Easy' ? GREEN : win.effort === 'Medium' ? AMBER : RED
      const titleL = doc.splitTextToSize(win.action, winColW - 14) as string[]
      const detailL = doc.splitTextToSize(win.why, winColW - 14) as string[]
      const h = titleL.length * 6 + detailL.length * 5.5 + 22
      if (!measure) {
        np(h + 5)
        // Checkbox circle
        doc.setFillColor(...ec)
        doc.circle(M + xOffset + 4, y + 4.5, 3.5, 'F')
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
        doc.text('☐', M + xOffset + 2.2, y + 6)
        // Title
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
        doc.text(titleL, M + xOffset + 11, y + 5.5)
        const afterTitle = y + titleL.length * 6 + 4
        // Detail
        doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
        doc.text(detailL, M + xOffset + 11, afterTitle)
        const afterDetail = afterTitle + detailL.length * 5.5 + 3
        // Effort label
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...ec)
        doc.text(`${win.effort} effort`, M + xOffset + 11, afterDetail)
      }
      return h
    }

    const lh = renderWin(lw, 0, true)
    const rh = renderWin(rw, winColW + 8, true)
    const rowH = Math.max(lh, rh)
    np(rowH + 8)

    renderWin(lw, 0, false)
    const tempY = y
    y = startItemY
    renderWin(rw, winColW + 8, false)
    y = Math.max(tempY, startItemY + rowH) + 5

    if (i < maxWins - 1) {
      doc.setDrawColor(...[220, 220, 230] as [number,number,number])
      doc.setLineWidth(0.2)
      doc.line(M, y - 2, M + CW, y - 2)
    }
  }

  y += 4

  // ════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════
  secHeader('Summary')
  np(20)

  // Break summary into bullet points at sentence boundaries
  const summaryText = r.summary
  const sentences = summaryText.match(/[^.!?]+[.!?]+/g) ?? [summaryText]

  // First sentence as intro
  if (sentences.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    const introL = doc.splitTextToSize(sentences[0].trim(), CW - 4) as string[]
    np(introL.length * 5.5 + 5)
    doc.text(introL, M + 2, y)
    y += introL.length * 5.5 + 6
  }

  // Middle sentences as bullet points
  sentences.slice(1, -1).forEach(sent => {
    bulletPoint(sent.trim())
  })

  // Last sentence as key callout box
  if (sentences.length > 1) {
    const last = sentences[sentences.length - 1].trim()
    np(20)
    y += 4
    doc.setFillColor(255, 249, 180)
    const lastL = doc.splitTextToSize(last, CW - 12) as string[]
    doc.roundedRect(M, y - 3, CW, lastL.length * 5.5 + 12, 2, 2, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PURPLE)
    doc.text('★ Key Recommendation', M + 4, y + 3.5)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 50, 0)
    doc.text(lastL, M + 4, y)
    y += lastL.length * 5.5 + 8
  }

  // ════════════════════════════════════════════
  // FOOTER on every page
  // ════════════════════════════════════════════
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(8)
    doc.setTextColor(...GREY)
    doc.text(`${r.businessName} — Competitor Intelligence Report`, M, 289)
    doc.text(`Page ${p} of ${pages}`, W - M, 289, { align: 'right' })
    doc.setFillColor(...PURPLE)
    doc.rect(0, 292, W, 1.5, 'F')
  }

  doc.save(`competitor-intelligence-${r.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.pdf`)
}
