import { Audit } from './types'

// ─── Shared design constants ──────────────────────────────────────────────────
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
const BLUE: [number,number,number] = [59, 130, 246]

const STRIPE_W = 8   // yellow left stripe width
const M = 22         // left margin (after stripe)
const RT = 15        // right margin
const W = 210
const CW = W - M - RT

function scol(n: number): [number,number,number] {
  return n >= 70 ? GREEN : n >= 40 ? AMBER : RED
}

export async function exportPDF(audit: Audit): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const r = audit.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function lastY() { return (doc as any).lastAutoTable.finalY + 6 }

  function addPage() {
    doc.addPage()
    // Yellow left stripe on every page
    doc.setFillColor(...YELLOW)
    doc.rect(0, 0, STRIPE_W, 297, 'F')
    y = 18
  }

  function np(need = 20) {
    if (y + need > 275) addPage()
  }

  function secHeader(title: string) {
    np(16)
    // Yellow bar
    doc.setFillColor(...YELLOW)
    doc.rect(M, y, CW, 8, 'F')
    doc.setTextColor(...BLACK)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), M + 3, y + 5.5)
    y += 12
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
  }

  function subHead(title: string) {
    np(12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(title, M, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
  }

  function bodyText(text: string, indent = 0, color: [number,number,number] = DARK, size = 10) {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CW - indent) as string[]
    np(lines.length * 5.5 + 2)
    doc.text(lines, M + indent, y)
    y += lines.length * 5.5 + 2
  }

  function smartBody(text: string, indent = 0, color: [number,number,number] = DARK) {
    const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text]
    const cleaned = sentences.map(s => s.trim()).filter(Boolean)
    if (cleaned.length <= 1) { bodyText(text, indent, color); return }
    cleaned.forEach(s => bodyText(s, indent, color))
  }

  function labelVal(label: string, value: string, indent = 0) {
    np(10)
    doc.setFontSize(10)
    const lw = doc.getTextWidth(label + ' ')
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(label, M + indent, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    const lines = doc.splitTextToSize(value, CW - indent - lw - 2) as string[]
    doc.text(lines, M + indent + lw + 1, y)
    y += lines.length * 5.5 + 2
  }

  function divider() {
    np(6)
    doc.setDrawColor(...LIGHT_GREY)
    doc.setLineWidth(0.2)
    doc.line(M, y, M + CW, y)
    y += 5
  }

  // ════════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════════
  // White background
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, W, 297, 'F')

  // Yellow left stripe
  doc.setFillColor(...YELLOW)
  doc.rect(0, 0, STRIPE_W, 297, 'F')

  // Yellow accent bar at top
  doc.setFillColor(...YELLOW)
  doc.rect(STRIPE_W, 0, W - STRIPE_W, 3, 'F')

  // BEAL logo area — draw the wordmark manually using paths approximation
  // Yellow vertical bar (logo mark)
  doc.setFillColor(...YELLOW)
  doc.roundedRect(M, 28, 5, 22, 1, 1, 'F')
  // "BEAL Creative" text
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('BEAL', M + 9, 40)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text('Creative', M + 9, 49)

  // Horizontal rule
  doc.setDrawColor(...LIGHT_GREY)
  doc.setLineWidth(0.4)
  doc.line(M, 58, W - RT, 58)

  // Report type badge
  doc.setFillColor(...YELLOW)
  doc.roundedRect(M, 66, 60, 9, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  doc.text('PAGE AUDIT REPORT', M + 3, 72)

  // Report title
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BLACK)
  const titleText = audit.label || r.overview.pageType || 'Page Audit'
  const titleLines = doc.splitTextToSize(titleText, CW) as string[]
  titleLines.forEach((l, i) => doc.text(l, M, 88 + i * 12))
  const afterTitle = 88 + titleLines.length * 12

  // URL
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text(audit.url, M, afterTitle + 6)

  // Score summary boxes
  const boxY = afterTitle + 22
  const scores = [
    { l: 'SEO Score', v: r.scores.seo },
    { l: 'LP Score', v: r.scores.lp },
    { l: 'Overall', v: r.scores.overall },
  ]
  const bw = 38
  scores.forEach((s, i) => {
    const bx = M + i * (bw + 4)
    doc.setFillColor(...BG_GREY); doc.roundedRect(bx, boxY, bw, 22, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
    doc.text(s.l, bx + bw / 2, boxY + 7, { align: 'center' })
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(s.v))
    doc.text(String(s.v), bx + bw / 2, boxY + 17, { align: 'center' })
  })
  // Grade box
  const gx = M + 3 * (bw + 4)
  doc.setFillColor(...BG_GREY); doc.roundedRect(gx, boxY, bw, 22, 2, 2, 'F')
  doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
  doc.text('Grade', gx + bw / 2, boxY + 7, { align: 'center' })
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(r.scores.overall))
  doc.text(r.scores.grade, gx + bw / 2, boxY + 17, { align: 'center' })
  doc.setFont('helvetica', 'normal')

  // Summary
  const sumY = boxY + 30
  doc.setFontSize(10); doc.setTextColor(...DARK); doc.setFont('helvetica', 'normal')
  const sumLines = doc.splitTextToSize(r.overview.summary, CW) as string[]
  doc.text(sumLines, M, sumY)

  // Page stats row
  const statsY = sumY + sumLines.length * 5.5 + 10
  const stats = [['Type', r.overview.pageType], ['Words', String(r.overview.wordCount)], ['Response', r.overview.responseTime], ['Int. Links', String(r.overview.internalLinks)], ['File Size', r.overview.fileSize]]
  const sw = CW / stats.length
  stats.forEach(([l, v], i) => {
    const sx = M + i * sw
    doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
    doc.text(String(l), sx, statsY)
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(String(v), sx, statsY + 7)
  })

  // Cover footer
  doc.setFontSize(8); doc.setTextColor(...LIGHT_GREY); doc.setFont('helvetica', 'normal')
  doc.text('Prepared by BEAL Creative — Audit Machine', M, 278)
  doc.text(new Date(audit.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }), W - RT, 278, { align: 'right' })
  doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.3)
  doc.line(M, 272, W - RT, 272)

  // ════════════════════════════════════════════════════════════
  // 1. GAP ANALYSIS
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Gap Analysis')
  const g = r.gapAnalysis

  if (g) {
    // Score before/after row
    np(28)
    const scoreBoxes = [
      { l: 'Current Score', v: g.beforeScore, grade: g.beforeGrade, col: scol(g.beforeScore) },
      { l: 'After Fixes', v: g.afterScore, grade: g.afterGrade, col: GREEN },
    ]
    scoreBoxes.forEach((b, i) => {
      const bx = M + i * 58
      doc.setFillColor(...BG_GREY); doc.roundedRect(bx, y, 52, 20, 2, 2, 'F')
      doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
      doc.text(b.l, bx + 4, y + 6)
      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...b.col)
      doc.text(`${b.v}`, bx + 4, y + 16)
      doc.setFontSize(9); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
      doc.text(b.grade, bx + 4 + doc.getTextWidth(`${b.v}`) + 2, y + 16)
    })
    // Uplift badge
    const upx = M + 120
    doc.setFillColor(220, 252, 231); doc.roundedRect(upx, y, 50, 20, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...GREEN); doc.setFont('helvetica', 'normal')
    doc.text('Potential Uplift', upx + 4, y + 6)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(`+${g.afterScore - g.beforeScore} pts`, upx + 4, y + 16)
    y += 26

    smartBody(g.executiveSummary)
    y += 2

    // Critical issues
    subHead('Critical Issues')
    g.criticalIssues.forEach((item, i) => {
      np(28)
      doc.setFillColor(...BG_GREY); doc.roundedRect(M, y, CW, 7, 1, 1, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      const issueLines = doc.splitTextToSize(`${i + 1}.  ${item.issue}`, CW - 4) as string[]
      doc.text(issueLines, M + 3, y + 5)
      y += issueLines.length * 5.5 + 4
      labelVal('Impact:', item.impact, 2)
      labelVal('Fix:', item.fix, 2)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(item.effort === 'Easy' ? GREEN : item.effort === 'Medium' ? AMBER : RED))
      doc.text(`${item.effort} effort`, M + 2, y); y += 8
    })

    y += 2
    subHead('Quick Wins')
    g.quickWins.forEach((item, i) => {
      np(20)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      const wLines = doc.splitTextToSize(`${i + 1}.  ${item.win}`, CW - 4) as string[]
      doc.text(wLines, M + 2, y); y += wLines.length * 5.5 + 1
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      smartBody(item.action, 4)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE)
      doc.text(item.timeEstimate, M + 4, y); y += 8
    })

    y += 2
    subHead('Positioning Gap')
    smartBody(g.positioningGap, 0, GREY)
    y += 3

    // Top recommendation callout
    np(22)
    doc.setFillColor(255, 249, 180); doc.roundedRect(M, y - 2, CW, 4, 1, 1, 'F')
    const recLines = doc.splitTextToSize(g.topRecommendation, CW - 8) as string[]
    doc.setFillColor(255, 249, 180); doc.roundedRect(M, y - 2, CW, recLines.length * 5.5 + 14, 2, 2, 'F')
    doc.setFillColor(...YELLOW); doc.rect(M, y - 2, 3, recLines.length * 5.5 + 14, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text('★  TOP RECOMMENDATION', M + 6, y + 4)
    y += 9
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 60, 0)
    doc.text(recLines, M + 6, y); y += recLines.length * 5.5 + 8
  }

  // ════════════════════════════════════════════════════════════
  // 2. SEO ANALYSIS
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('SEO Analysis')

  const catLabels: Record<string, string> = { metaInformation: 'Meta Information', pageQuality: 'Page Quality', pageStructure: 'Page Structure', linkStructure: 'Link Structure', serverTechnical: 'Server & Technical', externalFactors: 'External Factors' }

  subHead('Category Overview')
  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    np(10)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(catLabels[k] ?? k, M, y + 4)
    doc.setFillColor(230, 230, 235); doc.rect(M + 50, y + 1, 110, 5, 'F')
    doc.setFillColor(...scol(cat.score)); doc.rect(M + 50, y + 1, 110 * cat.score / 100, 5, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(cat.score))
    doc.text(`${cat.score}%`, M + 163, y + 5, { align: 'right' })
    y += 10
  })
  y += 4

  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    np(16)
    subHead(`${catLabels[k] ?? k} — ${cat.score}%`)
    cat.checks.forEach((c: { label: string; status: string; detail: string; criticality: string }) => {
      np(14)
      const dotCol: [number,number,number] = c.status === 'pass' ? GREEN : c.status === 'fail' ? RED : AMBER
      doc.setFillColor(...dotCol); doc.circle(M + 2.5, y + 2, 2, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(c.label, M + 7, y + 3.5)
      const critMap: Record<string, string> = { critical: 'Critical', important: 'Important', somewhat: 'Somewhat', nice: 'Nice to have' }
      const critColMap: Record<string, [number,number,number]> = { critical: RED, important: AMBER, somewhat: BLUE, nice: LIGHT_GREY }
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.setTextColor(...(critColMap[c.criticality] ?? LIGHT_GREY))
      doc.text(critMap[c.criticality] ?? '', W - RT, y + 3.5, { align: 'right' })
      y += 7
      doc.setFontSize(9.5); doc.setTextColor(...GREY)
      const dLines = doc.splitTextToSize(c.detail, CW - 10) as string[]
      np(dLines.length * 5 + 4)
      doc.text(dLines, M + 7, y); y += dLines.length * 5 + 5
    })
    y += 3
  })

  // ════════════════════════════════════════════════════════════
  // 3. LP SCORING
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Landing Page Scoring')

  const lpLabels: Record<string, string> = { messageClarity: 'Message & Value Clarity', trustSocialProof: 'Trust & Social Proof', ctaForms: 'CTA & Forms', technicalPerformance: 'Technical Performance', visualUX: 'Visual Design & UX' }

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Score', '%', 'Assessment']],
    body: Object.entries(r.lpScoring).map(([k, c]) => [lpLabels[k] ?? k, `${c.score}/${c.maxScore}`, `${c.percentage}%`, c.assessment]),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 22 }, 2: { cellWidth: 16 }, 3: { cellWidth: CW - 90 } },
  })
  y = lastY()

  Object.entries(r.lpScoring).forEach(([k, cat]) => {
    np(16)
    subHead(`${lpLabels[k] ?? k} — ${cat.score}/${cat.maxScore}`)
    cat.subScores.forEach((s: { label: string; score: number; max: number; note: string }) => {
      np(14)
      const sCol: [number,number,number] = s.score >= 2 ? GREEN : s.score >= 1 ? AMBER : RED
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...sCol)
      doc.text(`${s.score}/${s.max}`, M, y + 3)
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(s.label, M + 12, y + 3)
      y += 6
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const nLines = doc.splitTextToSize(s.note, CW - 14) as string[]
      np(nLines.length * 5 + 3)
      doc.text(nLines, M + 12, y); y += nLines.length * 5 + 4
    })
    y += 3
  })

  // ════════════════════════════════════════════════════════════
  // 4. PRIORITY FIXES
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Priority Fixes')

  r.priorityFixes.forEach(f => {
    np(30)
    doc.setFillColor(...YELLOW); doc.circle(M + 5, y + 5, 5, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(String(f.rank), M + 3.5, y + 6.5)
    const titleLines = doc.splitTextToSize(f.title, CW - 14) as string[]
    doc.setFontSize(11); doc.text(titleLines, M + 13, y + 6)
    y += titleLines.length * 6 + 4
    labelVal('Problem:', f.problem, 4)
    labelVal('Fix:', f.fix, 4)
    np(10)
    const efCol: [number,number,number] = f.difficulty === 'Easy' ? GREEN : f.difficulty === 'Medium' ? AMBER : RED
    doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.setTextColor(...efCol); doc.text(`${f.difficulty} fix`, M + 4, y)
    doc.setTextColor(...BLUE); doc.text(f.uplift, M + 38, y)
    doc.setTextColor(...GREY); doc.text(f.timeline, M + 95, y)
    y += 10
    divider()
  })

  // ════════════════════════════════════════════════════════════
  // 5. POSITIONING & COMPETITOR ANALYSIS
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Positioning & Competitor Analysis')
  const ca = r.competitorAnalysis

  subHead('Hook Type & Approach')
  doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text('Hook Type: ', M, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...AMBER)
  doc.text(ca.hookType, M + doc.getTextWidth('Hook Type: '), y)
  y += 7; doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  smartBody(ca.hookAnalysis, 0, GREY)
  y += 2

  const posCol: [number,number,number] = ca.positioningStrength === 'Strong' ? GREEN : ca.positioningStrength === 'Moderate' ? AMBER : RED
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Positioning Strength: ', M, y)
  doc.setTextColor(...posCol); doc.text(ca.positioningStrength, M + doc.getTextWidth('Positioning Strength: '), y)
  y += 7; smartBody(ca.positioningNote, 0, GREY); y += 4

  subHead('Buyer Anxieties')
  ca.buyerAnxieties.forEach(b => {
    np(14)
    const bCol: [number,number,number] = b.addressed ? GREEN : RED
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...bCol)
    doc.text(b.addressed ? '✓' : '✗', M + 2, y + 3)
    doc.setTextColor(...BLACK); doc.text(b.anxiety, M + 8, y + 3)
    y += 6
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    const nLines = doc.splitTextToSize(b.note, CW - 10) as string[]
    doc.text(nLines, M + 8, y); y += nLines.length * 5 + 4
  })
  y += 2

  autoTable(doc, {
    startY: y,
    head: [['Table Stakes — Everyone Claims This', 'White Space — Unclaimed Opportunities']],
    body: (() => {
      const max = Math.max(ca.tableStakes.length, ca.whiteSpace.length)
      return Array.from({ length: max }, (_, i) => [
        ca.tableStakes[i] ?? '',
        ca.whiteSpace[i] ? `${ca.whiteSpace[i].opportunity}: ${ca.whiteSpace[i].rationale}` : '',
      ])
    })(),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: CW / 2 }, 1: { cellWidth: CW / 2 } },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════
  // 6. STRENGTHS & GAPS
  // ════════════════════════════════════════════════════════════
  secHeader('Strengths, Weaknesses & Opportunities')
  const sw = r.strengthsWeaknesses
  autoTable(doc, {
    startY: y,
    head: [['✓  Strengths', '✗  Weaknesses', '◎  Missed Opportunities']],
    body: (() => {
      const max = Math.max(sw.strengths.length, sw.weaknesses.length, sw.missedOpportunities.length)
      return Array.from({ length: max }, (_, i) => [sw.strengths[i] ?? '', sw.weaknesses[i] ?? '', sw.missedOpportunities[i] ?? ''])
    })(),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: CW / 3 }, 1: { cellWidth: CW / 3 }, 2: { cellWidth: CW / 3 } },
    didParseCell: (d) => {
      if (d.section === 'head') {
        if (d.column.index === 0) d.cell.styles.textColor = [20, 120, 60] as [number,number,number]
        if (d.column.index === 1) d.cell.styles.textColor = [180, 40, 40] as [number,number,number]
        if (d.column.index === 2) d.cell.styles.textColor = [30, 80, 180] as [number,number,number]
      }
    },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════
  // 7. RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════
  secHeader('Recommendations')
  autoTable(doc, {
    startY: y,
    head: [['Priority', 'Area', 'Action']],
    body: r.recommendations.map(rec => [rec.priority, rec.area, rec.action]),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 30 }, 2: { cellWidth: CW - 52 } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 0) {
        const p = String(d.cell.raw)
        d.cell.styles.textColor = p === 'High' ? [200, 40, 40] : p === 'Medium' ? [180, 110, 0] : [30, 80, 180]
        d.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // ════════════════════════════════════════════════════════════
  // FOOTER on all pages
  // ════════════════════════════════════════════════════════════
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    // Ensure stripe on every page (cover already has it)
    doc.setFillColor(...YELLOW); doc.rect(0, 0, STRIPE_W, 297, 'F')
    doc.setFontSize(8); doc.setTextColor(...LIGHT_GREY); doc.setFont('helvetica', 'normal')
    if (p > 1) {
      doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.2)
      doc.line(M, 286, W - RT, 286)
      doc.text(`Audit Machine — BEAL Creative — ${audit.url}`, M, 290)
      doc.text(`Page ${p} of ${pages}`, W - RT, 290, { align: 'right' })
    }
  }

  doc.save(`audit-machine-${audit.url.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${Date.now()}.pdf`)
}
