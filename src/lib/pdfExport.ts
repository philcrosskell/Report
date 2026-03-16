import { Audit } from './types'

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BLACK:      [number,number,number] = [20,  20,  20 ]
const DARK:       [number,number,number] = [40,  40,  40 ]
const GREY:       [number,number,number] = [100, 100, 110]
const LIGHT_GREY: [number,number,number] = [180, 180, 190]
const BG_GREY:    [number,number,number] = [248, 248, 250]
const WHITE:      [number,number,number] = [255, 255, 255]
const YELLOW:     [number,number,number] = [255, 229, 0  ]
const Y_PALE:     [number,number,number] = [255, 249, 180]
const GREEN:      [number,number,number] = [34,  197, 94 ]
const AMBER:      [number,number,number] = [245, 158, 11 ]
const RED:        [number,number,number] = [239, 68,  68 ]
const BLUE:       [number,number,number] = [59,  130, 246]

const SW   = 5        // left stripe width (mm)
const M    = 24       // left content margin (mm)
const RT   = 16       // right trim (mm)
const W    = 210      // A4 width (mm)
const PH   = 297      // A4 height (mm)
const CW   = W - M - RT  // content width (mm)
const LH   = 6        // standard line height (mm)
const PG   = 6        // paragraph gap after text blocks (mm)

const COVER_BAND = 84 // yellow cover band height (mm)

function scol(n: number): [number,number,number] {
  return n >= 70 ? GREEN : n >= 40 ? AMBER : RED
}

// Protect common abbreviations from being treated as sentence-ends
function abbrevProtect(t: string): string {
  return t
    .replace(/\be\.g\./g, 'e\x00g\x00').replace(/\bi\.e\./g, 'i\x00e\x00')
    .replace(/\betc\./g, 'etc\x00').replace(/\bvs\./g, 'vs\x00')
    .replace(/\bDr\./g, 'Dr\x00').replace(/\bMr\./g, 'Mr\x00')
    .replace(/\bMrs\./g, 'Mrs\x00').replace(/\bNo\./g, 'No\x00')
}
function splitSentences(text: string): string[] {
  const p = abbrevProtect(text)
  const s = p.match(/[^.!?]+[.!?]+[\s]*/g) ?? [p]
  return s.map(x => x.trim().replace(/\x00/g, '.')).filter(Boolean)
}

export async function exportPDF(audit: Audit): Promise<void> {
  const { default: jsPDF }     = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const r   = audit.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 0

  // ─── Core helpers ──────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function lastY() { return (doc as any).lastAutoTable.finalY + 8 }

  // Add a new interior page with yellow stripe + thin top rule
  function addPage() {
    doc.addPage()
    doc.setFillColor(...WHITE);  doc.rect(0, 0, W, PH, 'F')
    doc.setFillColor(...YELLOW); doc.rect(0, 0, SW, PH, 'F')
    doc.setFillColor(...YELLOW); doc.rect(SW, 0, W - SW, 2.5, 'F')
    y = 22
  }

  // Start new page if less than `need` mm of space remains
  function np(need = 24) { if (y + need > 273) addPage() }

  // Force new page if less than minSpace remains — prevents sub-sections
  // from orphaning their heading at the bottom of a page
  function sectionBreak(minSpace = 70) {
    if (y > PH - 24 - minSpace) addPage()
  }

  // ─── Text & layout primitives ──────────────────────────────────────────────

  function secHeader(title: string) {
    np(22)
    doc.setFillColor(...YELLOW); doc.rect(M, y, CW, 12, 'F')
    doc.setTextColor(...BLACK); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), M + 5, y + 8.5)
    y += 19
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  }

  function subHead(title: string) {
    np(18)
    doc.setFillColor(...BG_GREY); doc.rect(M, y - 1, CW, 11, 'F')
    doc.setFillColor(...YELLOW);  doc.rect(M, y - 1, 4, 11, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(title, M + 8, y + 6.5)
    y += 16
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  }

  function bodyText(text: string, indent = 0, color: [number,number,number] = DARK, size = 10) {
    doc.setFontSize(size); doc.setFont('helvetica', 'normal'); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(text, CW - indent) as string[]
    np(lines.length * LH + PG)
    doc.text(lines, M + indent, y)
    y += lines.length * LH + PG
  }

  function smartBody(text: string, indent = 0, color: [number,number,number] = DARK) {
    bodyText(splitSentences(text).join(' '), indent, color)
  }

  function divider(gap = 6) {
    np(8)
    doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.2)
    doc.line(M, y, M + CW, y)
    y += gap
  }

  // Draws a coloured pill badge — returns the pill width for layout
  function pill(label: string, bg: [number,number,number], x: number, py: number): number {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    const tw = doc.getTextWidth(label)
    const pw = tw + 8; const ph = 5.5
    doc.setFillColor(...bg); doc.roundedRect(x, py - 4, pw, ph, 1.5, 1.5, 'F')
    doc.setTextColor(...WHITE); doc.text(label, x + 4, py - 0.2)
    doc.setFont('helvetica', 'normal')
    return pw + 3
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════════════════════════

  // Full-width yellow band at top of page
  doc.setFillColor(...YELLOW); doc.rect(0, 0, W, COVER_BAND, 'F')
  // White body below band
  doc.setFillColor(...WHITE);  doc.rect(0, COVER_BAND, W, PH - COVER_BAND, 'F')
  // Yellow left stripe runs full height (merges with band above, visible accent below)
  doc.setFillColor(...YELLOW); doc.rect(0, 0, SW, PH, 'F')

  // ── Branding in yellow band ──────────────────────────────────────────────

  // Logo mark — small black rounded square with yellow cutout dot
  doc.setFillColor(...BLACK); doc.roundedRect(M, 18, 7, 7, 1.2, 1.2, 'F')
  doc.setFillColor(...YELLOW); doc.circle(M + 3.5, 21.5, 1.8, 'F')

  // Wordmark
  doc.setFontSize(24); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text('BEAL', M + 12, 27)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 50, 0)
  doc.text('Creative.', M + 12, 34)

  // Thin dark rule across band
  doc.setDrawColor(...BLACK); doc.setLineWidth(0.4)
  doc.line(M, 42, W - RT, 42)

  // "PAGE AUDIT REPORT" label
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  doc.text('PAGE AUDIT REPORT', M, 50)

  // Report title — large type in band
  const titleText  = audit.label || r.overview.pageType || 'Page Audit'
  const titleLines = doc.splitTextToSize(titleText, CW) as string[]
  doc.setFontSize(26); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
  titleLines.slice(0, 2).forEach((l, i) => doc.text(l, M, 62 + i * 12))
  const titleEndY = 62 + Math.min(titleLines.length, 2) * 12

  // URL — bottom of band
  const urlY = Math.max(titleEndY + 5, COVER_BAND - 10)
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 50, 0)
  if (urlY < COVER_BAND - 2) doc.text(audit.url, M, urlY)

  // ── Score cards in white area ──────────────────────────────────────────────
  const cardTopY = COVER_BAND + 10
  const cardW    = (CW - 12) / 4   // 4 cards with 4mm gaps
  const cardH    = 28

  const scoreDefs = [
    { label: 'SEO Score', num: r.scores.seo,     grade: null           },
    { label: 'LP Score',  num: r.scores.lp,       grade: null          },
    { label: 'Overall',   num: r.scores.overall,   grade: null         },
    { label: 'Grade',     num: null,               grade: r.scores.grade },
  ]
  scoreDefs.forEach((c, i) => {
    const cx  = M + i * (cardW + 4)
    const col = c.num !== null ? scol(c.num) : scol(r.scores.overall)
    doc.setFillColor(...BG_GREY); doc.roundedRect(cx, cardTopY, cardW, cardH, 2.5, 2.5, 'F')
    doc.setFillColor(...col);     doc.roundedRect(cx, cardTopY, cardW, 3.5, 1.5, 1.5, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    doc.text(c.label, cx + cardW / 2, cardTopY + 12, { align: 'center' })
    const val = c.num !== null ? String(c.num) : (c.grade ?? '')
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...col)
    doc.text(val, cx + cardW / 2, cardTopY + 23, { align: 'center' })
  })

  // ── Stats strip ────────────────────────────────────────────────────────────
  const statsTopY = cardTopY + cardH + 8
  doc.setFillColor(...BG_GREY); doc.rect(M, statsTopY, CW, 20, 'F')
  const statsData: [string, string][] = [
    ['Type',       r.overview.pageType              ],
    ['Words',      String(r.overview.wordCount)      ],
    ['Response',   r.overview.responseTime           ],
    ['Int. Links', String(r.overview.internalLinks)  ],
    ['File Size',  r.overview.fileSize               ],
  ]
  const colWidths = [40, 20, 28, 24, 24]
  let sx = M + 5
  statsData.forEach(([lbl, val], i) => {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    doc.text(lbl, sx, statsTopY + 6)
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
    doc.text((doc.splitTextToSize(val, colWidths[i] - 3) as string[])[0], sx, statsTopY + 14)
    if (i < statsData.length - 1) {
      doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.2)
      doc.line(sx + colWidths[i] - 2, statsTopY + 3, sx + colWidths[i] - 2, statsTopY + 17)
    }
    sx += colWidths[i]
  })

  // ── Summary ────────────────────────────────────────────────────────────────
  const sumTopY = statsTopY + 26
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  const sumLines = doc.splitTextToSize(r.overview.summary, CW) as string[]
  if (sumTopY + sumLines.length * LH < 265) {
    doc.text(sumLines, M, sumTopY)
  }

  // ── Cover footer ───────────────────────────────────────────────────────────
  doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.3); doc.line(M, 272, W - RT, 272)
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
  doc.text('Prepared by BEAL Creative — Audit Machine', M, 278)
  doc.text(
    new Date(audit.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }),
    W - RT, 278, { align: 'right' }
  )

  // ════════════════════════════════════════════════════════════════════════════
  // 1. GAP ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Gap Analysis')
  const g = r.gapAnalysis

  if (g) {
    np(36)

    // Score comparison cards
    const sbW = 50, sbH = 28
    const scoreBoxDefs = [
      { l: 'Current Score', v: g.beforeScore, grade: g.beforeGrade, col: scol(g.beforeScore) },
      { l: 'After Fixes',   v: g.afterScore,  grade: g.afterGrade,  col: GREEN              },
    ]
    scoreBoxDefs.forEach((b, i) => {
      const bx = M + i * (sbW + 6)
      doc.setFillColor(...BG_GREY); doc.roundedRect(bx, y, sbW, sbH, 2.5, 2.5, 'F')
      doc.setFillColor(...b.col);   doc.roundedRect(bx, y, sbW, 3.5, 1.5, 1.5, 'F')
      doc.setFontSize(8); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal')
      doc.text(b.l, bx + 5, y + 12)
      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...b.col)
      doc.text(`${b.v}`, bx + 5, y + 23)
      const nw = doc.getTextWidth(`${b.v}`)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      doc.text(`(${b.grade})`, bx + 5 + nw + 2, y + 23)
    })

    // Uplift card
    const ux = M + 2 * (sbW + 6)
    doc.setFillColor(220, 252, 231); doc.roundedRect(ux, y, 48, sbH, 2.5, 2.5, 'F')
    doc.setFillColor(...GREEN);       doc.roundedRect(ux, y, 48, 3.5, 1.5, 1.5, 'F')
    doc.setFontSize(8); doc.setTextColor(...GREEN); doc.setFont('helvetica', 'normal')
    doc.text('Potential Uplift', ux + 4, y + 12)
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREEN)
    const upliftStr = `+${g.afterScore - g.beforeScore}`
    doc.text(upliftStr, ux + 4, y + 23)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal')
    doc.text('pts', ux + 4 + doc.getTextWidth(upliftStr) + 2, y + 23)
    y += sbH + 12

    // Executive summary callout box
    np(34)
    const eLines = doc.splitTextToSize(splitSentences(g.executiveSummary).join(' '), CW - 18) as string[]
    const eH     = eLines.length * LH + 20
    doc.setFillColor(...BG_GREY); doc.roundedRect(M, y, CW, eH, 2.5, 2.5, 'F')
    doc.setFillColor(...YELLOW);  doc.rect(M, y, 4, eH, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREY)
    doc.text('EXECUTIVE SUMMARY', M + 9, y + 8)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(eLines, M + 9, y + 15)
    y += eH + 12

    // Critical Issues — card-based layout
    sectionBreak(60)
    subHead('Critical Issues')
    y += 2

    g.criticalIssues.forEach((item, i) => {
      const efCol: [number,number,number] = item.effort === 'Easy' ? GREEN : item.effort === 'Medium' ? AMBER : RED
      const issueLines  = doc.splitTextToSize(`${i + 1}.  ${item.issue}`, CW - 30) as string[]
      const impactLines = doc.splitTextToSize(item.impact, CW - 16) as string[]
      const fixLines    = doc.splitTextToSize(item.fix,    CW - 16) as string[]
      const cardH       = issueLines.length * 7 + impactLines.length * LH + fixLines.length * LH + 38

      np(cardH + 6)
      doc.setFillColor(...BG_GREY); doc.roundedRect(M, y, CW, cardH, 2.5, 2.5, 'F')
      doc.setFillColor(...efCol);   doc.roundedRect(M, y, 4, cardH, 1, 1, 'F')

      // Title row
      doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(issueLines, M + 9, y + 9)
      const efLabel = `${item.effort} effort`
      const etw     = doc.getTextWidth(efLabel) + 9
      pill(efLabel, efCol, W - RT - etw, y + 9)

      let cy = y + issueLines.length * 7 + 10

      // Impact
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREY)
      doc.text('IMPACT', M + 9, cy)
      cy += 6
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
      doc.text(impactLines, M + 9, cy)
      cy += impactLines.length * LH + 5

      // Fix
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...efCol)
      doc.text('FIX', M + 9, cy)
      cy += 6
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
      doc.text(fixLines, M + 9, cy)

      y += cardH + 8
    })

    y += 4
    sectionBreak(50)
    subHead('Quick Wins')
    y += 2

    g.quickWins.forEach((item, i) => {
      np(26)
      doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      const wLines = doc.splitTextToSize(`${i + 1}.  ${item.win}`, CW - 36) as string[]
      doc.text(wLines, M + 2, y)
      const teTw = doc.getTextWidth(item.timeEstimate) + 9
      pill(item.timeEstimate, BLUE, W - RT - teTw, y + 1)
      y += wLines.length * LH + 4
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      smartBody(item.action, 5)
      y += 4
      divider(4)
    })

    y += 4
    sectionBreak(40)
    subHead('Positioning Gap')
    y += 2
    smartBody(g.positioningGap, 0, GREY)
    y += 4

    // Top recommendation callout
    np(38)
    const recLines = doc.splitTextToSize(g.topRecommendation, CW - 18) as string[]
    const recH     = recLines.length * LH + 24
    doc.setFillColor(...Y_PALE); doc.roundedRect(M, y, CW, recH, 2.5, 2.5, 'F')
    doc.setFillColor(...YELLOW); doc.rect(M, y, 4, recH, 'F')
    doc.setFillColor(...YELLOW); doc.rect(M + 4, y, CW - 4, 12, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text('★  TOP RECOMMENDATION', M + 9, y + 8.5)
    y += 15
    doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(70, 45, 0)
    doc.text(recLines, M + 9, y)
    y += recLines.length * LH + 10
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. SEO ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('SEO Analysis')

  const catLabels: Record<string, string> = {
    metaInformation: 'Meta Information',
    pageQuality:     'Page Quality',
    pageStructure:   'Page Structure',
    linkStructure:   'Link Structure',
    serverTechnical: 'Server & Technical',
    externalFactors: 'External Factors',
  }

  subHead('Category Overview')
  y += 5

  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    np(15)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(catLabels[k] ?? k, M, y + 4.5)
    const barX = M + 56, barW = 96
    doc.setFillColor(225, 225, 232); doc.rect(barX, y + 1.5, barW, 6, 'F')
    doc.setFillColor(...scol(cat.score)); doc.rect(barX, y + 1.5, barW * cat.score / 100, 6, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...scol(cat.score))
    doc.text(`${cat.score}%`, barX + barW + 4, y + 6)
    y += 14
  })

  y += 8

  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    sectionBreak(55)
    subHead(`${catLabels[k] ?? k} — ${cat.score}%`)
    y += 3

    cat.checks.forEach((c: { label: string; status: string; detail: string; criticality: string }) => {
      np(20)
      const dotCol: [number,number,number]           = c.status === 'pass' ? GREEN : c.status === 'fail' ? RED : AMBER
      const critMap: Record<string, string>          = { critical: 'Critical', important: 'Important', somewhat: 'Somewhat', nice: 'Nice to have' }
      const critColMap: Record<string, [number,number,number]> = { critical: RED, important: AMBER, somewhat: BLUE, nice: LIGHT_GREY }

      doc.setFillColor(...dotCol); doc.circle(M + 3, y + 4, 2.2, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(c.label, M + 8, y + 6)

      const critLabel = critMap[c.criticality] ?? ''
      const critColor = critColMap[c.criticality] ?? LIGHT_GREY
      if (critLabel) {
        const ctw = doc.getTextWidth(critLabel) + 9
        pill(critLabel, critColor, W - RT - ctw, y + 6)
      }
      y += 10

      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const dLines = doc.splitTextToSize(c.detail, CW - 12) as string[]
      np(dLines.length * 5.5 + PG)
      doc.text(dLines, M + 8, y)
      y += dLines.length * 5.5 + PG + 2
    })

    y += 5
  })

  // ════════════════════════════════════════════════════════════════════════════
  // 3. LP SCORING
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Landing Page Scoring')

  const lpLabels: Record<string, string> = {
    messageClarity:      'Message & Value Clarity',
    trustSocialProof:    'Trust & Social Proof',
    ctaForms:            'CTA & Forms',
    technicalPerformance:'Technical Performance',
    visualUX:            'Visual Design & UX',
  }

  autoTable(doc, {
    startY: y,
    head:   [['Category', 'Score', '%', 'Assessment']],
    body:   Object.entries(r.lpScoring).map(([k, c]) => [lpLabels[k] ?? k, `${c.score}/${c.maxScore}`, `${c.percentage}%`, c.assessment]),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 4.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: 56 }, 1: { cellWidth: 22 }, 2: { cellWidth: 16 }, 3: { cellWidth: CW - 94 } },
  })
  y = lastY()
  y += 4

  Object.entries(r.lpScoring).forEach(([k, cat]) => {
    sectionBreak(55)
    subHead(`${lpLabels[k] ?? k} — ${cat.score}/${cat.maxScore}`)
    y += 3

    cat.subScores.forEach((s: { label: string; score: number; max: number; note: string }) => {
      np(20)
      const sCol: [number,number,number] = s.score >= 2 ? GREEN : s.score >= 1 ? AMBER : RED
      const spw = pill(`${s.score}/${s.max}`, sCol, M, y + 5)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
      doc.text(s.label, M + spw, y + 5)
      y += 10
      doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      const nLines = doc.splitTextToSize(s.note, CW - 14) as string[]
      np(nLines.length * 5.5 + PG)
      doc.text(nLines, M + 5, y)
      y += nLines.length * 5.5 + PG + 2
    })

    y += 5
  })

  // ════════════════════════════════════════════════════════════════════════════
  // 4. PRIORITY FIXES
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Priority Fixes')
  y += 2

  r.priorityFixes.forEach(f => {
    const efCol: [number,number,number] = f.difficulty === 'Easy' ? GREEN : f.difficulty === 'Medium' ? AMBER : RED

    const titleLines   = doc.splitTextToSize(f.title,   CW - 22) as string[]
    const problemLines = doc.splitTextToSize(f.problem, CW - 16) as string[]
    const fixLines     = doc.splitTextToSize(f.fix,     CW - 16) as string[]
    const cardH        = titleLines.length * 7.5 + problemLines.length * LH + fixLines.length * LH + 44

    np(cardH + 8)

    // Card background
    doc.setFillColor(...BG_GREY); doc.roundedRect(M, y, CW, cardH, 3, 3, 'F')
    // Coloured left border
    doc.setFillColor(...efCol); doc.roundedRect(M, y, 5, cardH, 2, 2, 'F')
    // Rank circle
    doc.setFillColor(...YELLOW); doc.circle(M + 17, y + 12, 8, 'F')
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(String(f.rank), M + 17, y + 15.5, { align: 'center' })

    // Title
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK)
    doc.text(titleLines, M + 28, y + 10)

    let cy = y + Math.max(titleLines.length * 7.5 + 10, 28)

    // Problem block
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREY)
    doc.text('PROBLEM', M + 9, cy)
    cy += 6
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(problemLines, M + 9, cy)
    cy += problemLines.length * LH + 6

    // Fix block
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...efCol)
    doc.text('FIX', M + 9, cy)
    cy += 6
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
    doc.text(fixLines, M + 9, cy)
    cy += fixLines.length * LH + 6

    // Footer metadata strip inside card
    const efLabel = `${f.difficulty} fix`
    const efW     = pill(efLabel, efCol, M + 9, cy + 4)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLUE)
    const upliftTrunc = (doc.splitTextToSize(f.uplift, CW * 0.5) as string[])[0]
    doc.text(upliftTrunc, M + 9 + efW + 3, cy + 4)
    doc.setTextColor(...GREY)
    doc.text(f.timeline, W - RT - doc.getTextWidth(f.timeline), cy + 4)

    y += cardH + 10
  })

  // ════════════════════════════════════════════════════════════════════════════
  // 5. POSITIONING & COMPETITOR ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Positioning & Competitor Analysis')
  y += 5

  const ca = r.competitorAnalysis

  subHead('Hook Type & Approach')
  y += 3

  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Hook Type: ', M, y)
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...AMBER)
  doc.text(ca.hookType, M + doc.getTextWidth('Hook Type: '), y)
  y += 9
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK)
  smartBody(ca.hookAnalysis, 0, GREY)
  y += 4

  const posCol: [number,number,number] = ca.positioningStrength === 'Strong' ? GREEN : ca.positioningStrength === 'Moderate' ? AMBER : RED
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK)
  doc.text('Positioning Strength: ', M, y)
  doc.setTextColor(...posCol)
  doc.text(ca.positioningStrength, M + doc.getTextWidth('Positioning Strength: '), y)
  y += 9
  smartBody(ca.positioningNote, 0, GREY)
  y += PG

  sectionBreak(55)
  subHead('Buyer Anxieties')
  y += 3

  ca.buyerAnxieties.forEach(b => {
    np(18)
    const bCol: [number,number,number] = b.addressed ? GREEN : RED
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...bCol)
    doc.text(b.addressed ? '✓' : '✗', M + 2, y + 4)
    doc.setFontSize(10); doc.setTextColor(...BLACK)
    doc.text(b.anxiety, M + 10, y + 4)
    y += 8
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
    const nLines = doc.splitTextToSize(b.note, CW - 14) as string[]
    np(nLines.length * 5.5 + PG)
    doc.text(nLines, M + 10, y)
    y += nLines.length * 5.5 + PG
  })

  y += 4

  autoTable(doc, {
    startY: y,
    head:   [['Table Stakes — Everyone Claims This', 'White Space — Unclaimed Opportunities']],
    body: (() => {
      const max = Math.max(ca.tableStakes.length, ca.whiteSpace.length)
      return Array.from({ length: max }, (_, i) => [
        ca.tableStakes[i] ?? '',
        ca.whiteSpace[i] ? `${ca.whiteSpace[i].opportunity}: ${ca.whiteSpace[i].rationale}` : '',
      ])
    })(),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 4.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: CW / 2 }, 1: { cellWidth: CW / 2 } },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════════════════════
  // 6. STRENGTHS & GAPS — always on its own page
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Strengths, Weaknesses & Opportunities')

  const sw = r.strengthsWeaknesses
  autoTable(doc, {
    startY: y,
    head:   [['Strengths', 'Weaknesses', 'Missed Opportunities']],
    body: (() => {
      const max = Math.max(sw.strengths.length, sw.weaknesses.length, sw.missedOpportunities.length)
      return Array.from({ length: max }, (_, i) => [sw.strengths[i] ?? '', sw.weaknesses[i] ?? '', sw.missedOpportunities[i] ?? ''])
    })(),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 4.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW as [number,number,number], textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: CW / 3 }, 1: { cellWidth: CW / 3 }, 2: { cellWidth: CW / 3 } },
    didParseCell: (d) => {
      if (d.section === 'head') {
        if (d.column.index === 0) d.cell.styles.textColor = [20, 120, 60]  as [number,number,number]
        if (d.column.index === 1) d.cell.styles.textColor = [180, 40, 40]  as [number,number,number]
        if (d.column.index === 2) d.cell.styles.textColor = [20, 80, 180]  as [number,number,number]
      }
    },
  })
  y = lastY()

  // ════════════════════════════════════════════════════════════════════════════
  // 7. RECOMMENDATIONS — always on its own page
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Recommendations')

  autoTable(doc, {
    startY: y,
    head:   [['Priority', 'Area', 'Action']],
    body:   r.recommendations.map(rec => [rec.priority, rec.area, rec.action]),
    margin: { left: M, right: RT },
    styles: { fontSize: 10, cellPadding: 4.5, overflow: 'linebreak', textColor: [40, 40, 40] },
    headStyles: { fillColor: YELLOW, textColor: BLACK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_GREY },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 34 }, 2: { cellWidth: CW - 56 } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 0) {
        const p = String(d.cell.raw)
        d.cell.styles.textColor = p === 'High' ? [200, 40, 40] : p === 'Medium' ? [180, 110, 0] : [30, 80, 180]
        d.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // ════════════════════════════════════════════════════════════════════════════
  // FOOTER — redraw stripe + page numbers on every page
  // ════════════════════════════════════════════════════════════════════════════
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    // Yellow left stripe (on cover it merges seamlessly with the top band)
    doc.setFillColor(...YELLOW); doc.rect(0, 0, SW, PH, 'F')
    if (p > 1) {
      // Thin yellow top rule on interior pages
      doc.setFillColor(...YELLOW); doc.rect(SW, 0, W - SW, 2.5, 'F')
      // Footer line + text
      doc.setDrawColor(...LIGHT_GREY); doc.setLineWidth(0.2)
      doc.line(M, 286, W - RT, 286)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...GREY)
      doc.text(`Audit Machine — BEAL Creative — ${audit.url}`, M, 290)
      doc.text(`Page ${p} of ${pages}`, W - RT, 290, { align: 'right' })
    }
  }

  doc.save(`audit-machine-${audit.url.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${Date.now()}.pdf`)
}
