import { SavedCompetitorReport } from './types'
 
type RGB = [number, number, number]
 
// ─── Design tokens ──────────────────────────────────────────────────────────
const DARK:       RGB = [7,   9,   15 ]
const DARK_TEXT:  RGB = [14,  17,  32 ]
const BODY:       RGB = [74,  82,  128]
const MUTED:      RGB = [139, 144, 170]
const LABEL:      RGB = [176, 181, 204]
const BORDER:     RGB = [236, 238, 247]
const LIGHT_BG:   RGB = [249, 250, 251]
const LIGHT_BG2:  RGB = [247, 248, 253]
const WHITE:      RGB = [255, 255, 255]
const YELLOW:     RGB = [255, 230, 0  ]
const INDIGO:     RGB = [99,  102, 241]
const INDIGO_D:   RGB = [45,  31,  163]
 
const INDIGO_L:   RGB = [238, 237, 254]
const PURPLE:     RGB = [139, 92,  246]
const CORAL:      RGB = [239, 68,  68 ]
const AMBER:      RGB = [245, 158, 11 ]
 
const GREEN:      RGB = [16,  185, 129]
const GREEN_D:    RGB = [5,   150, 105]
const MINT:       RGB = [6,   182, 212]
const PINK:       RGB = [236, 72,  153]
const BLUE:       RGB = [59,  130, 246]
const TEAL:       RGB = [20,  184, 166]
 
const TAG_RED_BG: RGB = [254, 226, 226]; const TAG_RED_FG: RGB = [185, 28,  28 ]
const TAG_AMB_BG: RGB = [254, 243, 199]; const TAG_AMB_FG: RGB = [146, 64,  14 ]
const TAG_GRN_BG: RGB = [209, 250, 229]; const TAG_GRN_FG: RGB = [6,   95,  70 ]
 
// ─── Layout ──────────────────────────────────────────────────────────────────
const W  = 210
const PH = 297
const L  = 20
const RM = 16
const R  = W - RM
const CW = R - L
const LH = 5.5
const PG = 5
 
function lerpRGB(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(c1[0] + t * (c2[0] - c1[0])),
    Math.round(c1[1] + t * (c2[1] - c1[1])),
    Math.round(c1[2] + t * (c2[2] - c1[2])),
  ]
}
 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function exportCompetitorPDF(saved: SavedCompetitorReport, _brandLogo = ''): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const r   = saved.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 0
 
  const sf = (col: RGB) => doc.setFillColor(col[0], col[1], col[2])
  const st = (col: RGB) => doc.setTextColor(col[0], col[1], col[2])
  const sd = (col: RGB) => doc.setDrawColor(col[0], col[1], col[2])
 
  function gradStrip(c1: RGB, c2: RGB, yTop: number, h: number) {
    const steps = 30; const sw = W / steps
    for (let i = 0; i < steps; i++) {
      const col = lerpRGB(c1, c2, i / steps)
      doc.setFillColor(col[0], col[1], col[2])
      doc.rect(i * sw, yTop, sw + 0.2, h, 'F')
    }
  }
 
  function drawTag(text: string, bg: RGB, fg: RGB, px: number, py: number, sz = 7.5): number {
    doc.setFontSize(sz); doc.setFont('helvetica', 'bold')
    const tw   = doc.getTextWidth(text)
    const padX = 5; const padY = 2.5
    const tagW = tw + padX * 2; const tagH = sz * 0.4 + padY * 2
    sf(bg); doc.roundedRect(px, py - tagH + 2, tagW, tagH, tagH / 2, tagH / 2, 'F')
    st(fg); doc.text(text, px + padX, py + 0.3)
    return tagW + 3
  }
 
  function hline(yPos: number, col: RGB = BORDER, lw = 0.6) {
    sd(col); doc.setLineWidth(lw); doc.line(L, yPos, R, yPos)
  }
 
  function addPage() {
    doc.addPage(); sf(WHITE); doc.rect(0, 0, W, PH, 'F'); y = 0
  }
 
  function np(need = 24) { if (y + need > 275) addPage() }
  function sectionBreak(minSpace = 60) { if (y > PH - 24 - minSpace) addPage() }
 
  function secHeader(title: string, c1: RGB, c2: RGB) {
    const stripH = 5; const hdrH = 60
    gradStrip(c1, c2, 0, stripH)
    sf(DARK); doc.rect(0, stripH, W, hdrH, 'F')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(160, 163, 200)
    doc.text('SECTION', L, stripH + 18)
    doc.setFontSize(22); doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(title, L, stripH + 48)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 105, 140)
    doc.text(r.businessName, R, stripH + 50, { align: 'right' })
    y = stripH + hdrH + 14
  }
 
  function subHead(text: string, dotCol: RGB) {
    np(22); y += 10
    sf(dotCol); doc.circle(L + 3.5, y - 3, 3, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(text, L + 12, y)
    hline(y + 6, BORDER, 1.2)
    y += 22
  }
 
  function bodyText(text: string, indent = 0, col: RGB = BODY, sz = 10) {
    doc.setFontSize(sz); doc.setFont('helvetica', 'normal'); st(col)
    const lines = doc.splitTextToSize(text, CW - indent) as string[]
    np(lines.length * LH + PG)
    doc.text(lines, L + indent, y)
    y += lines.length * LH + PG
  }
 
  function tblHeader(cols: number[], headers: string[], colBgs?: RGB[]) {
    const rh = 22; let x = L
    headers.forEach((h, i) => {
      const bg = colBgs?.[i] ?? DARK
      sf(bg); doc.rect(x, y, cols[i], rh, 'F')
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); st(WHITE)
      doc.text(h, x + 8, y + 14)
      x += cols[i]
    })
    y += rh
  }
 
  function tblRow(cols: number[], cells: string[], even = false, cellCols?: (RGB | null)[]) {
    const rowLH = 5; let maxLines = 1
    cells.forEach((cell, i) => {
      const l = (doc.splitTextToSize(cell, cols[i] - 16) as string[]).length
      maxLines = Math.max(maxLines, l)
    })
    const rh = maxLines * rowLH + 14
    np(rh + 4)
    const bg: RGB = even ? [249, 250, 252] : WHITE
    let x = L
    cells.forEach((cell, i) => {
      sf(bg); doc.rect(x, y, cols[i], rh, 'F')
      const col: RGB = cellCols?.[i] ?? BODY
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); st(col)
      const lines = doc.splitTextToSize(cell, cols[i] - 16) as string[]
      doc.text(lines, x + 8, y + 10)
      x += cols[i]
    })
    sd(BORDER); doc.setLineWidth(0.5); doc.line(L, y + rh, R, y + rh)
    y += rh
  }
 
  function topRecBox(text: string) {
    const lines = doc.splitTextToSize(text, CW - 20) as string[]
    const h = lines.length * LH + 40
    np(h + 10)
    sf(INDIGO); doc.roundedRect(L, y, CW, 20, 4, 4, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); st(WHITE)
    doc.text('★  KEY RECOMMENDATION', L + 10, y + 13)
    sf(INDIGO_L); doc.roundedRect(L, y + 20, CW, h - 20, 4, 4, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); st(INDIGO_D)
    doc.text(lines, L + 10, y + 34)
    y += h + 12
  }
 
  // ════════════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════════════════════════
  gradStrip(INDIGO, TEAL, 0, 5)
  sf(DARK); doc.rect(0, 5, W, 103, 'F')
 
  // BEAL Creative brand block
  const pillW = 4; const pillH = 28
  sf(YELLOW); doc.roundedRect(L, 30, pillW, pillH, pillW / 2, pillW / 2, 'F')
  const tx = L + 10
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); st(WHITE)
  doc.text('BEAL', tx, 44)
  const bealW = doc.getTextWidth('BEAL')
  doc.setFont('helvetica', 'normal')
  doc.text(' Creative.', tx + bealW, 44)
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
  doc.setTextColor(120, 123, 155)
  doc.text('AUDIT MACHINE', tx, 54)
 
  // Date
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 105, 140)
  doc.text(r.date, R, 50, { align: 'right' })
 
  // Cover body
  y = 5 + 103 + 42
 
  // Report type badge
  drawTag('COMPETITOR INTELLIGENCE REPORT', INDIGO, WHITE, L, y + 5)
  y += 14
 
  // Business name + market title
  doc.setFontSize(38); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
  const nameLines = doc.splitTextToSize(r.businessName, CW) as string[]
  nameLines.slice(0, 2).forEach((line, i) => doc.text(line, L, y + i * 40))
  y += Math.min(nameLines.length, 2) * 40 + 6
 
  doc.setFontSize(13); doc.setFont('helvetica', 'normal'); st(MUTED)
  doc.text(`Competitor Intelligence — ${r.market}`, L, y); y += 11
 
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); st(LABEL)
  doc.text(r.businessUrl, L, y); y += 12
 
  hline(y, BORDER, 0.5); y += 12
 
  // Stats strip
  const statsH = 28
  sf(LIGHT_BG2); sd(BORDER); doc.setLineWidth(0.5)
  doc.roundedRect(L, y, CW, statsH, 5, 5, 'FD')
  const statsDefs: [string, string][] = [
    ['BUSINESSES ANALYSED', String(r.profiles.length)],
    ['MARKET',              r.market.slice(0, 30)],
    ['DATE',                r.date],
    ['PREPARED FOR',        r.businessName],
  ]
  const statColW = CW / statsDefs.length
  statsDefs.forEach(([lbl, val], i) => {
    const sx = L + i * statColW
    if (i > 0) { sd(BORDER); doc.setLineWidth(0.5); doc.line(sx, y + 5, sx, y + statsH - 5) }
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(176, 181, 204)
    doc.text(lbl, sx + 10, y + 10)
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); st(BODY)
    doc.text((doc.splitTextToSize(val, statColW - 14) as string[])[0], sx + 10, y + 20)
  })
  y += statsH + 14
 
  if (r.summary) {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); st(BODY)
    const sumLines = doc.splitTextToSize(r.summary, CW) as string[]
    if (y + sumLines.length * LH < 270) doc.text(sumLines, L, y)
  }
 
  // ════════════════════════════════════════════════════════════════════════════
  // 1. HEADLINE FINDINGS (The Short Version)
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Headline Findings', INDIGO, TEAL)
 
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); st(MUTED)
  doc.text(`${r.profiles.length} businesses analysed in this market.`, L, y); y += 10
 
  r.headlineFindings.forEach(f => {
    const titleLines = doc.splitTextToSize(f.title, CW - 50) as string[]
    const detLines   = doc.splitTextToSize(f.detail, CW - 22) as string[]
    const cardH = titleLines.length * 7 + detLines.length * LH + 28
    np(cardH + 8)
    sf(LIGHT_BG2); doc.roundedRect(L, y, CW, cardH, 5, 5, 'F')
    sd(BORDER); doc.setLineWidth(0.5); doc.roundedRect(L, y, CW, cardH, 5, 5, 'S')
    // Number circle
    sf(INDIGO); doc.circle(L + 18, y + 14, 10, 'F')
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); st(WHITE)
    doc.text(String(f.number), L + 18, y + 17.5, { align: 'center' })
    // Title + detail
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(titleLines, L + 32, y + 12)
    const cy = y + titleLines.length * 7 + 16
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(detLines, L + 32, cy)
    y += cardH + 8
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 2. COMPETITOR PROFILES
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Who We Looked At', PURPLE, PINK)
 
  subHead('Competitor Profiles', INDIGO)
  const profCols: number[] = [36, 18, CW - 36 - 18 - 52, 52]
  tblHeader(profCols, ['Business', 'Tier', 'Positioning', 'What They Do Well'])
  r.profiles.forEach((p, i) => {
    const tierCol: RGB =
      p.tier === 'Client'  ? [6, 95, 70]  :
      p.tier === 'Premium' ? [29, 78, 216] :
      p.tier === 'Mid'     ? [146, 64, 14] : MUTED
    tblRow(profCols, [`${p.name}\n${p.url}`, p.tier, p.positioning, p.whatTheyDoWell], i % 2 === 1, [null, tierCol, null, null])
  })
  y += 8
 
  subHead('Hook Analysis', AMBER)
  const hookCols: number[] = [36, 40, CW - 76]
  tblHeader(hookCols, ['Business', 'Hook Type', 'Effectiveness'])
  r.profiles.forEach((p, i) => {
    tblRow(hookCols, [p.name, p.hookType, p.hookEffectiveness], i % 2 === 1)
  })
  y += 8
 
  subHead('What They Prove & How They Convert', GREEN)
  const convCols: number[] = [36, CW - 36 - 48 - 48, 48, 48]
  tblHeader(convCols, ['Business', 'Primary Anxiety Addressed', 'How They Prove It', 'Action Trigger'])
  r.profiles.forEach((p, i) => {
    tblRow(convCols, [p.name, p.primaryAnxiety, p.howTheyProve, p.actionTrigger], i % 2 === 1)
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 3. CLAIMS MATRIX
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('How the Market Talks', CORAL, AMBER)
 
  bodyText('What each business claims — and how specifically.', 0, MUTED)
  y += 4
 
  const playerNames  = r.profiles.map(p => p.name)
  const nameColW     = 40
  const playerColW   = Math.floor((CW - nameColW) / playerNames.length)
  const matrixCols   = [nameColW, ...playerNames.map(() => playerColW)]
  tblHeader(matrixCols, ['Claim Type', ...playerNames])
  r.claimsMatrix.rows.forEach((row, i) => {
    const cells = [row.claimType, ...playerNames.map(p => row.values[p] ?? '—')]
    const cellCols: (RGB | null)[] = [DARK_TEXT, ...playerNames.map(p => {
      const v = row.values[p] ?? '—'
      return (v === 'Not mentioned' || v === '—') ? LABEL : null
    })]
    tblRow(matrixCols, cells, i % 2 === 1, cellCols)
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 4. TABLE STAKES vs WHITE SPACE
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('What Everyone Says vs. What No One Claims', GREEN, MINT)
 
  subHead('Table Stakes', CORAL)
  bodyText('Expected claims — not differentiating.', 0, MUTED, 9)
  r.tableStakes.forEach(t => {
    np(10)
    sf(CORAL); doc.circle(L + 3.5, y - 2, 2, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); st(BODY)
    const lines = doc.splitTextToSize(t, CW - 10) as string[]
    doc.text(lines, L + 11, y)
    y += lines.length * LH + 4
  })
  y += 4
 
  subHead('White Space Opportunities', GREEN)
  bodyText('Unclaimed — strong differentiation potential.', 0, MUTED, 9)
  r.whiteSpace.forEach(ws => {
    np(24)
    sf(LIGHT_BG2); doc.roundedRect(L, y, CW, 1, 3, 3, 'F') // placeholder height
    const oppLines = doc.splitTextToSize(ws.opportunity, CW - 22) as string[]
    const ratLines = doc.splitTextToSize(ws.rationale,   CW - 22) as string[]
    const cardH = oppLines.length * 6 + ratLines.length * LH + 28
    sf(LIGHT_BG2); doc.roundedRect(L, y, CW, cardH, 5, 5, 'F')
    sf(GREEN);     doc.roundedRect(L, y, 4, cardH, 2, 2, 'F')
    doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(oppLines, L + 12, y + 12)
    let cy = y + oppLines.length * 6 + 16
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(ratLines, L + 12, cy)
    cy += ratLines.length * LH + 6
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); st(GREEN_D)
    doc.text(ws.owner, L + 12, cy)
    y += cardH + 8
  })
 
  if (r.noiseToAvoid?.length) {
    y += 4
    subHead('Noise to Avoid', MUTED)
    bodyText('Too generic to differentiate. Stop using.', 0, MUTED, 9)
    r.noiseToAvoid.forEach(n => {
      np(10)
      doc.setFontSize(10); doc.setFont('helvetica', 'italic'); st(MUTED)
      doc.text(`"${n}"`, L + 6, y); y += 8
    })
  }
 
  // ════════════════════════════════════════════════════════════════════════════
  // 5. BUYER ANXIETIES
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('What Customers Worry About', AMBER, CORAL)
 
  subHead('Common Buyer Concerns', AMBER)
  const anxCols: number[] = [60, 52, CW - 112]
  tblHeader(anxCols, ['Common Concern', 'Who Addresses It Well', 'Who Ignores It'])
  r.buyerAnxieties.forEach((b, i) => {
    tblRow(anxCols, [b.concern, b.addressedBy, b.ignoredBy], i % 2 === 1, [null, [6, 95, 70], LABEL])
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 6. STRATEGIC IMPLICATIONS
  // ════════════════════════════════════════════════════════════════════════════
  sectionBreak(80)
  if (y > 60) { addPage() }
  secHeader('Strategic Implications', INDIGO, BLUE)
 
  r.strategicImplications.forEach(s => {
    const titleLines = doc.splitTextToSize(s.title,  CW - 44) as string[]
    const detLines   = doc.splitTextToSize(s.detail, CW - 22) as string[]
    const cardH = titleLines.length * 7 + detLines.length * LH + 30
    np(cardH + 8)
    sf(LIGHT_BG); doc.roundedRect(L, y, CW, cardH, 5, 5, 'F')
    sd(BORDER); doc.setLineWidth(0.5); doc.roundedRect(L, y, CW, cardH, 5, 5, 'S')
    sf(INDIGO); doc.circle(L + 18, y + 14, 10, 'F')
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); st(WHITE)
    doc.text(String(s.number), L + 18, y + 17.5, { align: 'center' })
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(titleLines, L + 32, y + 12)
    const cy2 = y + titleLines.length * 7 + 16
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(detLines, L + 32, cy2)
    y += cardH + 8
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 7. QUICK WINS
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Quick Wins — 30 Days', GREEN, MINT)
 
  bodyText('Actionable changes tied to the analysis. Executable without a full rebrand.', 0, MUTED)
  y += 4
 
  r.quickWins.forEach((win, i) => {
    const efCol: RGB = win.effort === 'Easy' ? GREEN : win.effort === 'Medium' ? AMBER : CORAL
    const [efBg, efFg]: [RGB, RGB] =
      win.effort === 'Easy'   ? [TAG_GRN_BG, TAG_GRN_FG] :
      win.effort === 'Medium' ? [TAG_AMB_BG, TAG_AMB_FG] :
                                [TAG_RED_BG, TAG_RED_FG]
    const detLines = doc.splitTextToSize(win.why, CW - 20) as string[]
    const cardH = detLines.length * LH + 32
    np(cardH + 8)
    sf(LIGHT_BG2); doc.roundedRect(L, y, CW, cardH, 5, 5, 'F')
    // number badge
    sf(efCol); doc.circle(L + 14, y + 14, 9, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); st(WHITE)
    doc.text(String(i + 1), L + 14, y + 17.5, { align: 'center' })
    // title + effort tag
    doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(win.action, L + 28, y + 12)
    const efW = doc.getTextWidth(win.effort + ' effort') + 10 + 6
    drawTag(`${win.effort} effort`, efBg, efFg, R - efW, y + 8)
    // detail
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(detLines, L + 28, y + 22)
    y += cardH + 8
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 8. SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Summary & Recommendation', INDIGO, PURPLE)
 
  if (r.summary) {
    const sentences = r.summary.match(/[^.!?]+[.!?]+/g) ?? [r.summary]
    const intro     = sentences[0]?.trim() ?? ''
    const bullets   = sentences.slice(1, -1).map(s => s.trim()).filter(Boolean)
    const closing   = sentences.length > 1 ? sentences[sentences.length - 1]?.trim() : ''
 
    if (intro) {
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
      const il = doc.splitTextToSize(intro, CW) as string[]
      np(il.length * 6.5 + 6); doc.text(il, L, y); y += il.length * 6.5 + 8
    }
 
    bullets.forEach(b => {
      np(12)
      sf(INDIGO); doc.circle(L + 3, y - 2, 2, 'F')
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); st(BODY)
      const bl = doc.splitTextToSize(b, CW - 10) as string[]
      doc.text(bl, L + 10, y); y += bl.length * LH + 4
    })
 
    if (closing) {
      y += 4
      topRecBox(closing)
    }
  }
 
  doc.save(`competitor-intelligence-${r.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.pdf`)
}
