from http.server import BaseHTTPRequestHandler
import json
import io
import math
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.utils import simpleSplit

W, H = A4  # 595.28 x 841.89

# ── COLOURS ──────────────────────────────────────────────────────────────────
DARK      = HexColor('#07090F')
INDIGO    = HexColor('#6366F1')
PURPLE    = HexColor('#8B5CF6')
CORAL     = HexColor('#EF4444')
AMBER     = HexColor('#F59E0B')
AMBER_D   = HexColor('#D97706')
GREEN     = HexColor('#10B981')
MINT      = HexColor('#06B6D4')
PINK      = HexColor('#EC4899')
BLUE      = HexColor('#3B82F6')
ORANGE    = HexColor('#F97316')
AMBER_L   = HexColor('#FBBF24')
WHITE     = white
LIGHT_BG  = HexColor('#F9FAFB')
LIGHT_BG2 = HexColor('#F7F8FD')
BORDER    = HexColor('#ECEEF7')
BODY      = HexColor('#4A5280')
MUTED     = HexColor('#8B90AA')
LABEL     = HexColor('#B0B5CC')
DARK_TEXT = HexColor('#0E1120')
GREEN_DARK= HexColor('#059669')
TAG_RED_BG = HexColor('#FEE2E2'); TAG_RED_FG = HexColor('#B91C1C')
TAG_AMB_BG = HexColor('#FEF3C7'); TAG_AMB_FG = HexColor('#92400E')
TAG_GRN_BG = HexColor('#D1FAE5'); TAG_GRN_FG = HexColor('#065F46')
TAG_BLU_BG = HexColor('#DBEAFE'); TAG_BLU_FG = HexColor('#1D4ED8')
INDIGO_LIGHT = HexColor('#EEEDFE'); INDIGO_DEEP = HexColor('#2D1FA3')
INDIGO_BG    = HexColor('#F5F6FF')
YELLOW       = HexColor('#FFE600')

# ── LAYOUT ────────────────────────────────────────────────────────────────────
L  = 56
R  = W - 56
CW = R - L

# ── LOW-LEVEL HELPERS ─────────────────────────────────────────────────────────
def ry(y): return H - y
def lc(c1, c2, t):
    return Color(c1.red+t*(c2.red-c1.red), c1.green+t*(c2.green-c1.green), c1.blue+t*(c2.blue-c1.blue))

def grad_strip(cv, y_top, h, c1, c2):
    steps = 60; sw = W / steps
    for i in range(steps):
        cv.setFillColor(lc(c1, c2, i/steps))
        cv.rect(i*sw, ry(y_top+h), sw+0.6, h, fill=1, stroke=0)

def rect(cv, x, y_top, w, h, fill=None, stroke=None, r=0, sw=0.75):
    cv.saveState()
    cv.setLineWidth(sw)
    if fill:   cv.setFillColor(fill)
    if stroke: cv.setStrokeColor(stroke)
    cv.roundRect(x, ry(y_top+h), w, h, r, fill=1 if fill else 0, stroke=1 if stroke else 0)
    cv.restoreState()

def txt(cv, x, y_top, text, bold=False, sz=10, col=None, align='left'):
    cv.saveState()
    cv.setFillColor(col or BODY)
    cv.setFont('Helvetica-Bold' if bold else 'Helvetica', sz)
    yt = ry(y_top)
    if align == 'right':   cv.drawRightString(x, yt, text)
    elif align == 'center': cv.drawCentredString(x, yt, text)
    else: cv.drawString(x, yt, text)
    cv.restoreState()

def tw(cv, text, bold=False, sz=10):
    return cv.stringWidth(text, 'Helvetica-Bold' if bold else 'Helvetica', sz)

def wrap(cv, x, y_top, text, bold=False, sz=10, col=None, maxw=None, lh=14):
    if maxw is None: maxw = R - x
    fn = 'Helvetica-Bold' if bold else 'Helvetica'
    lines = simpleSplit(text, fn, sz, maxw)
    cv.saveState(); cv.setFillColor(col or BODY); cv.setFont(fn, sz)
    y = y_top
    for ln in lines:
        cv.drawString(x, ry(y), ln); y += lh
    cv.restoreState()
    return y

def donut(cv, cx, cy_top, OR, IR, pct, ac, bgc):
    cy = ry(cy_top)
    cv.setFillColor(BORDER); cv.circle(cx, cy, OR, fill=1, stroke=0)
    cv.setFillColor(ac)
    cv.wedge(cx-OR, cy-OR, cx+OR, cy+OR, 90, -pct*360, fill=1, stroke=0)
    cv.setFillColor(bgc); cv.circle(cx, cy, IR, fill=1, stroke=0)

def tag(cv, x, y_top, text, bg, fg, sz=7.5):
    fn = 'Helvetica-Bold'
    t_w = cv.stringWidth(text, fn, sz)
    px, py = 9, 4; th = sz + py*2; total_w = t_w + px*2
    cv.saveState()
    cv.setFillColor(bg); cv.roundRect(x, ry(y_top+th), total_w, th, th/2, fill=1, stroke=0)
    cv.setFillColor(fg); cv.setFont(fn, sz); cv.drawString(x+px, ry(y_top+th)+py, text)
    cv.restoreState()
    return total_w

def hline(cv, y_top, col=None, lw=0.75):
    cv.saveState(); cv.setStrokeColor(col or BORDER); cv.setLineWidth(lw)
    cv.line(L, ry(y_top), R, ry(y_top)); cv.restoreState()

def sec_header(cv, strip_c1, strip_c2, label, title, pg, audit_lbl):
    grad_strip(cv, 0, 6, strip_c1, strip_c2)
    rect(cv, 0, 6, W, 72, fill=DARK)
    txt(cv, L, 6+26, label, bold=True, sz=7.5, col=Color(1,1,1,0.3))
    txt(cv, L, 6+52, title, bold=True, sz=26, col=WHITE)
    txt(cv, R, 6+30, 'Page '+pg, sz=9, col=Color(1,1,1,0.2), align='right')
    txt(cv, R, 6+46, audit_lbl, sz=7.5, col=Color(1,1,1,0.15), align='right')

def cont_header(cv, strip_c1, strip_c2, label, pg, audit_lbl):
    grad_strip(cv, 0, 4, strip_c1, strip_c2)
    rect(cv, 0, 4, W, 36, fill=DARK)
    txt(cv, L, 4+24, label.upper() + ' \u2014 CONTINUED', bold=True, sz=9, col=Color(1,1,1,0.5))
    txt(cv, R, 4+16, 'Page ' + pg, sz=9, col=Color(1,1,1,0.2), align='right')
    txt(cv, R, 4+28, audit_lbl, sz=7.5, col=Color(1,1,1,0.15), align='right')

def sub_head(cv, y, text, dot_col, top_gap=18):
    y += top_gap
    cv.saveState(); cv.setFillColor(dot_col); cv.circle(L+4, ry(y-3), 4, fill=1, stroke=0); cv.restoreState()
    txt(cv, L+14, y, text, bold=True, sz=12, col=DARK_TEXT)
    hline(cv, y+8, col=BORDER, lw=1.5)
    return y + 32

def callout_box(cv, y, border_col, label_col, label, text, bg=None):
    bg = bg or INDIGO_BG
    lines = simpleSplit(text, 'Helvetica', 10, CW-36)
    lh = 14; total_h = len(lines)*lh + 48
    rect(cv, L, y, CW, total_h, fill=bg, r=8)
    rect(cv, L, y, 4, total_h, fill=border_col)
    txt(cv, L+16, y+16, label, bold=True, sz=7.5, col=label_col)
    cy = y + 32
    for ln in lines:
        txt(cv, L+16, cy, ln, sz=10, col=BODY); cy += lh
    return y + total_h + 16

def issue_card(cv, y, accent, title, impact, fix_text, eff_text, eff_bg, eff_fg):
    t_lines  = simpleSplit(title,    'Helvetica-Bold', 11.5, CW-90)
    im_lines = simpleSplit(impact,   'Helvetica',      10,   CW-36)
    fx_lines = simpleSplit(fix_text, 'Helvetica',      10,   CW-36)
    lh = 14
    total_h = len(t_lines)*15 + len(im_lines)*lh + len(fx_lines)*lh + 80
    rect(cv, L, y, CW, total_h, fill=WHITE, stroke=BORDER, r=10)
    rect(cv, L, y, 5, total_h, fill=accent)
    tag(cv, R-100, y+14, eff_text, eff_bg, eff_fg)
    ix = L+18; cy = y+20
    cv.saveState(); cv.setFont('Helvetica-Bold', 11.5); cv.setFillColor(DARK_TEXT)
    for ln in t_lines:
        cv.drawString(ix, ry(cy), ln); cy += 15
    cv.restoreState(); cy += 8
    txt(cv, ix, cy, 'IMPACT', bold=True, sz=7.5, col=LABEL); cy += 13
    for ln in im_lines:
        txt(cv, ix, cy, ln, sz=10, col=MUTED); cy += lh
    cy += 8
    txt(cv, ix, cy, 'FIX', bold=True, sz=7.5, col=LABEL); cy += 13
    for ln in fx_lines:
        txt(cv, ix, cy, ln, sz=10, col=BODY); cy += lh
    return y + total_h + 14

def fix_card(cv, y, accent, num, title, prob, fix_text, eff_text, eff_bg, eff_fg, uplift, time_str):
    AW = 52
    t_lines = simpleSplit(title,    'Helvetica-Bold', 12.5, CW-AW-28)
    p_lines = simpleSplit(prob,     'Helvetica',      10,   CW-AW-28)
    f_lines = simpleSplit(fix_text, 'Helvetica',      10,   CW-AW-28)
    lh = 14
    total_h = len(t_lines)*16 + len(p_lines)*lh + len(f_lines)*lh + 96
    light = lc(accent, WHITE, 0.82)
    rect(cv, L, y, AW, total_h, fill=light)
    cv.setFillColor(accent); cv.circle(L+26, ry(y+24), 17, fill=1, stroke=0)
    cv.saveState(); cv.setFillColor(WHITE); cv.setFont('Helvetica-Bold', 10.5)
    cv.drawCentredString(L+26, ry(y+29), str(num)); cv.restoreState()
    rect(cv, L+AW, y, CW-AW, total_h, fill=WHITE, stroke=BORDER)
    ix = L+AW+16; cy = y+22
    cv.saveState(); cv.setFont('Helvetica-Bold', 12.5); cv.setFillColor(DARK_TEXT)
    for ln in t_lines:
        cv.drawString(ix, ry(cy), ln); cy += 16
    cv.restoreState(); cy += 8
    txt(cv, ix, cy, 'PROBLEM', bold=True, sz=7.5, col=LABEL); cy += 13
    for ln in p_lines:
        txt(cv, ix, cy, ln, sz=10, col=BODY); cy += lh
    cy += 8
    txt(cv, ix, cy, 'FIX', bold=True, sz=7.5, col=LABEL); cy += 13
    for ln in f_lines:
        txt(cv, ix, cy, ln, sz=10, col=BODY); cy += lh
    cy += 12
    tag_w = tag(cv, ix, cy, eff_text, eff_bg, eff_fg)
    # Constrain uplift text so it doesn't overflow card boundary
    time_w = cv.stringWidth(time_str, 'Helvetica', 8) + 16
    uplift_max_w = R - ix - tag_w - 10 - time_w - 8
    uplift_line = simpleSplit(uplift, 'Helvetica-Bold', 8.5, uplift_max_w)[0] if uplift else ''
    txt(cv, ix+tag_w+10, cy+10, uplift_line, bold=True, sz=8.5, col=INDIGO)
    txt(cv, R-8,         cy+10, time_str,   sz=8,      col=MUTED, align='right')
    return y + total_h + 16

def cat_bar(cv, y, label, pct, fill_col, pct_col):
    txt(cv, L, y, label, sz=9.5, col=BODY)
    bx = L+155; bw = CW-165-38; bh = 10
    rect(cv, bx, y-2, bw, bh, fill=BORDER, r=5)
    rect(cv, bx, y-2, bw*pct/100, bh, fill=fill_col, r=5)
    txt(cv, R-8, y, f'{pct}%', bold=True, sz=10, col=pct_col, align='right')
    return y + 18

def check_item(cv, y, dot_col, label, tg_text, tg_bg, tg_fg, detail):
    text_w = int(CW * 0.68)
    cv.setFillColor(dot_col); cv.circle(L+4, ry(y-3), 4, fill=1, stroke=0)
    txt(cv, L+14, y, label, bold=True, sz=10.5, col=DARK_TEXT)
    tw_tag = cv.stringWidth(tg_text, 'Helvetica-Bold', 7.5) + 18
    tag_x = (L + text_w + R) / 2 - tw_tag / 2
    tag(cv, tag_x, y-3, tg_text, tg_bg, tg_fg)
    det_lines = simpleSplit(detail, 'Helvetica', 9.5, text_w - 14)
    cy = y + 14
    for ln in det_lines:
        txt(cv, L+14, cy, ln, sz=9.5, col=MUTED); cy += 13
    return cy + 8

def qw_item(cv, y, title, tg_text, tg_bg, tg_fg, detail):
    body_w = int(CW * 0.70)
    det_lines = simpleSplit(detail, 'Helvetica', 9.5, body_w - 32)
    total_h = len(det_lines)*13 + 46
    rect(cv, L, y, CW, total_h, fill=LIGHT_BG2, r=8)
    txt(cv, L+16, y+18, title, bold=True, sz=10.5, col=DARK_TEXT)
    tag_w = cv.stringWidth(tg_text, 'Helvetica-Bold', 7.5) + 18
    tag(cv, R - tag_w - 16, y+13, tg_text, tg_bg, tg_fg)
    cy = y + 33
    for ln in det_lines:
        txt(cv, L+16, cy, ln, sz=9.5, col=MUTED); cy += 13
    return y + total_h + 10

def top_rec_box(cv, y, text):
    lines = simpleSplit(text, 'Helvetica-Bold', 10.5, CW-28)
    total_h = len(lines)*15 + 52
    rect(cv, L, y,    CW, 28,        fill=INDIGO)
    txt(cv, L+14, y+20, '\u2605  TOP RECOMMENDATION', bold=True, sz=8, col=WHITE)
    rect(cv, L, y+28, CW, total_h-28, fill=INDIGO_LIGHT)
    cy = y + 46
    for ln in lines:
        txt(cv, L+14, cy, ln, bold=True, sz=10.5, col=INDIGO_DEEP); cy += 15
    return y + total_h + 14

def anxiety_item(cv, y, yes, title, note):
    bg  = HexColor('#ECFDF5') if yes else HexColor('#FFF1F2')
    col = GREEN if yes else CORAL
    icon = '\u2713' if yes else '\u2717'
    note_lines = simpleSplit(note, 'Helvetica', 9.5, CW-48)
    total_h = len(note_lines)*13 + 44
    rect(cv, L, y, CW, total_h, fill=bg, r=8)
    txt(cv, L+16, y+20, icon, bold=True, sz=13, col=col)
    txt(cv, L+36, y+20, title, bold=True, sz=10.5, col=DARK_TEXT)
    cy = y+34
    for ln in note_lines:
        txt(cv, L+36, cy, ln, sz=9.5, col=MUTED); cy += 13
    return y + total_h + 10

def tbl_header(cv, y, cols, headers, bg=None, col_bgs=None):
    bg = bg or DARK; rh = 30; x = L
    for i, (w, h) in enumerate(zip(cols, headers)):
        cell_bg = (col_bgs[i] if col_bgs else None) or bg
        rect(cv, x, y, w, rh, fill=cell_bg)
        txt(cv, x+14, y+20, h, bold=True, sz=9, col=WHITE)
        x += w
    return y + rh

def tbl_row(cv, y, cols, cells, even=False, cell_cols=None):
    lh = 14; maxl = 1
    for w, cell in zip(cols, cells):
        lines = simpleSplit(cell, 'Helvetica', 9.5, w-28)
        maxl = max(maxl, len(lines))
    rh = maxl*lh + 24
    bg = HexColor('#F9FAFC') if even else WHITE
    x = L
    for i, (w, cell) in enumerate(zip(cols, cells)):
        rect(cv, x, y, w, rh, fill=bg)
        col = (cell_cols[i] if cell_cols else None) or BODY
        lines = simpleSplit(cell, 'Helvetica', 9.5, w-28)
        cy = y+16
        for ln in lines:
            txt(cv, x+14, cy, ln, sz=9.5, col=col); cy += lh
        x += w
    cv.saveState(); cv.setStrokeColor(BORDER); cv.setLineWidth(0.75)
    cv.line(L, ry(y+rh), R, ry(y+rh)); cv.restoreState()
    return y + rh

def scol(n):
    return GREEN if n >= 70 else AMBER if n >= 40 else CORAL


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN PDF GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

def generate_pdf(audit):
    r = audit['report']
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)

    label = audit.get('label', audit.get('url', 'Audit'))
    audit_lbl = label.upper()

    # Parse date
    from datetime import datetime
    try:
        d = datetime.fromisoformat(audit['date'].replace('Z', '+00:00'))
        date_str = d.strftime('%-d %B %Y')
    except Exception:
        date_str = audit.get('date', '')

    def new_page():
        cv.showPage()

    # ─────────────── COVER ───────────────────────────────────────────────────
    grad_strip(cv, 0, 6, INDIGO, PINK)
    rect(cv, 0, 6, W, 108, fill=DARK)

    # Brand block
    bar_w, bar_h, bar_y = 5, 36, 42
    cv.setFillColor(YELLOW)
    cv.roundRect(L, ry(bar_y + bar_h), bar_w, bar_h, bar_w/2, fill=1, stroke=0)
    tx = L + 13
    beal_txt = 'BEAL'
    beal_w = cv.stringWidth(beal_txt, 'Helvetica-Bold', 17)
    space_w = cv.stringWidth(' ', 'Helvetica-Bold', 17)
    cv.saveState()
    cv.setFont('Helvetica-Bold', 17); cv.setFillColor(WHITE)
    cv.drawString(tx, ry(59), beal_txt)
    cv.setFont('Helvetica', 17); cv.setFillColor(WHITE)
    cv.drawString(tx + beal_w + space_w, ry(59), 'Creative.')
    cv.restoreState()
    cv.saveState()
    cv.setFont('Helvetica-Bold', 8); cv.setFillColor(Color(1,1,1,0.35))
    cv.drawString(tx, ry(74), 'AUDIT MACHINE')
    cv.restoreState()
    cv.saveState()
    cv.setFont('Helvetica', 8.5); cv.setFillColor(Color(1,1,1,0.25))
    cv.drawRightString(R, ry(6+58), date_str)
    cv.restoreState()

    # Cover body
    y = 6 + 108 + 90
    business_name = label
    name_lines = simpleSplit(business_name, 'Helvetica-Bold', 52, CW)
    for ln in name_lines[:2]:
        txt(cv, L, y, ln, bold=True, sz=52, col=DARK_TEXT); y += 56
    y += 20 - 56  # adjust: we already added 56 per line, subtract one extra 56, add 20
    # Actually recalc: after the loop y has been advanced by 56 * len(name_lines[:2])
    # We want: after last name line, gap of 20pt before page type
    # Reset properly:
    y = 6 + 108 + 90
    for i, ln in enumerate(name_lines[:2]):
        txt(cv, L, y, ln, bold=True, sz=52, col=DARK_TEXT)
        y += 56
    y -= 56; y += 20  # replace last line-advance with 20

    page_type = r['overview'].get('pageType', '')
    txt(cv, L, y, page_type, sz=15, col=MUTED); y += 15
    txt(cv, L, y, audit['url'], sz=9.5, col=LABEL); y += 20
    hline(cv, y); y += 22

    # Score cards
    CARD_W = (CW - 42) / 4
    scores_def = [
        (r['scores']['seo'],     None,                        'SEO SCORE'),
        (r['scores']['lp'],      None,                        'LP SCORE'),
        (r['scores']['overall'], None,                        'OVERALL'),
        (None,                   r['scores']['grade'],        'GRADE'),
    ]
    OR_r, IR_r = 33, 23
    ch = OR_r*2 + 38
    for i, (num, grade, lbl) in enumerate(scores_def):
        cx_c = L + i*(CARD_W+14)
        rect(cv, cx_c, y, CARD_W, 5, fill=AMBER)
        rect(cv, cx_c, y+5, CARD_W, ch, fill=LIGHT_BG, stroke=BORDER)
        rcx = cx_c + CARD_W/2
        pct = (num/100) if num is not None else (r['scores']['overall']/100)
        donut(cv, rcx, y+5+OR_r+14, OR_r, IR_r, pct, AMBER, LIGHT_BG)
        val = str(num) if num is not None else str(grade)
        txt(cv, rcx, y+5+OR_r+8+14, val, bold=True, sz=18, col=AMBER_D, align='center')
        txt(cv, rcx, y+5+OR_r*2+26, lbl, bold=True, sz=7.5, col=LABEL, align='center')
    card_h = OR_r*2 + 5 + 38
    y += card_h + 18

    # Stats strip
    overview = r['overview']
    stats = [
        ('PAGE TYPE',      overview.get('pageType', '')),
        ('WORD COUNT',     str(overview.get('wordCount', ''))),
        ('RESPONSE TIME',  overview.get('responseTime', '')),
        ('INT. LINKS',     str(overview.get('internalLinks', ''))),
        ('FILE SIZE',      overview.get('fileSize', '')),
    ]
    rect(cv, L, y, CW, 38, fill=LIGHT_BG2, stroke=BORDER, r=8)
    sw2 = CW / len(stats)
    for i, (sl, sv) in enumerate(stats):
        sx = L + i*sw2
        if i > 0:
            cv.saveState(); cv.setStrokeColor(BORDER); cv.setLineWidth(0.75)
            cv.line(sx, ry(y+8), sx, ry(y+30)); cv.restoreState()
        txt(cv, sx+12, y+13, sl, bold=True, sz=7.5, col=LABEL)
        txt(cv, sx+12, y+26, sv, bold=True, sz=10,  col=BODY)
    y += 38 + 16

    summary = overview.get('summary', '')
    if summary:
        wrap(cv, L, y, summary, sz=10.5, col=BODY, maxw=CW, lh=16)

    # ─────────────── GAP ANALYSIS ────────────────────────────────────────────
    new_page()
    g = r.get('gapAnalysis', {})
    total_pages = count_pages(r)
    pg_of = lambda n: f'{n} of {total_pages}'

    sec_header(cv, INDIGO, PURPLE, 'SECTION', 'Gap Analysis', pg_of(2), audit_lbl)
    y = 6 + 72 + 20

    # Score comparison boxes
    bw = 155
    before = g.get('beforeScore', 0)
    after  = g.get('afterScore', 0)
    before_grade = g.get('beforeGrade', '')
    after_grade  = g.get('afterGrade', '')
    uplift = after - before
    for i, (val, lbl, col, bg, bc, grade_lbl) in enumerate([
        (str(before), 'CURRENT SCORE',   scol(before), LIGHT_BG, scol(before),  f'({before_grade})'),
        (str(after),  'PROJECTED SCORE', GREEN,         LIGHT_BG, GREEN,          f'({after_grade})'),
        (f'+{uplift}','POTENTIAL UPLIFT', GREEN,         HexColor('#ECFDF5'), GREEN, 'pts'),
    ]):
        bx = L + i*(bw+14)
        rect(cv, bx, y, bw, 5, fill=bc)
        rect(cv, bx, y+5, bw, 60, fill=bg, stroke=BORDER if i<2 else HexColor('#A7F3D0'))
        lbl_col = MUTED if i<2 else HexColor('#059669')
        txt(cv, bx+14, y+19, lbl, bold=True, sz=7.5, col=lbl_col)
        txt(cv, bx+14, y+54, val, bold=True, sz=38, col=col)
        if grade_lbl:
            txt(cv, bx+14+tw(cv, val, True, 38)+4, y+54, grade_lbl, sz=12, col=MUTED)
    y += 65 + 16

    exec_sum = g.get('executiveSummary', '')
    if exec_sum:
        y = callout_box(cv, y, INDIGO, INDIGO, 'EXECUTIVE SUMMARY', exec_sum)

    y = sub_head(cv, y, 'Critical Issues', CORAL)

    for issue in g.get('criticalIssues', []):
        effort = issue.get('effort', 'Medium')
        ef_map = {'Easy': (TAG_GRN_BG, TAG_GRN_FG), 'Medium': (TAG_AMB_BG, TAG_AMB_FG), 'Hard': (TAG_RED_BG, TAG_RED_FG)}
        eff_bg, eff_fg = ef_map.get(effort, (TAG_AMB_BG, TAG_AMB_FG))
        eff_accent = {'Easy': GREEN, 'Medium': AMBER, 'Hard': CORAL}.get(effort, AMBER)
        # Estimate card height and push to continuation page if needed
        t_est = simpleSplit(issue.get('issue',''),  'Helvetica-Bold', 11.5, CW-90)
        i_est = simpleSplit(issue.get('impact',''), 'Helvetica',      10,   CW-36)
        f_est = simpleSplit(issue.get('fix',''),    'Helvetica',      10,   CW-36)
        card_est = len(t_est)*15 + len(i_est)*14 + len(f_est)*14 + 80
        if y + card_est > H - 60:
            new_page()
            cont_header(cv, INDIGO, PURPLE, 'Gap Analysis', pg_of(3), audit_lbl)
            y = 4 + 36 + 20
        y = issue_card(cv, y, eff_accent, issue.get('issue',''), issue.get('impact',''), issue.get('fix',''),
                       f'{effort} Effort', eff_bg, eff_fg)

    # Quick Wins — new continuation page
    new_page()
    cont_header(cv, INDIGO, PURPLE, 'Gap Analysis', pg_of(3), audit_lbl)
    y = 4 + 36 + 20

    y = sub_head(cv, y, 'Quick Wins', GREEN)
    for qw in g.get('quickWins', []):
        time_est = qw.get('timeEstimate', '')
        y = qw_item(cv, y, qw.get('win',''), time_est, TAG_BLU_BG, TAG_BLU_FG, qw.get('action',''))

    top_rec = g.get('topRecommendation', '')
    if top_rec:
        y = top_rec_box(cv, y, top_rec)

    # ─────────────── SEO ANALYSIS ────────────────────────────────────────────
    new_page()
    pg_seo_start = 4
    sec_header(cv, CORAL, ORANGE, 'SECTION', 'SEO Analysis', pg_of(pg_seo_start), audit_lbl)
    y = 6 + 72 + 20

    cat_labels = {
        'metaInformation': 'Meta Information',
        'pageQuality':     'Page Quality',
        'pageStructure':   'Page Structure',
        'linkStructure':   'Link Structure',
        'serverTechnical': 'Server & Technical',
        'externalFactors': 'External Factors',
    }
    seo_cats = r.get('seoCategories', {})

    y = sub_head(cv, y, 'Category Scores', INDIGO)
    for k, cat_label in cat_labels.items():
        cat = seo_cats.get(k, {})
        score = cat.get('score', 0)
        y = cat_bar(cv, y, cat_label, score, scol(score), scol(score))
    y += 4

    page_n = pg_seo_start
    for k, cat_label in cat_labels.items():
        cat = seo_cats.get(k, {})
        score = cat.get('score', 0)
        checks = cat.get('checks', [])
        if not checks:
            continue

        # Check if we need a new page
        estimated_h = len(checks) * 60 + 60
        if y + estimated_h > H - 80:
            new_page()
            page_n += 1
            cont_header(cv, CORAL, ORANGE, 'SEO Analysis', pg_of(page_n), audit_lbl)
            y = 4 + 36 + 20

        y = sub_head(cv, y, f'{cat_label} — {score}%', scol(score))

        crit_map = {'critical': 'Critical', 'important': 'Important', 'somewhat': 'Somewhat', 'nice': 'Nice to have'}
        for check in checks:
            status = check.get('status', 'warn')
            crit   = check.get('criticality', 'important')
            dot_col = {'pass': GREEN, 'fail': CORAL, 'warn': AMBER}.get(status, AMBER)
            tg_map = {
                'critical': (TAG_RED_BG, TAG_RED_FG),
                'important': (TAG_AMB_BG, TAG_AMB_FG),
                'somewhat': (TAG_BLU_BG, TAG_BLU_FG),
                'nice': (TAG_GRN_BG, TAG_GRN_FG),
            }
            tg_bg, tg_fg = tg_map.get(crit, (TAG_AMB_BG, TAG_AMB_FG))
            tg_text = crit_map.get(crit, crit)

            # Page break check
            det_lines = simpleSplit(check.get('detail',''), 'Helvetica', 9.5, int(CW*0.68)-14)
            item_h = len(det_lines)*13 + 30
            if y + item_h > H - 80:
                new_page()
                page_n += 1
                cont_header(cv, CORAL, ORANGE, 'SEO Analysis', pg_of(page_n), audit_lbl)
                y = 4 + 36 + 20

            y = check_item(cv, y, dot_col, check.get('label',''), tg_text, tg_bg, tg_fg, check.get('detail',''))
        y += 6

    # ─────────────── AEO SECTION ──────────────────────────────────────────────
    aeo = r.get('aeoScore')
    if aeo:
        new_page()
        pg_aeo = 0  # page numbering — continuation handled below
        sec_header(cv, AMBER, ORANGE, 'SECTION', 'Answer Engine Optimisation', '', audit_lbl)
        y = 6 + 72 + 20

        faq_score  = aeo.get('faqScore')
        faq_max    = aeo.get('faqMax')
        aeo_rd     = aeo.get('aeoReadiness', 0)
        aeo_total  = aeo.get('total', 0)
        aeo_grade  = aeo.get('grade', '-')
        is_na_page = faq_score is None
        bd         = aeo.get('breakdown', {})

        txt(cv, L, y, 'How well this page is structured for AI tools like ChatGPT, Perplexity and Google AI Overviews', sz=9.5, col=MUTED)
        y += 18

        # ── Score summary boxes ──────────────────────────────────────────────
        box_w = (CW - 28) / 3
        box_h = 52
        boxes = [
            ('FAQ SCORE', (f'{faq_score}/10' if not is_na_page else 'N/A'), (scol(int(faq_score/10*100)) if not is_na_page else MUTED)),
            ('AEO READINESS', f'{aeo_rd}/30', scol(int(aeo_rd/30*100))),
            ('GRADE', aeo_grade, scol(aeo_total/((faq_max or 0)+30)*100) if (faq_max or 0)+30 > 0 else MUTED),
        ]
        for i, (lbl, val, col) in enumerate(boxes):
            bx = L + i*(box_w+14)
            rect(cv, bx, y, box_w, 5, fill=AMBER)
            rect(cv, bx, y+5, box_w, box_h, fill=LIGHT_BG, stroke=BORDER)
            txt(cv, bx+box_w/2, y+5+12, lbl, sz=7, col=MUTED, align='center')
            txt(cv, bx+box_w/2, y+5+28, val, bold=True, sz=16, col=col, align='center')
        y += box_h + 18

        # ── FAQ Score sub-section ────────────────────────────────────────────
        y = sub_head(cv, y, 'FAQ Score' + (' — N/A for this page type' if is_na_page else f' — {faq_score}/10'), AMBER)

        if is_na_page:
            txt(cv, L, y, 'FAQ checks are not applicable to contact and about pages.', sz=9.5, col=MUTED)
            y += 16
        else:
            faq_checks = [
                ('FAQ Schema Q&A Pairs', bd.get('faqSchemaPairs', 0), 4),
                ('Q&A with Answer Content', bd.get('faqAnswerPairs', 0), 3),
                ('Question Headings', bd.get('questionHeadings', 0), 3),
            ]
            for label, pts, max_pts in faq_checks:
                pts = pts or 0
                pct = int(pts / max_pts * 100) if max_pts else 0
                txt(cv, L, y, label, sz=9.5, col=BODY)
                bx = L+155; bw = CW-165-38; bh = 10
                rect(cv, bx, y-2, bw, bh, fill=BORDER, r=5)
                rect(cv, bx, y-2, bw*pct/100, bh, fill=scol(pct), r=5)
                txt(cv, R-8, y, f'{pts}/{max_pts}', bold=True, sz=10, col=scol(pct), align='right')
                y += 20
        y += 8

        # ── AEO Readiness sub-section ────────────────────────────────────────
        y = sub_head(cv, y, f'AEO Readiness — {aeo_rd}/30', scol(int(aeo_rd/30*100)))

        readiness_checks = [
            ('Schema Markup',    bd.get('schemaPresent', 0),   8),
            ('Schema Relevance', bd.get('schemaRelevance', 0), 6),
            ('Lists & Tables',   bd.get('structuredLists', 0), 4),
            ('Meta as Answer',   bd.get('metaAsAnswer', 0),    3),
            ('Entity Signals',   bd.get('entitySignals', 0),   3),
            ('Content Depth',    bd.get('contentDepth', 0),    3),
            ('Open Graph',       bd.get('openGraph', 0),       2),
            ('HTTPS + Canonical',bd.get('httpsCanonical', 0),  1),
        ]
        for label, pts, max_pts in readiness_checks:
            pts = pts or 0
            pct = int(pts / max_pts * 100) if max_pts else 0
            if y + 24 > H - 80:
                new_page()
                cont_header(cv, AMBER, ORANGE, 'Answer Engine Optimisation', '', audit_lbl)
                y = 4 + 36 + 20
            txt(cv, L, y, label, sz=9.5, col=BODY)
            bx = L+155; bw = CW-165-38; bh = 10
            rect(cv, bx, y-2, bw, bh, fill=BORDER, r=5)
            rect(cv, bx, y-2, bw*pct/100, bh, fill=scol(pct), r=5)
            txt(cv, R-8, y, f'{pts}/{max_pts}', bold=True, sz=10, col=scol(pct), align='right')
            y += 20
        y += 8

        # ─────────────── PRIORITY FIXES ──────────────────────────────────────────
    new_page()
    sec_header(cv, AMBER, AMBER_L, 'SECTION', 'Priority Fixes', pg_of(6), audit_lbl)
    y = 6 + 72 + 20

    for fix in r.get('priorityFixes', []):
        diff = fix.get('difficulty', 'Medium')
        ef_map2 = {'Easy': (TAG_GRN_BG, TAG_GRN_FG, GREEN), 'Medium': (TAG_AMB_BG, TAG_AMB_FG, AMBER), 'Hard': (TAG_RED_BG, TAG_RED_FG, CORAL)}
        eff_bg2, eff_fg2, eff_accent2 = ef_map2.get(diff, (TAG_AMB_BG, TAG_AMB_FG, AMBER))

        t_lines = simpleSplit(fix.get('title',''), 'Helvetica-Bold', 12.5, CW-52-28)
        p_lines = simpleSplit(fix.get('problem',''), 'Helvetica', 10, CW-52-28)
        f_lines = simpleSplit(fix.get('fix',''),     'Helvetica', 10, CW-52-28)
        card_h_est = len(t_lines)*16 + len(p_lines)*14 + len(f_lines)*14 + 96
        if y + card_h_est > H - 80:
            new_page()
            cont_header(cv, AMBER, AMBER_L, 'Priority Fixes', pg_of(6), audit_lbl)
            y = 4 + 36 + 20

        y = fix_card(cv, y, eff_accent2, fix.get('rank', 1),
                     fix.get('title',''), fix.get('problem',''), fix.get('fix',''),
                     f'{diff} Fix', eff_bg2, eff_fg2,
                     fix.get('uplift',''), fix.get('timeline',''))

    # ─────────────── POSITIONING & COMPETITOR ANALYSIS ───────────────────────
    new_page()
    sec_header(cv, PURPLE, PINK, 'SECTION', 'Positioning & Competitor Analysis', pg_of(7), audit_lbl)
    y = 6 + 72 + 20

    ca = r.get('competitorAnalysis', {})

    y = sub_head(cv, y, 'Hook Type & Positioning', PURPLE)
    txt(cv, L, y, 'Hook Type: ', bold=True, sz=10, col=DARK_TEXT)
    txt(cv, L+tw(cv,'Hook Type: ',True,10), y, ca.get('hookType',''), sz=10, col=AMBER_D)
    y += 14
    y = wrap(cv, L, y, ca.get('hookAnalysis',''), sz=10, col=MUTED, maxw=CW, lh=14)
    y += 8

    pos_strength = ca.get('positioningStrength','')
    pos_col = {'Strong': GREEN, 'Moderate': AMBER, 'Weak': CORAL}.get(pos_strength, AMBER)
    txt(cv, L, y, 'Positioning Strength: ', bold=True, sz=10, col=DARK_TEXT)
    txt(cv, L+tw(cv,'Positioning Strength: ',True,10), y, pos_strength, sz=10, col=pos_col)
    y += 14
    y = wrap(cv, L, y, ca.get('positioningNote',''), sz=10, col=MUTED, maxw=CW, lh=14)
    y += 12

    y = sub_head(cv, y, 'Buyer Anxiety Audit', AMBER)
    for ba in ca.get('buyerAnxieties', []):
        y = anxiety_item(cv, y, ba.get('addressed', False), ba.get('anxiety',''), ba.get('note',''))
    y += 4

    table_stakes = ca.get('tableStakes', [])
    white_space   = ca.get('whiteSpace', [])
    if table_stakes or white_space:
        # Push to new page if not enough space for header + at least 2 rows
        if y + 120 > H - 60:
            new_page()
            cont_header(cv, PURPLE, PINK, 'Positioning & Competitor Analysis', pg_of(7), audit_lbl)
            y = 4 + 36 + 20
        y = sub_head(cv, y, 'Market Positioning Map', INDIGO)
        cols_5 = [CW//2, CW - CW//2]
        y = tbl_header(cv, y, cols_5, ['Table Stakes — Everyone Claims This', 'White Space — Unclaimed Opportunities'])
        max_rows = max(len(table_stakes), len(white_space))
        for i in range(max_rows):
            ts = table_stakes[i] if i < len(table_stakes) else ''
            ws = white_space[i] if i < len(white_space) else {}
            ws_text = f"{ws.get('opportunity','')} — {ws.get('rationale','')}" if ws else ''
            y = tbl_row(cv, y, cols_5, [ts, ws_text], even=(i%2==1))

    # ─────────────── STRENGTHS / WEAKNESSES ──────────────────────────────────
    new_page()
    sec_header(cv, GREEN, MINT, 'SECTION', 'Strengths, Weaknesses & Opportunities', pg_of(8), audit_lbl)
    y = 6 + 72 + 20

    sw = r.get('strengthsWeaknesses', {})
    cols_6 = [CW//3, CW//3, CW - 2*(CW//3)]
    y = tbl_header(cv, y, cols_6, ['Strengths', 'Weaknesses', 'Missed Opportunities'],
                   col_bgs=[HexColor('#065F46'), HexColor('#7F1D1D'), HexColor('#1E3A8A')])
    strengths = sw.get('strengths', [])
    weaknesses = sw.get('weaknesses', [])
    missed     = sw.get('missedOpportunities', [])
    max_sw = max(len(strengths), len(weaknesses), len(missed))
    for i in range(max_sw):
        s = strengths[i] if i < len(strengths) else ''
        w2 = weaknesses[i] if i < len(weaknesses) else ''
        m = missed[i] if i < len(missed) else ''
        y = tbl_row(cv, y, cols_6, [s, w2, m], even=(i%2==1))

    # ─────────────── RECOMMENDATIONS ─────────────────────────────────────────
    new_page()
    sec_header(cv, INDIGO, BLUE, 'SECTION', 'Recommendations', pg_of(9), audit_lbl)
    y = 6 + 72 + 20

    cols_7 = [70, 140, CW-210]
    y = tbl_header(cv, y, cols_7, ['Priority', 'Area', 'Recommended Action'])
    prio_col_map = {'High': TAG_RED_FG, 'Medium': AMBER_D, 'Low': MUTED}
    for i, rec in enumerate(r.get('recommendations', [])):
        prio = rec.get('priority','')
        pcol = prio_col_map.get(prio, BODY)
        y = tbl_row(cv, y, cols_7,
                    [prio, rec.get('area',''), rec.get('action','')],
                    even=(i%2==1), cell_cols=[pcol, DARK_TEXT, BODY])

    cv.save()
    buf.seek(0)
    return buf.read()


def count_pages(r):
    # Fixed page count: Cover + Gap + Gap-cont + SEO + SEO-cont + Fixes + Positioning + SW + Recs = 9
    return 9


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length).decode('utf-8'))
            pdf    = generate_pdf(body)
            self.send_response(200)
            self.send_header('Content-Type', 'application/pdf')
            self.send_header('Content-Length', str(len(pdf)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(pdf)
        except Exception as e:
            msg = str(e).encode()
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Content-Length', str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        pass  # suppress access logs
