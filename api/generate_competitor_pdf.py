from http.server import BaseHTTPRequestHandler
import json
import io
import math
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.utils import simpleSplit

W, H = A4  # 595.28 x 841.89

# ── Design tokens (matching audit PDF exactly) ─────────────────────────────
DARK       = HexColor('#07090F')
DARK2      = HexColor('#0E1120')
WHITE      = white
INDIGO     = HexColor('#6366F1')
PURPLE     = HexColor('#8B5CF6')
PINK       = HexColor('#EC4899')
BLUE       = HexColor('#3B82F6')
GREEN      = HexColor('#10B981')
AMBER      = HexColor('#F59E0B')
AMBER2     = HexColor('#FBBF24')
RED        = HexColor('#EF4444')
TEAL       = HexColor('#06B6D4')
YELLOW     = HexColor('#FFE600')

BODY       = HexColor('#4A5280')
MUTED      = HexColor('#8B90AA')
LIGHT_MUTED= HexColor('#B0B5CC')
BORDER     = HexColor('#ECEEF7')
LIGHT_BG   = HexColor('#F7F8FD')
LIGHT_BG2  = HexColor('#F5F6FF')

GREEN_BG   = HexColor('#ECFDF5')
GREEN_FG   = HexColor('#065F46')
AMBER_BG   = HexColor('#FEF3C7')
AMBER_FG   = HexColor('#92400E')
RED_BG     = HexColor('#FEE2E2')
RED_FG     = HexColor('#B91C1C')
INDIGO_BG  = HexColor('#EDE9FE')
INDIGO_FG  = HexColor('#5B21B6')

L = 40    # left margin
R = W-40  # right margin
CW = R-L  # content width

# ── Helpers ────────────────────────────────────────────────────────────────
def ry(y): return H - y

def lc(c1, c2, t):
    return Color(c1.red+(c2.red-c1.red)*t, c1.green+(c2.green-c1.green)*t, c1.blue+(c2.blue-c1.blue)*t)

def grad_strip(cv, y_top, h, c1, c2, steps=60):
    sw = W/steps
    for i in range(steps):
        cv.setFillColor(lc(c1, c2, i/(steps-1)))
        cv.rect(i*sw, ry(y_top+h), sw+1, h, fill=1, stroke=0)

def rect(cv, x, y_top, w, h, fill=None, stroke=None, r=0, sw=0.75):
    cv.saveState()
    cv.setLineWidth(sw)
    if fill:   cv.setFillColor(fill)
    if stroke: cv.setStrokeColor(stroke)
    if r > 0:
        cv.roundRect(x, ry(y_top+h), w, h, r, fill=1 if fill else 0, stroke=1 if stroke else 0)
    else:
        cv.rect(x, ry(y_top+h), w, h, fill=1 if fill else 0, stroke=1 if stroke else 0)
    cv.restoreState()

def txt(cv, x, y_top, text, bold=False, sz=10, col=None, align='left'):
    cv.saveState()
    cv.setFont('Helvetica-Bold' if bold else 'Helvetica', sz)
    if col: cv.setFillColor(col)
    if align == 'right':
        cv.drawRightString(x, ry(y_top), str(text))
    elif align == 'center':
        cv.drawCentredString(x, ry(y_top), str(text))
    else:
        cv.drawString(x, ry(y_top), str(text))
    cv.restoreState()

def tw(cv, text, bold=False, sz=10):
    cv.setFont('Helvetica-Bold' if bold else 'Helvetica', sz)
    return cv.stringWidth(str(text), 'Helvetica-Bold' if bold else 'Helvetica', sz)

def wrap(cv, x, y_top, text, bold=False, sz=10, col=None, maxw=None, lh=14):
    maxw = maxw or (R - x)
    cv.setFont('Helvetica-Bold' if bold else 'Helvetica', sz)
    lines = simpleSplit(str(text), 'Helvetica-Bold' if bold else 'Helvetica', sz, maxw)
    if col: cv.setFillColor(col)
    for i, line in enumerate(lines):
        cv.drawString(x, ry(y_top + i*lh), line)
    return len(lines) * lh

def tag(cv, x, y_top, text, bg, fg, sz=7.5):
    w = tw(cv, text, bold=True, sz=sz) + 14
    rect(cv, x, y_top-2, w, 16, fill=bg, r=8)
    txt(cv, x+7, y_top+9, text, bold=True, sz=sz, col=fg)
    return w

def hline(cv, y_top, col=None, lw=0.75):
    cv.saveState()
    cv.setLineWidth(lw)
    cv.setStrokeColor(col or BORDER)
    cv.line(L, ry(y_top), R, ry(y_top))
    cv.restoreState()

def sec_header(cv, strip_c1, strip_c2, label, title, pg, biz_lbl):
    grad_strip(cv, 0, 6, strip_c1, strip_c2)
    rect(cv, 0, 6, W, 72, fill=DARK)
    txt(cv, L, 6+26, label, bold=True, sz=7.5, col=Color(1,1,1,0.3))
    txt(cv, L, 6+52, title, bold=True, sz=26, col=WHITE)
    txt(cv, R, 6+30, 'Page '+str(pg), sz=9, col=Color(1,1,1,0.2), align='right')
    txt(cv, R, 6+46, biz_lbl, sz=7.5, col=Color(1,1,1,0.15), align='right')

def cont_header(cv, strip_c1, strip_c2, label, pg, biz_lbl):
    grad_strip(cv, 0, 4, strip_c1, strip_c2)
    rect(cv, 0, 4, W, 36, fill=DARK)
    txt(cv, L, 4+22, label, bold=True, sz=9, col=Color(1,1,1,0.5))
    txt(cv, R, 4+22, 'Page '+str(pg), sz=8, col=Color(1,1,1,0.2), align='right')

def sub_head(cv, y, text, dot_col, top_gap=18):
    y += top_gap
    cv.setFillColor(dot_col)
    cv.circle(L+4, ry(y-4), 4, fill=1, stroke=0)
    txt(cv, L+14, y, text, bold=True, sz=11, col=DARK2)
    return y+4

def callout_box(cv, y, border_col, label_col, label, text, bg=None):
    bg = bg or LIGHT_BG2
    lines_needed = len(simpleSplit(str(text), 'Helvetica', 9.5, CW-24)) 
    h = max(50, 28 + lines_needed*13)
    rect(cv, L, y, CW, h, fill=bg, stroke=BORDER, r=6)
    cv.saveState()
    cv.setFillColor(border_col)
    cv.setLineWidth(0)
    cv.roundRect(L, ry(y+h), 3, h, 2, fill=1, stroke=0)
    cv.restoreState()
    txt(cv, L+14, y+13, label, bold=True, sz=7.5, col=label_col)
    cv.setFillColor(BODY)
    cv.setFont('Helvetica', 9.5)
    lines = simpleSplit(str(text), 'Helvetica', 9.5, CW-24)
    for i, line in enumerate(lines):
        cv.drawString(L+14, ry(y+26+i*13), line)
    return y + h + 8

def profile_card(cv, y, name, url, tier, positioning, what_well, hook_type, hook_headline, hook_eff, anxiety, outcome, trigger):
    # Card background
    h_estimate = 200
    rect(cv, L, y, CW, 18, fill=LIGHT_BG, stroke=BORDER, r=0)
    
    # Header row
    txt(cv, L+10, y+13, name, bold=True, sz=12, col=DARK2)
    tier_colors = {'Client': (INDIGO_BG, INDIGO_FG), 'Premium': (GREEN_BG, GREEN_FG), 'Mid': (AMBER_BG, AMBER_FG), 'Budget': (RED_BG, RED_FG)}
    tc = tier_colors.get(tier, (LIGHT_BG, MUTED))
    tag(cv, R-80, y+4, tier, tc[0], tc[1], sz=7.5)
    
    y2 = y + 22
    txt(cv, L+10, y2+10, url, sz=8.5, col=INDIGO)
    y2 += 18
    hline(cv, y2, col=BORDER)
    y2 += 10
    
    if positioning:
        txt(cv, L+10, y2+9, 'POSITIONING', bold=True, sz=7, col=INDIGO)
        y2 += 14
        lines = simpleSplit(str(positioning), 'Helvetica', 9, CW-20)
        cv.setFont('Helvetica', 9)
        cv.setFillColor(BODY)
        for line in lines:
            cv.drawString(L+10, ry(y2), line)
            y2 += 12
        y2 += 4

    if what_well:
        rect(cv, L+10, y2, CW-20, 12, fill=GREEN_BG, r=4)
        txt(cv, L+16, y2+9, 'WHAT THEY DO WELL', bold=True, sz=7, col=GREEN)
        y2 += 16
        lines = simpleSplit(str(what_well), 'Helvetica', 9, CW-24)
        cv.setFont('Helvetica', 9)
        cv.setFillColor(BODY)
        for line in lines:
            cv.drawString(L+16, ry(y2), line)
            y2 += 12
        y2 += 6

    if hook_headline:
        txt(cv, L+10, y2+9, f'HOOK ({(hook_type or "").upper()})', bold=True, sz=7, col=MUTED)
        y2 += 13
        txt(cv, L+10, y2+9, hook_headline, bold=True, sz=9.5, col=DARK2)
        y2 += 13
        if hook_eff:
            lines = simpleSplit(str(hook_eff), 'Helvetica', 8.5, CW-20)
            cv.setFont('Helvetica', 8.5)
            cv.setFillColor(MUTED)
            for line in lines:
                cv.drawString(L+10, ry(y2), line)
                y2 += 11
        y2 += 6

    # Two-col anxiety / outcome
    mid = L + CW//2 - 5
    col_w = (CW-20)//2 - 5
    if anxiety or outcome:
        row_start = y2
        if anxiety:
            rect(cv, L+10, y2, col_w, 12, fill=RED_BG, r=3)
            txt(cv, L+16, y2+9, 'PRIMARY ANXIETY', bold=True, sz=6.5, col=RED)
            ay2 = y2+16
            lines = simpleSplit(str(anxiety), 'Helvetica', 8.5, col_w-10)
            cv.setFont('Helvetica', 8.5); cv.setFillColor(BODY)
            for line in lines:
                cv.drawString(L+16, ry(ay2), line); ay2 += 11
            ay2_end = ay2
        else:
            ay2_end = y2+16

        if outcome:
            rect(cv, mid+10, y2, col_w, 12, fill=GREEN_BG, r=3)
            txt(cv, mid+16, y2+9, 'OUTCOME PROMISED', bold=True, sz=6.5, col=GREEN)
            oy2 = y2+16
            lines = simpleSplit(str(outcome), 'Helvetica', 8.5, col_w-10)
            cv.setFont('Helvetica', 8.5); cv.setFillColor(BODY)
            for line in lines:
                cv.drawString(mid+16, ry(oy2), line); oy2 += 11
            oy2_end = oy2
        else:
            oy2_end = y2+16

        y2 = max(ay2_end, oy2_end) + 8

    if trigger:
        rect(cv, L+10, y2, CW-20, 12, fill=LIGHT_BG2, r=3)
        txt(cv, L+16, y2+9, 'ACTION TRIGGER', bold=True, sz=6.5, col=INDIGO)
        y2 += 16
        lines = simpleSplit(str(trigger), 'Helvetica', 8.5, CW-24)
        cv.setFont('Helvetica', 8.5); cv.setFillColor(BODY)
        for line in lines:
            cv.drawString(L+16, ry(y2), line); y2 += 11
        y2 += 6

    # Draw card border around everything
    total_h = y2 - y + 8
    rect(cv, L, y, CW, total_h, stroke=BORDER, r=6)
    return y2 + 16

def quick_win_card(cv, y, num, action, why, effort):
    effort_map = {
        'Easy':   (GREEN_BG, GREEN,   GREEN_FG,  'Easy Fix'),
        'Medium': (AMBER_BG, AMBER,   AMBER_FG,  'Medium Fix'),
        'Hard':   (RED_BG,   RED,     RED_FG,    'Hard Fix'),
    }
    ac_bg, ac_col, badge_fg, badge_label = effort_map.get(effort, (LIGHT_BG, INDIGO, INDIGO_FG, effort))
    badge_bg = HexColor('#D1FAE5') if effort == 'Easy' else (HexColor('#FEF3C7') if effort == 'Medium' else HexColor('#FEE2E2'))

    action_lines = simpleSplit(str(action), 'Helvetica-Bold', 9.5, CW-80)
    why_lines    = simpleSplit(str(why), 'Helvetica', 8.5, CW-60)
    h = max(52, 14 + len(action_lines)*12 + len(why_lines)*11 + 10)

    # Accent left bar
    rect(cv, L, y, 44, h, fill=ac_bg, r=0)
    cv.saveState()
    cv.setFillColor(ac_col)
    cv.circle(L+22, ry(y + h//2), 14, fill=1, stroke=0)
    cv.setFillColor(WHITE)
    cv.setFont('Helvetica-Bold', 13)
    cv.drawCentredString(L+22, ry(y + h//2)+(-5), str(num))
    cv.restoreState()

    # Card body
    rect(cv, L+44, y, CW-44, h, fill=WHITE, stroke=BORDER)
    rect(cv, L, y, CW, h, stroke=BORDER, r=0)

    # Badge
    bw = tw(cv, badge_label, bold=True, sz=7.5) + 14
    rect(cv, R-bw-4, y+8, bw, 14, fill=badge_bg, r=7)
    txt(cv, R-bw/2-4, y+17, badge_label, bold=True, sz=7.5, col=badge_fg, align='center')

    y2 = y + 14
    cv.setFont('Helvetica-Bold', 9.5)
    cv.setFillColor(DARK2)
    for line in action_lines:
        cv.drawString(L+54, ry(y2), line); y2 += 12
    y2 += 2
    cv.setFont('Helvetica', 8.5)
    cv.setFillColor(MUTED)
    for line in why_lines:
        cv.drawString(L+54, ry(y2), line); y2 += 11

    return y + h + 10

def anxiety_card(cv, y, concern, addressed_by, ignored_by):
    lines_c  = simpleSplit(str(concern), 'Helvetica-Bold', 9.5, CW-20)
    lines_a  = simpleSplit(str(addressed_by or 'Nobody'), 'Helvetica', 8.5, CW//2-20)
    lines_ig = simpleSplit(str(ignored_by or 'Nobody'), 'Helvetica', 8.5, CW//2-20)
    body_h = max(len(lines_a), len(lines_ig))*11 + 30
    total_h = len(lines_c)*12 + 16 + body_h

    rect(cv, L, y, CW, len(lines_c)*12+14, fill=RED_BG, stroke=BORDER, r=0)
    rect(cv, L, y, CW, total_h, stroke=BORDER, r=6)
    
    y2 = y + 11
    cv.setFont('Helvetica-Bold', 9.5); cv.setFillColor(DARK2)
    for line in lines_c:
        cv.drawString(L+10, ry(y2), line); y2 += 12
    y2 += 8
    
    mid = L + CW//2
    txt(cv, L+10, y2+9, '✓ ADDRESSED BY', bold=True, sz=7, col=GREEN)
    txt(cv, mid+5, y2+9, '✗ IGNORED BY', bold=True, sz=7, col=RED)
    y2 += 14
    cv.setFont('Helvetica', 8.5); cv.setFillColor(BODY)
    for i, (la, li) in enumerate(zip(
        simpleSplit(str(addressed_by or 'Nobody'), 'Helvetica', 8.5, CW//2-20),
        simpleSplit(str(ignored_by or 'Nobody'), 'Helvetica', 8.5, CW//2-20)
    )):
        cv.drawString(L+10, ry(y2+i*11), la)
        cv.drawString(mid+5, ry(y2+i*11), li)
    return y + total_h + 10

def whitespace_card(cv, y, opportunity, rationale, owner):
    lines_o = simpleSplit(str(opportunity), 'Helvetica-Bold', 9.5, CW-20)
    lines_r = simpleSplit(str(rationale), 'Helvetica', 8.5, CW-100)
    total_h = max(48, len(lines_o)*12 + len(lines_r)*11 + 30)

    rect(cv, L, y, CW, len(lines_o)*12+14, fill=LIGHT_BG2, stroke=BORDER, r=0)
    rect(cv, L, y, CW, total_h, stroke=BORDER, r=6)
    cv.saveState()
    cv.setFillColor(INDIGO)
    cv.roundRect(L, ry(y+total_h), 3, total_h, 2, fill=1, stroke=0)
    cv.restoreState()

    y2 = y+11
    cv.setFont('Helvetica-Bold', 9.5); cv.setFillColor(DARK2)
    for line in lines_o:
        cv.drawString(L+12, ry(y2), line); y2 += 12
    y2 += 6
    txt(cv, L+12, y2+8, 'WHY THIS MATTERS', bold=True, sz=7, col=INDIGO)
    y2 += 13
    cv.setFont('Helvetica', 8.5); cv.setFillColor(BODY)
    for line in lines_r:
        cv.drawString(L+12, ry(y2), line); y2 += 11
    if owner:
        txt(cv, R-10, y+11, owner, sz=8, col=MUTED, align='right')
    return y + total_h + 10

def claims_table(cv, y, rows, claim_types, biz_name, competitors):
    all_cols = [biz_name] + competitors
    n_cols = len(all_cols)
    label_w = CW * 0.38
    col_w = (CW - label_w) / max(n_cols, 1)

    # Header
    rect(cv, L, y, CW, 20, fill=LIGHT_BG)
    txt(cv, L+6, y+14, 'CLAIM TYPE', bold=True, sz=7, col=MUTED)
    for i, name in enumerate(all_cols):
        cx = L + label_w + i*col_w + col_w/2
        col = INDIGO if i == 0 else MUTED
        txt(cv, cx, y+14, name[:14].upper(), bold=True, sz=7, col=col, align='center')
    y += 20

    for ri, row in enumerate(rows):
        row_bg = WHITE if ri % 2 == 0 else LIGHT_BG
        rect(cv, L, y, CW, 18, fill=row_bg)
        txt(cv, L+6, y+12, str(row.get('claimType',''))[:40], sz=8.5, col=DARK2)
        for i, name in enumerate(all_cols):
            val = (row.get('values') or {}).get(name, '—')
            col = GREEN if val == 'Yes' else (RED if val == 'No' else (AMBER if val == 'Partial' else MUTED))
            cx = L + label_w + i*col_w + col_w/2
            txt(cv, cx, y+12, str(val), bold=True, sz=8.5, col=col, align='center')
        y += 18

    rect(cv, L, y-len(rows)*18-20, CW, len(rows)*18+20, stroke=BORDER)
    return y + 10


def generate_competitor_pdf(data):
    r = data.get('report', data)  # handle both wrapped and flat
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)

    biz_name  = data.get('businessName', r.get('businessName', 'Business'))
    biz_url   = data.get('businessUrl',  r.get('businessUrl', ''))
    market    = r.get('market', data.get('market', ''))
    profiles  = r.get('profiles', [])
    biz_lbl   = biz_name.upper()

    from datetime import datetime
    try:
        d = datetime.fromisoformat(data.get('date', '').replace('Z', '+00:00'))
        date_str = d.strftime('%-d %B %Y')
    except Exception:
        date_str = data.get('date', '')

    pg = [1]
    def next_page():
        cv.showPage(); pg[0] += 1

    # ── COVER ──────────────────────────────────────────────────────────────
    grad_strip(cv, 0, 6, INDIGO, PINK)
    rect(cv, 0, 6, W, 108, fill=DARK)
    
    # Yellow bar + BEAL wordmark
    rect(cv, L, 20, 5, 44, fill=YELLOW)
    txt(cv, L+14, 20+30, 'BEAL', bold=True, sz=20, col=WHITE)
    txt(cv, L+14+tw(cv,'BEAL',bold=True,sz=20)+3, 20+30, 'Creative.', sz=20, col=WHITE)
    txt(cv, L+14, 20+42, 'AUDIT MACHINE', bold=True, sz=7.5, col=Color(1,1,1,0.3))
    txt(cv, R, 20+24, date_str, sz=9, col=Color(1,1,1,0.25), align='right')

    # White cover card
    rect(cv, L, 114, CW, 220, fill=WHITE, stroke=BORDER, r=8)
    txt(cv, L+20, 130, 'COMPETITOR INTELLIGENCE REPORT', bold=True, sz=8, col=PURPLE)
    txt(cv, L+20, 162, biz_name, bold=True, sz=36, col=DARK2)
    
    detail_parts = []
    if len(profiles) > 0:
        detail_parts.append(f'Competitor Analysis · {len(profiles)} competitor{"s" if len(profiles)!=1 else ""} analysed')
    if market:
        detail_parts.append(market)
    txt(cv, L+20, 178, ' — '.join(detail_parts), sz=10, col=MUTED)
    txt(cv, L+20, 192, biz_url, sz=9, col=LIGHT_MUTED)

    # Divider
    hline(cv, 210, col=BORDER)

    summary = r.get('summary', '')
    if summary:
        cv.saveState()
        cv.setFillColor(BODY)
        cv.setFont('Helvetica', 9.5)
        sum_lines = simpleSplit(str(summary), 'Helvetica', 9.5, CW-40)
        for i, line in enumerate(sum_lines[:8]):
            cv.drawString(L+20, ry(222+i*13), line)
        cv.restoreState()

    # Stats bar
    stats = [
        ('BUSINESSES ANALYSED', str(len(profiles))),
        ('MARKET', (market or 'Not specified')[:24]),
        ('DATE', date_str),
        ('PREPARED FOR', biz_name[:22]),
    ]
    sw = CW / len(stats)
    for i, (label, val) in enumerate(stats):
        sx = L + i*sw
        txt(cv, sx+10, 352, label, bold=True, sz=6.5, col=MUTED)
        txt(cv, sx+10, 366, val, bold=True, sz=10, col=DARK2)

    next_page()

    # ── HEADLINE FINDINGS ─────────────────────────────────────────────────
    findings = r.get('headlineFindings', [])
    if findings:
        sec_header(cv, INDIGO, PURPLE, 'SECTION', 'Headline Findings', pg[0], biz_lbl)
        y = 90
        txt(cv, L, y, f'{len(profiles)} businesses analysed in this market.', sz=9.5, col=MUTED)
        y += 18
        for f in findings:
            num    = f.get('number', '')
            title  = f.get('title', '')
            detail = f.get('detail', '')
            detail_lines = simpleSplit(str(detail), 'Helvetica', 9.5, CW-50)
            h = 14 + len(detail_lines)*13 + 10
            # Number circle
            cv.setFillColor(INDIGO_BG)
            cv.circle(L+14, ry(y+10), 12, fill=1, stroke=0)
            txt(cv, L+14, y+15, str(num), bold=True, sz=10, col=INDIGO, align='center')
            # Title + detail
            txt(cv, L+36, y+11, title, bold=True, sz=11, col=DARK2)
            cv.setFont('Helvetica', 9.5); cv.setFillColor(BODY)
            for i2, line in enumerate(detail_lines):
                cv.drawString(L+36, ry(y+24+i2*13), line)
            y += h + 16
            hline(cv, y-8, col=BORDER)
            if y > 770:
                next_page()
                cont_header(cv, INDIGO, PURPLE, 'HEADLINE FINDINGS — CONTINUED', pg[0], biz_lbl)
                y = 60
        next_page()

    # ── COMPETITOR PROFILES ───────────────────────────────────────────────
    if profiles:
        sec_header(cv, INDIGO, BLUE, 'SECTION', 'Who We Looked At', pg[0], biz_lbl)
        txt(cv, L, 88, 'Competitor Profiles', bold=True, sz=8, col=MUTED)
        y = 106

        # Summary table header
        cols = ['Business', 'Tier', 'Positioning', 'What They Do Well']
        cw_vals = [CW*0.18, CW*0.1, CW*0.37, CW*0.35]
        rect(cv, L, y, CW, 18, fill=LIGHT_BG)
        cx = L
        for col, cw_v in zip(cols, cw_vals):
            txt(cv, cx+6, y+12, col.upper(), bold=True, sz=7, col=MUTED)
            cx += cw_v
        y += 18

        for p in profiles:
            name = p.get('name','')
            url  = p.get('url','')
            tier = p.get('tier','')
            pos  = p.get('positioning','')
            well = p.get('whatTheyDoWell','')
            
            pos_lines  = simpleSplit(str(pos),  'Helvetica', 8, CW*0.37-12)
            well_lines = simpleSplit(str(well), 'Helvetica', 8, CW*0.35-12)
            row_h = max(len(pos_lines), len(well_lines))*11 + 24

            rect(cv, L, y, CW, row_h, fill=WHITE, stroke=BORDER)
            txt(cv, L+6, y+13, name, bold=True, sz=8.5, col=DARK2)
            txt(cv, L+6, y+24, url, sz=7, col=INDIGO)
            
            tier_x = L + cw_vals[0] + 6
            tc = {'Client':(INDIGO_BG,INDIGO_FG),'Premium':(GREEN_BG,GREEN_FG),'Mid':(AMBER_BG,AMBER_FG),'Budget':(RED_BG,RED_FG)}.get(tier, (LIGHT_BG,MUTED))
            tag(cv, tier_x, y+6, tier, tc[0], tc[1])

            px = L + cw_vals[0] + cw_vals[1] + 6
            cv.setFont('Helvetica', 8); cv.setFillColor(BODY)
            for i2, line in enumerate(pos_lines):
                cv.drawString(px, ry(y+13+i2*11), line)

            wx = L + cw_vals[0] + cw_vals[1] + cw_vals[2] + 6
            cv.setFont('Helvetica', 8); cv.setFillColor(BODY)
            for i2, line in enumerate(well_lines):
                cv.drawString(wx, ry(y+13+i2*11), line)

            y += row_h
            if y > 770:
                next_page()
                cont_header(cv, INDIGO, BLUE, 'COMPETITOR PROFILES — CONTINUED', pg[0], biz_lbl)
                y = 56

        next_page()

        # Hook analysis page
        sec_header(cv, INDIGO, BLUE, 'SECTION', 'Who We Looked At', pg[0], biz_lbl)
        txt(cv, L, 88, 'Hook Analysis', bold=True, sz=8, col=MUTED)
        y = 106

        hook_cols = ['Business', 'Hook Type', 'Effectiveness']
        hook_cw = [CW*0.22, CW*0.18, CW*0.60]
        rect(cv, L, y, CW, 18, fill=LIGHT_BG)
        cx = L
        for col, cw_v in zip(hook_cols, hook_cw):
            txt(cv, cx+6, y+12, col.upper(), bold=True, sz=7, col=MUTED)
            cx += cw_v
        y += 18

        for p in profiles:
            eff_lines = simpleSplit(str(p.get('hookEffectiveness','')), 'Helvetica', 8.5, hook_cw[2]-12)
            row_h = max(30, len(eff_lines)*11+20)
            rect(cv, L, y, CW, row_h, fill=WHITE, stroke=BORDER)
            txt(cv, L+6, y+13, p.get('name',''), bold=True, sz=8.5, col=DARK2)
            txt(cv, L+6, y+24, p.get('url',''), sz=7, col=INDIGO)
            txt(cv, L+hook_cw[0]+6, y+13, p.get('hookType',''), sz=8.5, col=BODY)
            cv.setFont('Helvetica', 8.5); cv.setFillColor(BODY)
            for i2, line in enumerate(eff_lines):
                cv.drawString(L+hook_cw[0]+hook_cw[1]+6, ry(y+13+i2*11), line)
            y += row_h
            if y > 770:
                next_page()
                cont_header(cv, INDIGO, BLUE, 'HOOK ANALYSIS — CONTINUED', pg[0], biz_lbl)
                y = 56

        y += 16
        txt(cv, L, y, 'What They Prove & How They Convert', bold=True, sz=8, col=MUTED)
        y += 14

        proof_cols = ['Business', 'Primary Anxiety', 'How They Prove It', 'Action Trigger']
        proof_cw = [CW*0.17, CW*0.25, CW*0.30, CW*0.28]
        rect(cv, L, y, CW, 18, fill=LIGHT_BG)
        cx = L
        for col, cw_v in zip(proof_cols, proof_cw):
            txt(cv, cx+6, y+12, col.upper(), bold=True, sz=7, col=MUTED)
            cx += cw_v
        y += 18

        for p in profiles:
            anxiety_lines = simpleSplit(str(p.get('primaryAnxiety','')), 'Helvetica', 8, proof_cw[1]-12)
            prove_lines   = simpleSplit(str(p.get('howTheyProve','')),   'Helvetica', 8, proof_cw[2]-12)
            trigger_lines = simpleSplit(str(p.get('actionTrigger','')),  'Helvetica', 8, proof_cw[3]-12)
            row_h = max(len(anxiety_lines), len(prove_lines), len(trigger_lines))*10 + 22
            rect(cv, L, y, CW, row_h, fill=WHITE, stroke=BORDER)
            txt(cv, L+6, y+13, p.get('name',''), bold=True, sz=8.5, col=DARK2)
            txt(cv, L+6, y+24, p.get('url',''), sz=7, col=INDIGO)
            cx = L + proof_cw[0]
            for lines_set, cw_v in zip([anxiety_lines, prove_lines, trigger_lines], proof_cw[1:]):
                cv.setFont('Helvetica', 8); cv.setFillColor(BODY)
                for i2, line in enumerate(lines_set):
                    cv.drawString(cx+6, ry(y+13+i2*10), line)
                cx += cw_v
            y += row_h
            if y > 760:
                next_page()
                cont_header(cv, INDIGO, BLUE, 'COMPETITOR PROFILES — CONTINUED', pg[0], biz_lbl)
                y = 56

        next_page()

    # ── CLAIMS MATRIX ─────────────────────────────────────────────────────
    claims = r.get('claimsMatrix', {})
    if claims and claims.get('rows'):
        sec_header(cv, PURPLE, BLUE, 'SECTION', 'How the Market Talks', pg[0], biz_lbl)
        txt(cv, L, 88, 'What each business claims — and how specifically.', sz=9.5, col=MUTED)
        y = 106
        competitors_names = [p.get('name','') for p in profiles if p.get('name') != biz_name]
        y = claims_table(cv, y, claims.get('rows',[]), claims.get('claimTypes',[]), biz_name, competitors_names)
        next_page()

    # ── TABLE STAKES + WHITE SPACE ────────────────────────────────────────
    table_stakes  = r.get('tableStakes', [])
    white_space   = r.get('whiteSpace', [])
    noise         = r.get('noiseToAvoid', [])

    if table_stakes or white_space or noise:
        sec_header(cv, INDIGO, BLUE, 'SECTION', 'What Everyone Says vs. What No One Claims', pg[0], biz_lbl)
        y = 90

        if table_stakes:
            y = sub_head(cv, y, 'Table Stakes', INDIGO, top_gap=0)
            txt(cv, L, y+10, 'Expected claims — not differentiating.', sz=9, col=MUTED)
            y += 22
            for ts in table_stakes:
                ts_lines = simpleSplit(str(ts), 'Helvetica', 9.5, CW-20)
                cv.setFillColor(BODY)
                cv.circle(L+5, ry(y+5), 2.5, fill=1, stroke=0)
                cv.setFont('Helvetica', 9.5); cv.setFillColor(BODY)
                for i2, line in enumerate(ts_lines):
                    cv.drawString(L+14, ry(y+i2*13), line)
                y += len(ts_lines)*13 + 8
                if y > 770:
                    next_page()
                    cont_header(cv, INDIGO, BLUE, 'TABLE STAKES — CONTINUED', pg[0], biz_lbl)
                    y = 56

        if white_space:
            y += 8
            y = sub_head(cv, y, 'White Space Opportunities', GREEN, top_gap=0)
            txt(cv, L, y+10, 'Unclaimed — strong differentiation potential.', sz=9, col=MUTED)
            y += 22
            for ws in white_space:
                if y > 720:
                    next_page()
                    cont_header(cv, INDIGO, BLUE, 'WHITE SPACE — CONTINUED', pg[0], biz_lbl)
                    y = 56
                y = whitespace_card(cv, y, ws.get('opportunity',''), ws.get('rationale',''), ws.get('owner',''))

        if noise:
            y += 8
            y = sub_head(cv, y, 'Noise to Avoid', RED, top_gap=0)
            txt(cv, L, y+10, 'Too generic to differentiate. Stop using.', sz=9, col=MUTED)
            y += 22
            rect(cv, L, y, CW, 18, fill=RED_BG, stroke=RED)
            txt(cv, L+10, y+12, 'MESSAGING TO AVOID — USED HEAVILY BY COMPETITORS', bold=True, sz=7, col=RED)
            y += 18
            rect(cv, L, y, CW, len(noise)*22+10, fill=WHITE, stroke=BORDER)
            for i2, n in enumerate(noise):
                txt(cv, L+10, y+14+i2*22, '✗', bold=True, sz=10, col=RED)
                txt(cv, L+24, y+14+i2*22, str(n)[:80], sz=9, col=BODY)
            y += len(noise)*22+18

        next_page()

    # ── BUYER ANXIETIES ───────────────────────────────────────────────────
    anxieties = r.get('buyerAnxieties', [])
    if anxieties:
        sec_header(cv, RED, AMBER, 'SECTION', 'What Customers Worry About', pg[0], biz_lbl)
        txt(cv, L, 88, 'Common Buyer Concerns', bold=True, sz=8, col=MUTED)
        y = 106

        # Table header
        col_labels = ['Common Concern', 'Who Addresses It Well', 'Who Ignores It']
        col_widths  = [CW*0.38, CW*0.31, CW*0.31]
        rect(cv, L, y, CW, 18, fill=LIGHT_BG)
        cx = L
        for col, cw_v in zip(col_labels, col_widths):
            txt(cv, cx+6, y+12, col.upper(), bold=True, sz=7, col=MUTED)
            cx += cw_v
        y += 18

        for i2, a in enumerate(anxieties):
            c_lines  = simpleSplit(str(a.get('concern','')),     'Helvetica', 8.5, col_widths[0]-12)
            ab_lines = simpleSplit(str(a.get('addressedBy','')), 'Helvetica', 8.5, col_widths[1]-12)
            ig_lines = simpleSplit(str(a.get('ignoredBy','')),   'Helvetica', 8.5, col_widths[2]-12)
            row_h = max(len(c_lines), len(ab_lines), len(ig_lines))*11 + 18
            row_bg = WHITE if i2 % 2 == 0 else LIGHT_BG
            rect(cv, L, y, CW, row_h, fill=row_bg, stroke=BORDER)
            cx = L
            for lines_set, cw_v in zip([c_lines, ab_lines, ig_lines], col_widths):
                cv.setFont('Helvetica', 8.5); cv.setFillColor(BODY)
                for j, line in enumerate(lines_set):
                    cv.drawString(cx+6, ry(y+13+j*11), line)
                cx += cw_v
            y += row_h
            if y > 770:
                next_page()
                cont_header(cv, RED, AMBER, 'BUYER CONCERNS — CONTINUED', pg[0], biz_lbl)
                y = 56

        next_page()

    # ── STRATEGIC IMPLICATIONS ────────────────────────────────────────────
    implications = r.get('strategicImplications', [])
    if implications:
        sec_header(cv, PURPLE, INDIGO, 'SECTION', 'Strategic Implications', pg[0], biz_lbl)
        y = 90
        for imp in implications:
            if y > 700:
                next_page()
                cont_header(cv, PURPLE, INDIGO, 'STRATEGIC IMPLICATIONS — CONTINUED', pg[0], biz_lbl)
                y = 56
            num    = imp.get('number','')
            title  = imp.get('title','')
            detail = imp.get('detail','')
            detail_lines = simpleSplit(str(detail), 'Helvetica', 9.5, CW-50)
            h = 16 + len(detail_lines)*13 + 12
            cv.setFillColor(INDIGO)
            cv.circle(L+14, ry(y+10), 14, fill=1, stroke=0)
            cv.setFillColor(WHITE)
            cv.setFont('Helvetica-Bold', 11)
            cv.drawCentredString(L+14, ry(y+15), str(num))
            txt(cv, L+36, y+12, title, bold=True, sz=12, col=DARK2)
            cv.setFont('Helvetica', 9.5); cv.setFillColor(BODY)
            for i2, line in enumerate(detail_lines):
                cv.drawString(L+36, ry(y+26+i2*13), line)
            hline(cv, y+h, col=BORDER)
            y += h + 14
        next_page()

    # ── QUICK WINS ────────────────────────────────────────────────────────
    wins = r.get('quickWins', [])
    if wins:
        sec_header(cv, AMBER, AMBER2, 'SECTION', 'Quick Wins — 30 Days', pg[0], biz_lbl)
        txt(cv, L, 88, 'Actionable changes tied to the analysis. Executable without a full rebrand.', sz=9.5, col=MUTED)
        y = 106
        for i2, w in enumerate(wins[:5]):
            if y > 720:
                next_page()
                cont_header(cv, AMBER, AMBER2, 'QUICK WINS — CONTINUED', pg[0], biz_lbl)
                y = 56
            y = quick_win_card(cv, y, i2+1, w.get('action',''), w.get('why',''), w.get('effort','Medium'))
        next_page()

    # ── SUMMARY ───────────────────────────────────────────────────────────
    summary_text = r.get('summary','')
    if summary_text:
        sec_header(cv, INDIGO, PINK, 'SECTION', 'Summary & Recommendation', pg[0], biz_lbl)
        y = 90
        
        sum_lines = simpleSplit(str(summary_text), 'Helvetica', 10, CW)
        cv.setFont('Helvetica', 10); cv.setFillColor(BODY)
        for i2, line in enumerate(sum_lines):
            cv.drawString(L, ry(y+i2*14), line)
        y += len(sum_lines)*14 + 24

        # Key recommendation box
        rect(cv, L, y, CW, 20, fill=INDIGO, r=0)
        txt(cv, L+14, y+13, '&  KEY RECOMMENDATION', bold=True, sz=8, col=WHITE)
        y += 20
        # Find a quick win to use as the key rec
        rec_text = wins[0].get('action','') if wins else summary_text[:120]
        rec_lines = simpleSplit(str(rec_text), 'Helvetica', 10, CW-28)
        h = len(rec_lines)*14 + 24
        rect(cv, L, y, CW, h, fill=LIGHT_BG2, stroke=INDIGO)
        cv.setFont('Helvetica', 10); cv.setFillColor(BODY)
        for i2, line in enumerate(rec_lines):
            cv.drawString(L+14, ry(y+16+i2*14), line)

    cv.save()
    return buf.getvalue()


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length).decode('utf-8'))
            pdf    = generate_competitor_pdf(body)
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
