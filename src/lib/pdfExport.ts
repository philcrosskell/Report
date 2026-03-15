import { Audit } from './types'

export async function exportPDF(audit: Audit): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const r = audit.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, M = 15, CW = W - M * 2
  let y = 20

  // ── colours ──────────────────────────────────────────────────────────────────
  const DARK: [number,number,number] = [15, 15, 17]
  const PURPLE: [number,number,number] = [255, 229, 0]
  const GREEN: [number,number,number] = [52, 211, 153]
  const AMBER: [number,number,number] = [251, 191, 36]
  const RED: [number,number,number] = [248, 113, 113]
  const GREY: [number,number,number] = [110, 110, 130]
  const LIGHT_BG: [number,number,number] = [245, 245, 252]

  function np(need = 20) { if (y + need > 272) { doc.addPage(); y = 18 } }

  function scol(n: number): [number,number,number] {
    return n >= 70 ? GREEN : n >= 40 ? AMBER : RED
  }

  function sec(title: string, color: [number,number,number] = PURPLE) {
    np(16)
    doc.setFillColor(...color)
    doc.rect(M, y, CW, 9, 'F')
    // Yellow (#FFE500) needs black text; green uses white
    const isYellow = color[0] > 200 && color[1] > 200 && color[2] < 50
    doc.setTextColor(...(isYellow ? DARK : [255, 255, 255] as [number,number,number]))
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), M + 4, y + 6.2)
    y += 13
    doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal')
  }

  function bodyText(text: string, indent = 0, color: [number,number,number] = DARK, fontSize = 10) {
    doc.setFontSize(fontSize); doc.setFont('helvetica', 'normal'); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CW - indent) as string[]
    np(lines.length * 5.5 + 3)
    doc.text(lines, M + indent, y)
    y += lines.length * 5.5 + 3
  }

  function smartText(text: string, indent = 0, color: [number,number,number] = DARK) {
    // Split into sentences for long text — same 30-word rule as on-screen
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text]
    const cleaned = sentences.map(s => s.trim()).filter(Boolean)
    if (cleaned.length <= 1) {
      bodyText(text, indent, color)
    } else {
      cleaned.forEach(sent => { bodyText(sent, indent, color) })
    }
  }

  function labelValue(label: string, value: string, indent = 0) {
    np(12)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    const labelW = doc.getTextWidth(label + ' ')
    doc.text(label, M + indent, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    const lines = doc.splitTextToSize(value, CW - indent - labelW - 2) as string[]
    doc.text(lines, M + indent + labelW + 1, y)
    y += lines.length * 5.5 + 3
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function lastY() { return (doc as any).lastAutoTable.finalY + 8 }

  // ════════════════════════════════════════════════════════════════════════════
  // COVER HEADER
  // ════════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 42, 'F')
  // BEAL yellow top bar
  doc.setFillColor(...PURPLE); doc.rect(0, 0, W, 4, 'F')
  // Yellow vertical bar motif
  doc.setFillColor(...PURPLE); doc.roundedRect(M, 8, 3, 28, 1, 1, 'F')
  // Header text
  doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.setFont('helvetica', 'bold')
  doc.text('AuditIQ', M + 8, 19)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 160, 184)
  doc.text('by BEAL Creative · Page Audit Report', M + 8, 27)
  doc.text(
    new Date(audit.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
    W - M, 27, { align: 'right' }
  )
  y = 52

  // Title + URL
  doc.setTextColor(...DARK); doc.setFontSize(15); doc.setFont('helvetica', 'bold')
  doc.text(audit.label || r.overview.pageType, M, y); y += 7
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text(audit.url, M, y); y += 8

  // Summary — smart text
  doc.setTextColor(...DARK)
  smartText(r.overview.summary)
  y += 4

  // Score boxes
  const bw = (CW - 9) / 4
  const scoreBoxes = [
    { l: 'SEO Score', v: r.scores.seo },
    { l: 'LP Score', v: r.scores.lp },
    { l: 'Overall', v: r.scores.overall },
    { l: 'After Fixes', v: r.projectedScoreAfterFixes.total, isGreen: true },
  ]
  scoreBoxes.forEach((b, i) => {
    const bx = M + i * (bw + 3)
    doc.setFillColor(...LIGHT_BG); doc.roundedRect(bx, y, bw, 22, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
    doc.text(b.l, bx + bw / 2, y + 7, { align: 'center' })
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(b.isGreen ? GREEN : scol(b.v)))
    doc.text(String(b.v), bx + bw / 2, y + 17, { align: 'center' })
  })
  // Grade box
  const gx = M + CW - bw
  doc.setFillColor(...LIGHT_BG); doc.roundedRect(gx - bw - 3, y, bw, 22, 2, 2, 'F')
  doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
  doc.text('Grade', gx - bw / 2 - 3, y + 7, { align: 'center' })
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(r.scores.overall))
  doc.text(r.scores.grade, gx - bw / 2 - 3, y + 17, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  y += 30

  // Page stats row
  const stats = [
    ['Page Type', r.overview.pageType],
    ['Words', String(r.overview.wordCount)],
    ['Response', r.overview.responseTime],
    ['Int. Links', String(r.overview.internalLinks)],
    ['File Size', r.overview.fileSize],
  ]
  const sw = CW / stats.length
  stats.forEach(([l, v], i) => {
    const sx = M + i * sw
    doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
    doc.text(l, sx, y + 4)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text(v, sx, y + 10)
  })
  y += 18

  // ════════════════════════════════════════════════════════════════════════════
  // 1. GAP ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  sec('Gap Analysis')
  const g = r.gapAnalysis

  if (g) {
    // Score before/after
    np(20)
    doc.setFillColor(...LIGHT_BG); doc.roundedRect(M, y, 55, 18, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...GREY); doc.text('Current Score', M + 4, y + 5)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(g.beforeScore))
    doc.text(`${g.beforeScore}/100  ${g.beforeGrade}`, M + 4, y + 14)

    doc.setFillColor(...LIGHT_BG); doc.roundedRect(M + 60, y, 55, 18, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
    doc.text('After Fixes', M + 64, y + 5)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
    doc.text(`${g.afterScore}/100  ${g.afterGrade}`, M + 64, y + 14)

    doc.setFillColor(220, 255, 240); doc.roundedRect(M + 120, y, 55, 18, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...GREEN); doc.setFont('helvetica', 'normal')
    doc.text('Potential Uplift', M + 124, y + 5)
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
    doc.text(`+${g.afterScore - g.beforeScore} pts`, M + 124, y + 14)
    doc.setFont('helvetica', 'normal')
    y += 24

    // Executive summary
    doc.setFontSize(10); doc.setTextColor(...DARK)
    smartText(g.executiveSummary)
    y += 2

    // Critical issues
    np(12)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...RED)
    doc.text('Critical Issues', M, y); y += 7
    g.criticalIssues.forEach((item, i) => {
      np(25)
      doc.setFillColor(...LIGHT_BG); doc.roundedRect(M, y, CW, 7, 1, 1, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
      const issueLines = doc.splitTextToSize(`${i + 1}. ${item.issue}`, CW - 6) as string[]
      doc.text(issueLines, M + 3, y + 5)
      y += issueLines.length * 5.5 + 4
      labelValue('Impact:', item.impact, 2)
      labelValue('Fix:', item.fix, 2)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(item.effort === 'Easy' ? GREEN : item.effort === 'Medium' ? AMBER : RED))
      doc.text(`${item.effort} fix`, M + 2, y); y += 8
    })

    y += 2
    // Quick wins
    np(12)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
    doc.text('Quick Wins', M, y); y += 7
    g.quickWins.forEach((item, i) => {
      np(20)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
      const winLines = doc.splitTextToSize(`${i + 1}. ${item.win}`, CW - 6) as string[]
      doc.text(winLines, M + 2, y)
      y += winLines.length * 5.5 + 1
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      smartText(item.action, 4)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PURPLE)
      doc.text(item.timeEstimate, M + 4, y); y += 8
    })

    y += 2
    // Positioning gap
    np(14)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text('Positioning Gap', M, y); y += 7
    doc.setFont('helvetica', 'normal')
    smartText(g.positioningGap, 0, GREY)

    y += 2
    // Top recommendation callout
    np(20)
    doc.setFillColor(255, 249, 180)
    const recLines = doc.splitTextToSize(g.topRecommendation, CW - 8) as string[]
    doc.roundedRect(M, y - 2, CW, recLines.length * 5.5 + 14, 2, 2, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PURPLE)
    doc.text('★ TOP RECOMMENDATION', M + 4, y + 4)
    y += 9
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(50, 40, 0)
    doc.text(recLines, M + 4, y)
    y += recLines.length * 5.5 + 8
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. SEO ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  sec('SEO Analysis')

  // Category overview bars
  const catLabels: Record<string, string> = {
    metaInformation: 'Meta Information', pageQuality: 'Page Quality',
    pageStructure: 'Page Structure', linkStructure: 'Link Structure',
    serverTechnical: 'Server & Technical', externalFactors: 'External Factors',
  }
  np(50)
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Category Overview', M, y); y += 7
  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    np(10)
    const label = catLabels[k] ?? k
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(label, M, y + 4)
    doc.setFillColor(225, 225, 235); doc.rect(M + 52, y + 1, 105, 5, 'F')
    doc.setFillColor(...scol(cat.score)); doc.rect(M + 52, y + 1, 105 * cat.score / 100, 5, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(cat.score))
    doc.text(`${cat.score}%`, M + 160, y + 4, { align: 'right' })
    doc.setFont('helvetica', 'normal'); y += 10
  })
  y += 4

  // Detailed checks per category
  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    np(16)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text(`${catLabels[k] ?? k} — ${cat.score}%`, M, y); y += 7
    cat.checks.forEach((c: { label: string; status: string; detail: string; criticality: string }) => {
      np(14)
      const dotColor: [number,number,number] = c.status === 'pass' ? GREEN : c.status === 'fail' ? RED : AMBER
      doc.setFillColor(...dotColor); doc.circle(M + 2.5, y + 1.5, 2, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
      doc.text(c.label, M + 7, y + 3.5)
      // Criticality badge
      const critLabels: Record<string, string> = { critical: 'Critical', important: 'Important', somewhat: 'Somewhat', nice: 'Nice to have' }
      const critColors: Record<string, [number,number,number]> = { critical: RED, important: AMBER, somewhat: [96, 165, 250], nice: GREY }
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...(critColors[c.criticality] ?? GREY))
      doc.text(critLabels[c.criticality] ?? '', W - M, y + 3.5, { align: 'right' })
      y += 7
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const detailLines = doc.splitTextToSize(c.detail, CW - 10) as string[]
      np(detailLines.length * 5 + 4)
      doc.text(detailLines, M + 7, y)
      y += detailLines.length * 5 + 5
    })
    y += 3
  })

  // ════════════════════════════════════════════════════════════════════════════
  // 3. LP SCORING
  // ════════════════════════════════════════════════════════════════════════════
  sec('Landing Page Scoring')
  const lpLabels: Record<string, string> = {
    messageClarity: 'Message & Value Clarity', trustSocialProof: 'Trust & Social Proof',
    ctaForms: 'CTA & Forms', technicalPerformance: 'Technical Performance', visualUX: 'Visual Design & UX',
  }

  // Overview table
  autoTable(doc, {
    startY: y,
    head: [['Category', 'Score', '%', 'Assessment']],
    body: Object.entries(r.lpScoring).map(([k, c]) => [lpLabels[k] ?? k, `${c.score}/${c.maxScore}`, `${c.percentage}%`, c.assessment]),
    margin: { left: M, right: M },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 22 }, 2: { cellWidth: 16 }, 3: { cellWidth: CW - 52 - 22 - 16 } },
  })
  y = lastY()

  // Sub-scores per category
  Object.entries(r.lpScoring).forEach(([k, cat]) => {
    np(16)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text(`${lpLabels[k] ?? k} — ${cat.score}/${cat.maxScore}`, M, y); y += 7
    cat.subScores.forEach(s => {
      np(14)
      const scoreCol: [number,number,number] = s.score >= 2 ? GREEN : s.score >= 1 ? AMBER : RED
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scoreCol)
      doc.text(`${s.score}/${s.max}`, M, y + 3)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
      doc.text(s.label, M + 12, y + 3)
      y += 6
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const noteLines = doc.splitTextToSize(s.note, CW - 14) as string[]
      np(noteLines.length * 5 + 3)
      doc.text(noteLines, M + 12, y)
      y += noteLines.length * 5 + 4
    })
    y += 3
  })

  // ════════════════════════════════════════════════════════════════════════════
  // 4. PRIORITY FIXES
  // ════════════════════════════════════════════════════════════════════════════
  sec('Priority Fixes')
  r.priorityFixes.forEach(f => {
    np(30)
    // Rank circle
    doc.setFillColor(...PURPLE)
    doc.circle(M + 4, y + 4, 4, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255)
    doc.text(String(f.rank), M + 2.5, y + 5.5)
    // Title
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    const titleLines = doc.splitTextToSize(f.title, CW - 14) as string[]
    doc.text(titleLines, M + 11, y + 5)
    y += titleLines.length * 6 + 4
    labelValue('Problem:', f.problem, 4)
    labelValue('Fix:', f.fix, 4)
    // Tags
    np(10)
    const effortCol: [number,number,number] = f.difficulty === 'Easy' ? GREEN : f.difficulty === 'Medium' ? AMBER : RED
    doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...effortCol); doc.text(`${f.difficulty} fix`, M + 4, y)
    doc.setTextColor(...PURPLE); doc.text(f.uplift, M + 35, y)
    doc.setTextColor(...GREY); doc.text(f.timeline, M + 90, y)
    y += 10
  })

  // ════════════════════════════════════════════════════════════════════════════
  // 5. POSITIONING & COMPETITOR ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  sec('Positioning & Competitor Analysis')
  const ca = r.competitorAnalysis

  np(16)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Hook Type & Approach', M, y); y += 7
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text(`Hook Type: `, M, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...AMBER)
  doc.text(ca.hookType, M + doc.getTextWidth('Hook Type: '), y)
  y += 7
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  smartText(ca.hookAnalysis, 0, GREY)

  np(14)
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  const posStrCol: [number,number,number] = ca.positioningStrength === 'Strong' ? GREEN : ca.positioningStrength === 'Moderate' ? AMBER : RED
  doc.text('Positioning: ', M, y)
  doc.setTextColor(...posStrCol); doc.text(ca.positioningStrength, M + doc.getTextWidth('Positioning: '), y)
  y += 7
  smartText(ca.positioningNote, 0, GREY)
  y += 2

  // Buyer anxieties
  np(14)
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Buyer Anxieties', M, y); y += 7
  ca.buyerAnxieties.forEach(b => {
    np(14)
    const bCol: [number,number,number] = b.addressed ? GREEN : RED
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...bCol)
    doc.text(b.addressed ? '✓' : '✗', M + 2, y + 3)
    doc.setTextColor(...DARK); doc.text(b.anxiety, M + 8, y + 3)
    y += 6
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    const noteLines = doc.splitTextToSize(b.note, CW - 10) as string[]
    doc.text(noteLines, M + 8, y)
    y += noteLines.length * 5 + 4
  })
  y += 2

  // Table stakes vs white space
  autoTable(doc, {
    startY: y,
    head: [['Table Stakes — Everyone Claims This', 'White Space — Unclaimed Opportunities']],
    body: (() => {
      const maxLen = Math.max(ca.tableStakes.length, ca.whiteSpace.length)
      return Array.from({ length: maxLen }, (_, i) => [
        ca.tableStakes[i] ?? '',
        ca.whiteSpace[i] ? `${ca.whiteSpace[i].opportunity}: ${ca.whiteSpace[i].rationale}` : '',
      ])
    })(),
    margin: { left: M, right: M },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: CW / 2 }, 1: { cellWidth: CW / 2 } },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════════════════════
  // 6. STRENGTHS & GAPS
  // ════════════════════════════════════════════════════════════════════════════
  sec('Strengths, Weaknesses & Missed Opportunities')

  autoTable(doc, {
    startY: y,
    head: [['✓ Strengths', '✗ Weaknesses', '◎ Missed Opportunities']],
    body: (() => {
      const sw = r.strengthsWeaknesses
      const maxLen = Math.max(sw.strengths.length, sw.weaknesses.length, sw.missedOpportunities.length)
      return Array.from({ length: maxLen }, (_, i) => [
        sw.strengths[i] ?? '',
        sw.weaknesses[i] ?? '',
        sw.missedOpportunities[i] ?? '',
      ])
    })(),
    margin: { left: M, right: M },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: CW / 3 }, 1: { cellWidth: CW / 3 }, 2: { cellWidth: CW / 3 } },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if (data.column.index === 0) data.cell.styles.textColor = [52, 211, 153]
        if (data.column.index === 1) data.cell.styles.textColor = [248, 113, 113]
        if (data.column.index === 2) data.cell.styles.textColor = [96, 165, 250]
      }
    },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════════════════════
  // 7. RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════════════════
  sec('Recommendations')
  autoTable(doc, {
    startY: y,
    head: [['Priority', 'Area', 'Action']],
    body: r.recommendations.map(rec => [rec.priority, rec.area, rec.action]),
    margin: { left: M, right: M },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 30 }, 2: { cellWidth: CW - 52 } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const p = String(data.cell.raw)
        data.cell.styles.textColor = p === 'High' ? [248, 113, 113] : p === 'Medium' ? [251, 191, 36] : [96, 165, 250]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════════════════════
  // FOOTER on all pages
  // ════════════════════════════════════════════════════════════════════════════
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(8); doc.setTextColor(...GREY)
    doc.text(`AuditIQ — ${audit.url}`, M, 289)
    doc.text(`Page ${p} of ${pages}`, W - M, 289, { align: 'right' })
    doc.setFillColor(...PURPLE); doc.rect(0, 292, W, 1.5, 'F')
  }

  doc.save(`auditiq-${audit.url.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${Date.now()}.pdf`)
}
