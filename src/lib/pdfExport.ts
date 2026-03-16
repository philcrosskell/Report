import { Audit } from './types'

// ─── Shared design constants ──────────────────────────────────────────────────
const SIDEBAR: [number,number,number] = [255, 229, 0]  // yellow brand stripe
const BLACK: [number,number,number] = [20, 20, 20]
const DARK: [number,number,number] = [40, 40, 40]
const GREY: [number,number,number] = [100, 100, 110]
const LIGHT_GREY: [number,number,number] = [180, 180, 190]
const BG_GREY: [number,number,number] = [248, 248, 250]
const WHITE: [number,number,number] = [255, 255, 255]
const YELLOW: [number,number,number] = [255, 229, 0]
const GREEN: [number,number,number] = [34, 197, 94]
const AMBER: [number,number,number] = [245, 158, 11]
const RED: [number,number,number] = [239, 68, 68]
const BLUE: [number,number,number] = [59, 130, 246]

const STRIPE_W = 8
const M = 22
const RT = 15
const W = 210
const CW = W - M - RT

function scol(n: number): [number,number,number] {
  return n >= 70 ? GREEN : n >= 40 ? AMBER : RED
}

// Fix sentence splitting so abbreviations like e.g., i.e. don't cause line breaks
function splitSentences(text: string): string[] {
  const protected_ = text
    .replace(/\be\.g\./g, 'e\x00g\x00')
    .replace(/\bi\.e\./g, 'i\x00e\x00')
    .replace(/\betc\./g, 'etc\x00')
    .replace(/\bvs\./g, 'vs\x00')
    .replace(/\bDr\./g, 'Dr\x00')
    .replace(/\bMr\./g, 'Mr\x00')
    .replace(/\bMrs\./g, 'Mrs\x00')
    .replace(/\bNo\./g, 'No\x00')
  const sentences = protected_.match(/[^.!?]+[.!?]+[\s]*/g) ?? [protected_]
  return sentences.map(s => s.trim().replace(/\x00/g, '.')).filter(Boolean)
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
    doc.setFillColor(...SIDEBAR)
    doc.rect(0, 0, STRIPE_W, 297, 'F')
    y = 18
  }

  function np(need = 20) {
    if (y + need > 275) addPage()
  }

  function secHeader(title: string) {
    np(18)
    doc.setFillColor(...YELLOW)
    doc.rect(M, y, CW, 9, 'F')
    doc.setTextColor(...BLACK)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), M + 4, y + 6.2)
    y += 16
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
  }

  function subHead(title: string) {
    np(14)
    // Light grey fill with yellow left accent — no dark backgrounds
    doc.setFillColor(...BG_GREY)
    doc.rect(M, y - 1, CW, 9, 'F')
    doc.setFillColor(...YELLOW)
    doc.rect(M, y - 1, 3, 9, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(title, M + 6, y + 5.5)
    y += 13
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
    // Join all sentences as flowing text to avoid e.g. / i.e. splitting issues
    const sentences = splitSentences(text)
    bodyText(sentences.join(' '), indent, color)
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
    y += lines.length * 5.5 + 3
  }

  function divider() {
    np(6)
    doc.setDrawColor(...LIGHT_GREY)
    doc.setLineWidth(0.2)
    doc.line(M, y, M + CW, y)
    y += 5
  }

  // Draws a coloured pill badge with white text
  function pill(label: string, bg: [number,number,number], x: number, py: number): number {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const tw = doc.getTextWidth(label)
    const pw = tw + 6
    const ph = 5.5
    doc.setFillColor(...bg)
    doc.roundedRect(x, py - 4, pw, ph, 1.5, 1.5, 'F')
    doc.setTextColor(...WHITE)
    doc.text(label, x + 3, py - 0.2)
    doc.setFont('helvetica', 'normal')
    return pw + 3
  }

  // ════════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════════
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, W, 297, 'F')

  // Yellow brand stripe — full height left edge
  doc.setFillColor(...SIDEBAR)
  doc.rect(0, 0, STRIPE_W, 297, 'F')

  // BEAL logo — yellow pill + wordmark
  const pillH = 123 * 0.138
  const pillW = 27.667 * 0.138 * 2
  doc.setFillColor(...YELLOW)
  doc.roundedRect(M, 28, pillW, pillH, 1.5, 1.5, 'F')
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text('BEAL', M + pillW + 3, 38)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text('Creative.', M + pillW + 3, 45)

  // Horizontal rule
  doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.4)
  doc.line(M, 58, W - RT, 58)

  // Report type badge
  doc.setFillColor(...YELLOW); doc.roundedRect(M, 66, 62, 9, 2, 2, 'F')
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text('PAGE AUDIT REPORT', M + 3, 72)

  // Report title
  doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  const titleText = audit.label || r.overview.pageType || 'Page Audit'
  const titleLines = doc.splitTextToSize(titleText, CW) as string[]
  titleLines.forEach((l, i) => doc.text(l, M, 88 + i * 12))
  const afterTitle = 88 + titleLines.length * 12

  // URL
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text(audit.url, M, afterTitle + 6)

  // Score boxes
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
  // Grade box — rendered completely separately to avoid bleed
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

  // Page stats — fixed column widths to prevent Type/Words overlap
  const statsY = sumY + sumLines.length * 5.5 + 10
  const stats: [string, string][] = [
    ['Type', r.overview.pageType],
    ['Words', String(r.overview.wordCount)],
    ['Response', r.overview.responseTime],
    ['Int. Links', String(r.overview.internalLinks)],
    ['File Size', r.overview.fileSize],
  ]
  const colWidths = [42, 20, 28, 22, 24]
  let sx = M
  stats.forEach(([l, v], i) => {
    doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
    doc.text(String(l), sx, statsY)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    const truncated = (doc.splitTextToSize(String(v), colWidths[i] - 2) as string[])[0]
    doc.text(truncated, sx, statsY + 7)
    sx += colWidths[i]
  })

  // Cover footer
  doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
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
    np(28)
    const scoreBoxes = [
      { l: 'Current Score', v: g.beforeScore, grade: g.beforeGrade, col: scol(g.beforeScore) },
      { l: 'After Fixes', v: g.afterScore, grade: g.afterGrade, col: GREEN },
    ]
    scoreBoxes.forEach((b, i) => {
      const bx = M + i * 58
      doc.setFillColor(...BG_GREY); doc.roundedRect(bx, y, 52, 22, 2, 2, 'F')
      doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
      doc.text(b.l, bx + 4, y + 6)
      // Score number only — grade shown separately as small text
      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...b.col)
      doc.text(`${b.v}`, bx + 4, y + 17)
      const numW = doc.getTextWidth(`${b.v}`)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      doc.text(`(${b.grade})`, bx + 4 + numW + 2, y + 17)
    })
    const upx = M + 120
    doc.setFillColor(220, 252, 231); doc.roundedRect(upx, y, 50, 22, 2, 2, 'F')
    doc.setFontSize(8); doc.setTextColor(...GREEN); doc.setFont('helvetica', 'normal')
    doc.text('Potential Uplift', upx + 4, y + 6)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
    doc.text(`+${g.afterScore - g.beforeScore} pts`, upx + 4, y + 17)
    y += 28

    smartBody(g.executiveSummary)
    y += 2

    subHead('Critical Issues')
    g.criticalIssues.forEach((item, i) => {
      np(28)
      doc.setFillColor(...BG_GREY); doc.roundedRect(M, y, CW, 8, 1, 1, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      const issueLines = doc.splitTextToSize(`${i + 1}.  ${item.issue}`, CW - 32) as string[]
      doc.text(issueLines, M + 3, y + 5.5)
      // Effort pill top-right
      const efCol: [number,number,number] = item.effort === 'Easy' ? GREEN : item.effort === 'Medium' ? AMBER : RED
      const efLabel = `${item.effort} effort`
      const efTw = doc.getTextWidth(efLabel) + 9
      pill(efLabel, efCol, W - RT - efTw, y + 5.5)
      y += issueLines.length * 6 + 6
      labelVal('Impact:', item.impact, 2)
      labelVal('Fix:', item.fix, 2)
      y += 4
    })

    y += 2
    subHead('Quick Wins')
    g.quickWins.forEach((item, i) => {
      np(22)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      const wLines = doc.splitTextToSize(`${i + 1}.  ${item.win}`, CW - 34) as string[]
      doc.text(wLines, M + 2, y)
      // Time estimate pill top-right
      const teTw = doc.getTextWidth(item.timeEstimate) + 9
      pill(item.timeEstimate, BLUE, W - RT - teTw, y + 1)
      y += wLines.length * 5.5 + 3
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      smartBody(item.action, 4)
      y += 4
    })

    y += 2
    subHead('Positioning Gap')
    smartBody(g.positioningGap, 0, GREY)
    y += 3

    // Top recommendation callout
    np(30)
    const recText = g.topRecommendation
    const recLines = doc.splitTextToSize(recText, CW - 16) as string[]
    const boxH = recLines.length * 5.8 + 22
    doc.setFillColor(255, 249, 180); doc.roundedRect(M, y, CW, boxH, 2, 2, 'F')
    // Yellow left accent
    doc.setFillColor(...YELLOW); doc.rect(M, y, 3, boxH, 'F')
    // Yellow heading strip
    doc.setFillColor(...YELLOW); doc.rect(M + 3, y, CW - 3, 11, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text('TOP RECOMMENDATION', M + 8, y + 7.5)
    y += 14
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 40, 0)
    doc.text(recLines, M + 8, y)
    y += recLines.length * 5.8 + 10
  }

  // ════════════════════════════════════════════════════════════
  // 2. SEO ANALYSIS
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('SEO Analysis')

  const catLabels: Record<string, string> = { metaInformation: 'Meta Information', pageQuality: 'Page Quality', pageStructure: 'Page Structure', linkStructure: 'Link Structure', serverTechnical: 'Server & Technical', externalFactors: 'External Factors' }

  subHead('Category Overview')
  y += 4
  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    np(12)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(catLabels[k] ?? k, M, y + 4)
    const barX = M + 52
    const barW = 98
    doc.setFillColor(230, 230, 235); doc.rect(barX, y + 1, barW, 5, 'F')
    doc.setFillColor(...scol(cat.score)); doc.rect(barX, y + 1, barW * cat.score / 100, 5, 'F')
    // Percentage label outside/after the bar
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(cat.score))
    doc.text(`${cat.score}%`, barX + barW + 4, y + 5)
    y += 11
  })
  y += 6

  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    np(16)
    subHead(`${catLabels[k] ?? k} — ${cat.score}%`)
    y += 2
    cat.checks.forEach((c: { label: string; status: string; detail: string; criticality: string }) => {
      np(16)
      const dotCol: [number,number,number] = c.status === 'pass' ? GREEN : c.status === 'fail' ? RED : AMBER
      const critMap: Record<string, string> = { critical: 'Critical', important: 'Important', somewhat: 'Somewhat', nice: 'Nice to have' }
      const critColMap: Record<string, [number,number,number]> = { critical: RED, important: AMBER, somewhat: BLUE, nice: LIGHT_GREY }
      // Dot aligned with heading text
      doc.setFillColor(...dotCol); doc.circle(M + 2.5, y + 3.5, 2, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(c.label, M + 7, y + 5)
      // Criticality pill
      const critLabel = critMap[c.criticality] ?? ''
      const critColor = critColMap[c.criticality] ?? LIGHT_GREY
      if (critLabel) {
        const ctw = doc.getTextWidth(critLabel) + 9
        pill(critLabel, critColor, W - RT - ctw, y + 5)
      }
      y += 8
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const dLines = doc.splitTextToSize(c.detail, CW - 10) as string[]
      np(dLines.length * 5 + 4)
      doc.text(dLines, M + 7, y); y += dLines.length * 5 + 6
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
    y += 2
    cat.subScores.forEach((s: { label: string; score: number; max: number; note: string }) => {
      np(16)
      const sCol: [number,number,number] = s.score >= 2 ? GREEN : s.score >= 1 ? AMBER : RED
      const scoreLabel = `${s.score}/${s.max}`
      const spw = pill(scoreLabel, sCol, M, y + 4)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(s.label, M + spw, y + 4)
      y += 8
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const nLines = doc.splitTextToSize(s.note, CW - 14) as string[]
      np(nLines.length * 5 + 3)
      doc.text(nLines, M + 4, y); y += nLines.length * 5 + 6
    })
    y += 3
  })

  // ════════════════════════════════════════════════════════════
  // 4. PRIORITY FIXES
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Priority Fixes')

  r.priorityFixes.forEach(f => {
    np(32)
    doc.setFillColor(...YELLOW); doc.circle(M + 5, y + 5, 5, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(String(f.rank), M + 3.5, y + 6.5)
    const titleLines = doc.splitTextToSize(f.title, CW - 14) as string[]
    doc.setFontSize(11); doc.text(titleLines, M + 13, y + 6)
    y += titleLines.length * 6 + 8  // more space before Problem

    labelVal('Problem:', f.problem, 4)
    labelVal('Fix:', f.fix, 4)
    np(12)

    // Effort pill in coloured box
    const efCol: [number,number,number] = f.difficulty === 'Easy' ? GREEN : f.difficulty === 'Medium' ? AMBER : RED
    const efLabel = `${f.difficulty} fix`
    const efW = pill(efLabel, efCol, M + 4, y + 3.5)

    // Uplift and timeline — clamp to page width
    const remainW = CW - efW - 4
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLUE)
    const upliftText = (doc.splitTextToSize(f.uplift, remainW * 0.58) as string[])[0]
    doc.text(upliftText, M + 4 + efW + 2, y + 3.5)

    doc.setTextColor(...GREY)
    const timelineText = (doc.splitTextToSize(f.timeline, remainW * 0.36) as string[])[0]
    doc.text(timelineText, W - RT - doc.getTextWidth(timelineText), y + 3.5)

    y += 10
    divider()
  })

  // ════════════════════════════════════════════════════════════
  // 5. POSITIONING & COMPETITOR ANALYSIS
  // ════════════════════════════════════════════════════════════
  addPage()
  secHeader('Positioning & Competitor Analysis')
  y += 4  // extra space after section header
  const ca = r.competitorAnalysis

  subHead('Hook Type & Approach')
  y += 2
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
  y += 2
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
  const swData = r.strengthsWeaknesses
  autoTable(doc, {
    startY: y,
    head: [['Strengths', 'Weaknesses', 'Missed Opportunities']],
    body: (() => {
      const max = Math.max(swData.strengths.length, swData.weaknesses.length, swData.missedOpportunities.length)
      return Array.from({ length: max }, (_, i) => [swData.strengths[i] ?? '', swData.weaknesses[i] ?? '', swData.missedOpportunities[i] ?? ''])
    })(),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 3.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW as [number,number,number], textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: CW / 3 }, 1: { cellWidth: CW / 3 }, 2: { cellWidth: CW / 3 } },
    didParseCell: (d) => {
      if (d.section === 'head') {
        if (d.column.index === 0) d.cell.styles.textColor = [20, 120, 60] as [number,number,number]
        if (d.column.index === 1) d.cell.styles.textColor = [180, 40, 40] as [number,number,number]
        if (d.column.index === 2) d.cell.styles.textColor = [20, 80, 180] as [number,number,number]
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
    doc.setFillColor(...SIDEBAR); doc.rect(0, 0, STRIPE_W, 297, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    if (p > 1) {
      doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.2)
      doc.line(M, 286, W - RT, 286)
      doc.setTextColor(...GREY)
      doc.text(`Audit Machine — BEAL Creative — ${audit.url}`, M, 290)
      doc.text(`Page ${p} of ${pages}`, W - RT, 290, { align: 'right' })
    }
  }

  doc.save(`audit-machine-${audit.url.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${Date.now()}.pdf`)
}
