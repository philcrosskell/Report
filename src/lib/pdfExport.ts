import type { Audit, SeoCheck } from './types'
 
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
const INDIGO_BG:  RGB = [245, 246, 255]
const INDIGO_L:   RGB = [238, 237, 254]
const PURPLE:     RGB = [139, 92,  246]
const CORAL:      RGB = [239, 68,  68 ]
const AMBER:      RGB = [245, 158, 11 ]
const AMBER_D:    RGB = [217, 119, 6  ]
const GREEN:      RGB = [16,  185, 129]
const GREEN_D:    RGB = [5,   150, 105]
const MINT:       RGB = [6,   182, 212]
const PINK:       RGB = [236, 72,  153]
const BLUE:       RGB = [59,  130, 246]
const ORANGE:     RGB = [249, 115, 22 ]
const AMBER_L:    RGB = [251, 191, 36 ]
 
const TAG_RED_BG: RGB = [254, 226, 226]; const TAG_RED_FG: RGB = [185, 28,  28 ]
const TAG_AMB_BG: RGB = [254, 243, 199]; const TAG_AMB_FG: RGB = [146, 64,  14 ]
const TAG_GRN_BG: RGB = [209, 250, 229]; const TAG_GRN_FG: RGB = [6,   95,  70 ]
const TAG_BLU_BG: RGB = [219, 234, 254]; const TAG_BLU_FG: RGB = [29,  78,  216]
 
// ─── Layout constants ────────────────────────────────────────────────────────
const W  = 210   // A4 width (mm)
const PH = 297   // A4 height (mm)
const L  = 20    // left margin
const RM = 16    // right margin
const R  = W - RM
const CW = R - L
const LH = 5.5   // line height
const PG = 5     // paragraph gap
 
function scol(n: number): RGB {
  return n >= 70 ? GREEN : n >= 40 ? AMBER : CORAL
}
 
// ─── Helper: lerp two RGBs ───────────────────────────────────────────────────
function lerpRGB(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(c1[0] + t * (c2[0] - c1[0])),
    Math.round(c1[1] + t * (c2[1] - c1[1])),
    Math.round(c1[2] + t * (c2[2] - c1[2])),
  ]
}
 
export async function exportPDF(audit: Audit): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const r   = audit.report
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let y = 0
 
  // ─── Colour setters ─────────────────────────────────────────────────────────
  const sf = (col: RGB) => doc.setFillColor(col[0], col[1], col[2])
  const st = (col: RGB) => doc.setTextColor(col[0], col[1], col[2])
  const sd = (col: RGB) => doc.setDrawColor(col[0], col[1], col[2])
 
  // ─── Gradient strip (simulated with thin rects) ──────────────────────────────
  function gradStrip(c1: RGB, c2: RGB, yTop: number, h: number) {
    const steps = 30
    const sw = W / steps
    for (let i = 0; i < steps; i++) {
      const col = lerpRGB(c1, c2, i / steps)
      doc.setFillColor(col[0], col[1], col[2])
      doc.rect(i * sw, yTop, sw + 0.2, h, 'F')
    }
  }
 
  // ─── Donut ring ──────────────────────────────────────────────────────────────
  function drawSector(cx: number, cy: number, radius: number, pct: number, col: RGB) {
    if (pct <= 0.01) return
    const steps  = 32
    const startA = -Math.PI / 2
    const sweep  = Math.min(pct, 1) * 2 * Math.PI
    const pts: [number, number][] = []
    pts.push([radius * Math.cos(startA), radius * Math.sin(startA)])
    for (let i = 1; i <= steps; i++) {
      const a    = startA + sweep * i / steps
      const prev = startA + sweep * (i - 1) / steps
      pts.push([
        radius * Math.cos(a) - radius * Math.cos(prev),
        radius * Math.sin(a) - radius * Math.sin(prev),
      ])
    }
    sf(col)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(doc as any).lines(pts, cx, cy, [1, 1], 'F', true)
  }
 
  function drawDonut(cx: number, cy: number, outerR: number, innerR: number, pct: number, col: RGB, bgCol: RGB) {
    sf(BORDER);  doc.circle(cx, cy, outerR, 'F')
    drawSector(cx, cy, outerR, pct, col)
    sf(bgCol);   doc.circle(cx, cy, innerR, 'F')
  }
 
  // ─── Tag/pill badge ──────────────────────────────────────────────────────────
  function drawTag(text: string, bg: RGB, fg: RGB, px: number, py: number, sz = 7.5): number {
    doc.setFontSize(sz); doc.setFont('helvetica', 'bold')
    const tw   = doc.getTextWidth(text)
    const padX = 5; const padY = 2.5
    const tagW = tw + padX * 2; const tagH = sz * 0.4 + padY * 2
    sf(bg); doc.roundedRect(px, py - tagH + 2, tagW, tagH, tagH / 2, tagH / 2, 'F')
    st(fg); doc.text(text, px + padX, py + 0.3)
    return tagW + 3
  }
 
  // ─── Horizontal rule ─────────────────────────────────────────────────────────
  function hline(yPos: number, col: RGB = BORDER, lw = 0.6) {
    sd(col); doc.setLineWidth(lw)
    doc.line(L, yPos, R, yPos)
  }
 
  // ─── Page management ─────────────────────────────────────────────────────────
  function addPage() {
    doc.addPage()
    sf(WHITE); doc.rect(0, 0, W, PH, 'F')
    y = 0
  }
 
  function np(need = 24) { if (y + need > 275) addPage() }
 
  function sectionBreak(minSpace = 60) {
    if (y > PH - 24 - minSpace) addPage()
  }
 
  // ─── Section header (dark bg + gradient strip) ───────────────────────────────
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
    doc.text(audit.label || audit.url, R, stripH + 50, { align: 'right' })
    y = stripH + hdrH + 14
  }
 
  // ─── Continuation header (thin dark bar) ─────────────────────────────────────
  function contHeader(label: string, c1: RGB, c2: RGB) {
    const stripH = 3; const hdrH = 26
    gradStrip(c1, c2, 0, stripH)
    sf(DARK); doc.rect(0, stripH, W, hdrH, 'F')
    doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.setTextColor(190, 195, 225)
    doc.text(`${label.toUpperCase()} — CONTINUED`, L, stripH + 18)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 105, 140)
    doc.text(audit.label || audit.url, R, stripH + 18, { align: 'right' })
    y = stripH + hdrH + 12
  }
 
  // ─── Sub-heading (dot + underline) ───────────────────────────────────────────
  function subHead(text: string, dotCol: RGB) {
    np(22)
    y += 10
    sf(dotCol); doc.circle(L + 3.5, y - 3, 3, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(text, L + 12, y)
    hline(y + 6, BORDER, 1.2)
    y += 22
  }
 
  // ─── Body text ────────────────────────────────────────────────────────────────
  function bodyText(text: string, indent = 0, col: RGB = BODY, sz = 10) {
    doc.setFontSize(sz); doc.setFont('helvetica', 'normal'); st(col)
    const lines = doc.splitTextToSize(text, CW - indent) as string[]
    np(lines.length * LH + PG)
    doc.text(lines, L + indent, y)
    y += lines.length * LH + PG
  }
 
  // ─── Callout box ─────────────────────────────────────────────────────────────
  function calloutBox(text: string, borderCol: RGB, labelCol: RGB, label: string, bg: RGB = INDIGO_BG) {
    const lines = doc.splitTextToSize(text, CW - 22) as string[]
    const h = lines.length * LH + 30
    np(h + 8)
    sf(bg); doc.roundedRect(L, y, CW, h, 4, 4, 'F')
    sf(borderCol); doc.rect(L, y, 3, h, 'F')
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); st(labelCol)
    doc.text(label, L + 11, y + 11)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); st(BODY)
    doc.text(lines, L + 11, y + 22)
    y += h + 12
  }
 
  // ─── Issue card ───────────────────────────────────────────────────────────────
  function issueCard(accent: RGB, title: string, impact: string, fix: string,
    effortText: string, efBg: RGB, efFg: RGB) {
    const tLines  = doc.splitTextToSize(title,  CW - 50) as string[]
    const imLines = doc.splitTextToSize(impact, CW - 22) as string[]
    const fxLines = doc.splitTextToSize(fix,    CW - 22) as string[]
    const cardH   = tLines.length * 6.5 + imLines.length * LH + fxLines.length * LH + 56
    np(cardH + 10)
    sf(WHITE); doc.roundedRect(L, y, CW, cardH, 5, 5, 'F')
    sd(BORDER); doc.setLineWidth(0.6); doc.roundedRect(L, y, CW, cardH, 5, 5, 'S')
    sf(accent); doc.roundedRect(L, y, 4, cardH, 2, 2, 'F')
    // effort tag top-right
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    const efW = doc.getTextWidth(effortText) + 10 + 6
    drawTag(effortText, efBg, efFg, R - efW, y + 12)
    // title
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(tLines, L + 12, y + 14)
    let cy = y + tLines.length * 6.5 + 20
    // impact
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(176, 181, 204)
    doc.text('IMPACT', L + 12, cy); cy += 9
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(imLines, L + 12, cy); cy += imLines.length * LH + 8
    // fix
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(176, 181, 204)
    doc.text('FIX', L + 12, cy); cy += 9
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(BODY)
    doc.text(fxLines, L + 12, cy)
    y += cardH + 10
  }
 
  // ─── Fix card ─────────────────────────────────────────────────────────────────
  function fixCard(accent: RGB, num: number, title: string, problem: string, fix: string,
    effortText: string, efBg: RGB, efFg: RGB, uplift: string, timeline: string) {
    const AW     = 34
    const tLines = doc.splitTextToSize(title,   CW - AW - 22) as string[]
    const pLines = doc.splitTextToSize(problem, CW - AW - 22) as string[]
    const fLines = doc.splitTextToSize(fix,     CW - AW - 22) as string[]
    const cardH  = tLines.length * 7 + pLines.length * LH + fLines.length * LH + 70
    np(cardH + 10)
    // side accent panel (light tint)
    const la: RGB = [
      Math.round(accent[0] * 0.15 + 255 * 0.85),
      Math.round(accent[1] * 0.15 + 255 * 0.85),
      Math.round(accent[2] * 0.15 + 255 * 0.85),
    ]
    sf(la); doc.roundedRect(L, y, AW, cardH, 5, 5, 'F')
    // number circle
    sf(accent); doc.circle(L + AW / 2, y + 20, 10, 'F')
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); st(WHITE)
    doc.text(String(num), L + AW / 2, y + 24, { align: 'center' })
    // body panel
    sf(WHITE); doc.roundedRect(L + AW, y, CW - AW, cardH, 5, 5, 'F')
    sd(BORDER); doc.setLineWidth(0.6); doc.roundedRect(L + AW, y, CW - AW, cardH, 5, 5, 'S')
    const ix = L + AW + 12; let cy = y + 16
    doc.setFontSize(11.5); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(tLines, ix, cy); cy += tLines.length * 7 + 8
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(176, 181, 204)
    doc.text('PROBLEM', ix, cy); cy += 9
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(BODY)
    doc.text(pLines, ix, cy); cy += pLines.length * LH + 8
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(176, 181, 204)
    doc.text('FIX', ix, cy); cy += 9
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(BODY)
    doc.text(fLines, ix, cy); cy += fLines.length * LH + 12
    const tagW = drawTag(effortText, efBg, efFg, ix, cy + 5)
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); st(INDIGO)
    doc.text((doc.splitTextToSize(uplift, CW * 0.38) as string[])[0], ix + tagW + 4, cy + 5)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(timeline, R - doc.getTextWidth(timeline) - 2, cy + 5)
    y += cardH + 12
  }
 
  // ─── Check item (SEO) ─────────────────────────────────────────────────────────
  function checkItem(dotCol: RGB, label: string, tagText: string, tagBg: RGB, tagFg: RGB, detail: string) {
    const textW    = CW * 0.68
    const detLines = doc.splitTextToSize(detail, textW - 10) as string[]
    const itemH    = detLines.length * 5.5 + 24
    np(itemH + 6)
    // dot
    sf(dotCol); doc.circle(L + 3.5, y - 3, 3, 'F')
    // label
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(label, L + 12, y)
    // centred tag in right zone
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    const tw2   = doc.getTextWidth(tagText) + 10 + 6
    const tagX  = (L + textW + R) / 2 - tw2 / 2
    drawTag(tagText, tagBg, tagFg, tagX, y)
    y += 12
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(detLines, L + 12, y)
    y += detLines.length * 5.5 + 8
  }
 
  // ─── Quick-win item ───────────────────────────────────────────────────────────
  function qwItem(title: string, timeTag: string, detail: string) {
    const detLines = doc.splitTextToSize(detail, CW - 20) as string[]
    const h = detLines.length * LH + 30
    np(h + 8)
    sf(LIGHT_BG2); doc.roundedRect(L, y, CW, h, 5, 5, 'F')
    doc.setFontSize(10.5); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(title, L + 12, y + 14)
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
    const tTagW = doc.getTextWidth(timeTag) + 10 + 6
    drawTag(timeTag, TAG_BLU_BG, TAG_BLU_FG, R - tTagW, y + 9)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(detLines, L + 12, y + 24)
    y += h + 8
  }
 
  // ─── Top recommendation box ───────────────────────────────────────────────────
  function topRecBox(text: string) {
    const lines = doc.splitTextToSize(text, CW - 20) as string[]
    const h = lines.length * LH + 40
    np(h + 10)
    sf(INDIGO); doc.roundedRect(L, y, CW, 20, 4, 4, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); st(WHITE)
    doc.text('★  TOP RECOMMENDATION', L + 10, y + 13)
    sf(INDIGO_L); doc.roundedRect(L, y + 20, CW, h - 20, 4, 4, 'F')
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); st(INDIGO_D)
    doc.text(lines, L + 10, y + 34)
    y += h + 12
  }
 
  // ─── Anxiety item ─────────────────────────────────────────────────────────────
  function anxietyItem(addressed: boolean, title: string, note: string) {
    const nLines = doc.splitTextToSize(note, CW - 32) as string[]
    const h = nLines.length * LH + 30
    np(h + 8)
    const bg: RGB  = addressed ? [236, 253, 245] : [255, 241, 242]
    const col: RGB = addressed ? GREEN : CORAL
    sf(bg); doc.roundedRect(L, y, CW, h, 5, 5, 'F')
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); st(col)
    doc.text(addressed ? '✓' : '✗', L + 10, y + 16)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
    doc.text(title, L + 26, y + 16)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); st(MUTED)
    doc.text(nLines, L + 26, y + 26)
    y += h + 8
  }
 
  // ─── Table helpers ────────────────────────────────────────────────────────────
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
    sd(BORDER); doc.setLineWidth(0.5)
    doc.line(L, y + rh, R, y + rh)
    y += rh
  }
 
  // ════════════════════════════════════════════════════════════════════════════
  // COVER PAGE
  // ════════════════════════════════════════════════════════════════════════════
  gradStrip(INDIGO, PINK, 0, 5)
  sf(DARK); doc.rect(0, 5, W, 103, 'F')
 
  // BEAL Creative brand block
  const pillX = L, pillY = 30, pillW = 4, pillH = 28
  sf(YELLOW); doc.roundedRect(pillX, pillY, pillW, pillH, pillW / 2, pillW / 2, 'F')
  const tx = L + 10
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); st(WHITE)
  doc.text('BEAL', tx, 44)
  const bealW = doc.getTextWidth('BEAL')
  doc.setFont('helvetica', 'normal')
  doc.text(' Creative.', tx + bealW, 44)
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold')
  doc.setTextColor(120, 123, 155)
  doc.text('AUDIT MACHINE', tx, 54)
 
  // Date top-right
  doc.setFontSize(8); doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 105, 140)
  const dateStr = new Date(audit.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(dateStr, R, 50, { align: 'right' })
 
  // Cover body — large title below header
  y = 5 + 103 + 42
  const titleText  = audit.label || r.overview.pageType || 'Page Audit'
  const titleLines = doc.splitTextToSize(titleText, CW) as string[]
  doc.setFontSize(42); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
  titleLines.slice(0, 2).forEach((line, i) => doc.text(line, L, y + i * 44))
  y += Math.min(titleLines.length, 2) * 44 + 6
 
  doc.setFontSize(13); doc.setFont('helvetica', 'normal'); st(MUTED)
  doc.text(r.overview.pageType || 'Page Audit', L, y); y += 11
 
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); st(LABEL)
  doc.text(audit.url, L, y); y += 12
 
  hline(y, BORDER, 0.5); y += 12
 
  // Score cards with donut rings
  const CARD_W = (CW - 42) / 4
  const OR = 13, IR = 9
  const CARD_H = OR * 2 + 30
  const scoreDefs = [
    { label: 'SEO SCORE', num: r.scores.seo,     grade: null           },
    { label: 'LP SCORE',  num: r.scores.lp,       grade: null          },
    { label: 'OVERALL',   num: r.scores.overall,   grade: null         },
    { label: 'GRADE',     num: null,               grade: r.scores.grade },
  ]
  scoreDefs.forEach((s, i) => {
    const cx  = L + i * (CARD_W + 14) + CARD_W / 2
    const col = s.num !== null ? scol(s.num) : scol(r.scores.overall)
    const pct = s.num !== null ? s.num / 100 : r.scores.overall / 100
    // Accent bar
    sf(col); doc.roundedRect(L + i * (CARD_W + 14), y, CARD_W, 4, 2, 2, 'F')
    // Card bg
    sf(LIGHT_BG); doc.roundedRect(L + i * (CARD_W + 14), y + 4, CARD_W, CARD_H, 2, 2, 'F')
    sd(BORDER); doc.setLineWidth(0.5)
    doc.roundedRect(L + i * (CARD_W + 14), y + 4, CARD_W, CARD_H, 2, 2, 'S')
    // Donut
    drawDonut(cx, y + 4 + OR + 10, OR, IR, pct, col, LIGHT_BG)
    // Score value
    const val = s.num !== null ? String(s.num) : (s.grade ?? '')
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); st(col)
    doc.text(val, cx, y + 4 + OR + 10 + 4.5, { align: 'center' })
    // Label
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
    doc.setTextColor(176, 181, 204)
    doc.text(s.label, cx, y + 4 + OR * 2 + 20, { align: 'center' })
  })
  y += CARD_H + 12
 
  // Stats strip
  const statsH = 28
  sf(LIGHT_BG2); sd(BORDER); doc.setLineWidth(0.5)
  doc.roundedRect(L, y, CW, statsH, 5, 5, 'FD')
  const statsDefs: [string, string][] = [
    ['PAGE TYPE',  r.overview.pageType],
    ['WORD COUNT', String(r.overview.wordCount)],
    ['RESPONSE',   r.overview.responseTime],
    ['INT. LINKS', String(r.overview.internalLinks)],
    ['FILE SIZE',  r.overview.fileSize],
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
  y += statsH + 12
 
  // Summary
  if (r.overview.summary) {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); st(BODY)
    const sumLines = doc.splitTextToSize(r.overview.summary, CW) as string[]
    if (y + sumLines.length * LH < 278) doc.text(sumLines, L, y)
  }
 
  // ════════════════════════════════════════════════════════════════════════════
  // 1. GAP ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Gap Analysis', INDIGO, PURPLE)
  const g = r.gapAnalysis
 
  if (g) {
    // Score comparison boxes
    const bw = 52
    const scorePairs = [
      { l: 'CURRENT SCORE',   v: String(g.beforeScore), grade: `(${g.beforeGrade})`, col: scol(g.beforeScore), isUplift: false },
      { l: 'PROJECTED SCORE', v: String(g.afterScore),  grade: `(${g.afterGrade})`,  col: GREEN,               isUplift: false },
      { l: 'POTENTIAL UPLIFT', v: `+${g.afterScore - g.beforeScore}`, grade: 'pts',  col: GREEN,               isUplift: true  },
    ]
    scorePairs.forEach((b, i) => {
      const bx = L + i * (bw + 10)
      sf(b.col); doc.roundedRect(bx, y, bw, 4, 2, 2, 'F')
      const boxBg: RGB = b.isUplift ? [236, 253, 245] : LIGHT_BG
      sf(boxBg); sd(BORDER); doc.setLineWidth(0.5)
      doc.roundedRect(bx, y + 4, bw, 46, 2, 2, 'FD')
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); st(MUTED)
      doc.text(b.l, bx + 10, y + 16)
      doc.setFontSize(26); doc.setFont('helvetica', 'bold'); st(b.col)
      doc.text(b.v, bx + 10, y + 43)
      const numW = doc.getTextWidth(b.v)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); st(MUTED)
      doc.text(b.grade, bx + 10 + numW + 2, y + 43)
    })
    y += 62
 
    calloutBox(g.executiveSummary, INDIGO, INDIGO, 'EXECUTIVE SUMMARY', INDIGO_BG)
 
    subHead('Critical Issues', CORAL)
    g.criticalIssues.forEach(item => {
      const efCol: RGB = item.effort === 'Easy' ? GREEN : item.effort === 'Medium' ? AMBER : CORAL
      const [efBg, efFg]: [RGB, RGB] =
        item.effort === 'Easy'   ? [TAG_GRN_BG, TAG_GRN_FG] :
        item.effort === 'Medium' ? [TAG_AMB_BG, TAG_AMB_FG] :
                                   [TAG_RED_BG, TAG_RED_FG]
      issueCard(efCol, item.issue, item.impact, item.fix, `${item.effort} Effort`, efBg, efFg)
    })
 
    // Quick Wins — force new page if cramped
    const qwEstH = g.quickWins.length * 36 + 80
    if (y + qwEstH > 262) {
      addPage()
      contHeader('Gap Analysis', INDIGO, PURPLE)
    } else {
      y += 4
    }
 
    subHead('Quick Wins', GREEN)
    g.quickWins.forEach(item => qwItem(item.win, item.timeEstimate, item.action))
 
    y += 4
    sectionBreak(50)
    subHead('Positioning Gap', INDIGO)
    bodyText(g.positioningGap, 0, MUTED)
    y += 4
 
    topRecBox(g.topRecommendation)
  }
 
  // ════════════════════════════════════════════════════════════════════════════
  // 2. SEO ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('SEO Analysis', CORAL, ORANGE)
 
  const catLabels: Record<string, string> = {
    metaInformation: 'Meta Information',
    pageQuality:     'Page Quality',
    pageStructure:   'Page Structure',
    linkStructure:   'Link Structure',
    serverTechnical: 'Server & Technical',
    externalFactors: 'External Factors',
  }
 
  subHead('Category Scores', INDIGO)
  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    np(14)
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); st(BODY)
    doc.text(catLabels[k] ?? k, L, y + 4)
    const barX = L + 110; const barW = CW - 120; const barH = 8
    sf(BORDER); doc.roundedRect(barX, y - 2, barW, barH, 3, 3, 'F')
    sf(scol(cat.score)); doc.roundedRect(barX, y - 2, barW * cat.score / 100, barH, 3, 3, 'F')
    doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); st(scol(cat.score))
    doc.text(`${cat.score}%`, R - 2, y + 4, { align: 'right' })
    y += 14
  })
  y += 6
 
  const critMap: Record<string, string> = {
    critical: 'Critical', important: 'Important', somewhat: 'Somewhat', nice: 'Nice to have',
  }
 
  Object.entries(r.seoCategories).forEach(([k, cat]) => {
    sectionBreak(50)
    subHead(`${catLabels[k] ?? k} — ${cat.score}%`, scol(cat.score))
    cat.checks.forEach((c: SeoCheck) => {
      const dotCol: RGB = c.status === 'pass' ? GREEN : c.status === 'fail' ? CORAL : AMBER
      const [tBg, tFg]: [RGB, RGB] =
        c.criticality === 'critical'  ? [TAG_RED_BG, TAG_RED_FG] :
        c.criticality === 'important' ? [TAG_AMB_BG, TAG_AMB_FG] :
        c.criticality === 'somewhat'  ? [TAG_BLU_BG, TAG_BLU_FG] :
                                        [TAG_GRN_BG, TAG_GRN_FG]
      checkItem(dotCol, c.label, critMap[c.criticality] ?? c.criticality, tBg, tFg, c.detail)
    })
    y += 6
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 3. LP SCORING
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Landing Page Scoring', PURPLE, PINK)
 
  const lpLabels: Record<string, string> = {
    messageClarity:       'Message & Value Clarity',
    trustSocialProof:     'Trust & Social Proof',
    ctaForms:             'CTA & Forms',
    technicalPerformance: 'Technical Performance',
    visualUX:             'Visual Design & UX',
  }
 
  subHead('Category Overview', INDIGO)
  const lpCols = [CW * 0.38, CW * 0.16, CW * 0.14, CW * 0.32]
  tblHeader(lpCols, ['Category', 'Score', '%', 'Assessment'])
  Object.entries(r.lpScoring).forEach(([k, c], i) => {
    tblRow(lpCols, [lpLabels[k] ?? k, `${c.score}/${c.maxScore}`, `${c.percentage}%`, c.assessment], i % 2 === 1)
  })
  y += 8
 
  Object.entries(r.lpScoring).forEach(([k, cat]) => {
    sectionBreak(50)
    subHead(`${lpLabels[k] ?? k} — ${cat.score}/${cat.maxScore}`, scol(cat.percentage))
    cat.subScores.forEach((s: { label: string; score: number; max: number; note: string }) => {
      np(22)
      const sCol: RGB = s.score >= 2 ? GREEN : s.score >= 1 ? AMBER : CORAL
      const tgW = drawTag(`${s.score}/${s.max}`, sCol, WHITE, L, y + 5)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
      doc.text(s.label, L + tgW, y + 5)
      y += 11
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); st(MUTED)
      const nLines = doc.splitTextToSize(s.note, CW - 10) as string[]
      np(nLines.length * 5.5 + PG)
      doc.text(nLines, L + 6, y)
      y += nLines.length * 5.5 + PG + 4
    })
    y += 4
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 4. PRIORITY FIXES
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Priority Fixes', AMBER, AMBER_L)
  y += 2
 
  r.priorityFixes.forEach(f => {
    const efCol: RGB = f.difficulty === 'Easy' ? GREEN : f.difficulty === 'Medium' ? AMBER : CORAL
    const [efBg, efFg]: [RGB, RGB] =
      f.difficulty === 'Easy'   ? [TAG_GRN_BG, TAG_GRN_FG] :
      f.difficulty === 'Medium' ? [TAG_AMB_BG, TAG_AMB_FG] :
                                  [TAG_RED_BG, TAG_RED_FG]
    fixCard(efCol, f.rank, f.title, f.problem, f.fix, `${f.difficulty} Fix`, efBg, efFg, f.uplift, f.timeline)
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 5. POSITIONING & COMPETITOR ANALYSIS
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Positioning & Competitor Analysis', PURPLE, PINK)
  y += 2
 
  const ca = r.competitorAnalysis
 
  subHead('Hook Type & Approach', PURPLE)
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
  doc.text('Hook Type: ', L, y)
  st(AMBER_D)
  doc.text(ca.hookType, L + doc.getTextWidth('Hook Type: '), y)
  y += 10
  bodyText(ca.hookAnalysis, 0, MUTED)
  y += 4
 
  const posCol: RGB = ca.positioningStrength === 'Strong' ? GREEN : ca.positioningStrength === 'Moderate' ? AMBER : CORAL
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); st(DARK_TEXT)
  doc.text('Positioning Strength: ', L, y)
  st(posCol)
  doc.text(ca.positioningStrength, L + doc.getTextWidth('Positioning Strength: '), y)
  y += 10
  bodyText(ca.positioningNote, 0, MUTED)
 
  sectionBreak(60)
  subHead('Buyer Anxiety Audit', AMBER)
  ca.buyerAnxieties.forEach(b => anxietyItem(b.addressed, b.anxiety, b.note))
 
  y += 4
  sectionBreak(60)
  subHead('Market Positioning Map', INDIGO)
  const posMapCols: number[] = [CW / 2, CW / 2]
  tblHeader(posMapCols, ['Table Stakes — Everyone Claims This', 'White Space — Unclaimed Opportunities'])
  const maxPos = Math.max(ca.tableStakes.length, ca.whiteSpace.length)
  Array.from({ length: maxPos }, (_, i) => {
    tblRow(posMapCols, [
      ca.tableStakes[i] ?? '',
      ca.whiteSpace[i] ? `${ca.whiteSpace[i].opportunity}: ${ca.whiteSpace[i].rationale}` : '',
    ], i % 2 === 1)
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 6. STRENGTHS, WEAKNESSES & OPPORTUNITIES
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Strengths, Weaknesses & Opportunities', GREEN, MINT)
 
  const sw2 = r.strengthsWeaknesses
  const swCols: number[] = [CW / 3, CW / 3, CW / 3]
  tblHeader(swCols, ['Strengths', 'Weaknesses', 'Missed Opportunities'], [
    [6, 95, 70], [127, 29, 29], [30, 58, 138],
  ])
  const maxSW = Math.max(sw2.strengths.length, sw2.weaknesses.length, sw2.missedOpportunities.length)
  Array.from({ length: maxSW }, (_, i) => {
    tblRow(swCols, [sw2.strengths[i] ?? '', sw2.weaknesses[i] ?? '', sw2.missedOpportunities[i] ?? ''], i % 2 === 1)
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // 7. RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════════════════
  addPage()
  secHeader('Recommendations', INDIGO, BLUE)
 
  const recCols: number[] = [20, Math.round(CW * 0.22), CW - 20 - Math.round(CW * 0.22)]
  tblHeader(recCols, ['Priority', 'Area', 'Action'])
  r.recommendations.forEach((rec, i) => {
    const pCol: RGB = rec.priority === 'High' ? CORAL : rec.priority === 'Medium' ? AMBER : INDIGO
    tblRow(recCols, [rec.priority, rec.area, rec.action], i % 2 === 1, [pCol, null, null])
  })
 
  // ════════════════════════════════════════════════════════════════════════════
  // Save
  // ════════════════════════════════════════════════════════════════════════════
  doc.save(`audit-machine-${audit.url.replace(/[^a-z0-9]/gi, '-').slice(0, 40)}-${Date.now()}.pdf`)
}
