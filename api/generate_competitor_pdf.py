from http.server import BaseHTTPRequestHandler
import json, io, math
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.utils import simpleSplit

W, H = A4

# ── COLOURS ──────────────────────────────────────────────────────────────────
DARK       = HexColor('#07090F')
INDIGO     = HexColor('#6366F1')
PURPLE     = HexColor('#8B5CF6')
CORAL      = HexColor('#EF4444')
AMBER      = HexColor('#F59E0B')
AMBER_D    = HexColor('#D97706')
AMBER_L    = HexColor('#FBBF24')
GREEN      = HexColor('#10B981')
MINT       = HexColor('#06B6D4')
PINK       = HexColor('#EC4899')
BLUE       = HexColor('#3B82F6')
ORANGE     = HexColor('#F97316')
WHITE      = white
LIGHT_BG   = HexColor('#F9FAFB')
LIGHT_BG2  = HexColor('#F7F8FD')
BORDER     = HexColor('#ECEEF7')
BODY       = HexColor('#4A5280')
MUTED      = HexColor('#8B90AA')
LABEL      = HexColor('#B0B5CC')
DARK_TEXT  = HexColor('#0E1120')
TAG_RED_BG = HexColor('#FEE2E2'); TAG_RED_FG = HexColor('#B91C1C')
TAG_AMB_BG = HexColor('#FEF3C7'); TAG_AMB_FG = HexColor('#92400E')
TAG_GRN_BG = HexColor('#D1FAE5'); TAG_GRN_FG = HexColor('#065F46')
TAG_BLU_BG = HexColor('#DBEAFE'); TAG_BLU_FG = HexColor('#1D4ED8')
TAG_PUR_BG = HexColor('#EDE9FE'); TAG_PUR_FG = HexColor('#5B21B6')
YELLOW     = HexColor('#FFE600')
INDIGO_BG  = HexColor('#F5F6FF')
INDIGO_LIGHT = HexColor('#EEEDFE')
INDIGO_DEEP  = HexColor('#2D1FA3')

# ── LAYOUT ───────────────────────────────────────────────────────────────────
L = 56; R = W - 56; CW = R - L

# ── HELPERS ──────────────────────────────────────────────────────────────────
def ry(y): return H - y
def lc(c1, c2, t): return Color(c1.red+t*(c2.red-c1.red), c1.green+t*(c2.green-c1.green), c1.blue+t*(c2.blue-c1.blue))

def grad_strip(cv, y_top, h, c1, c2):
    steps = 60; sw = W / steps
    for i in range(steps):
        cv.setFillColor(lc(c1, c2, i/steps))
        cv.rect(i*sw, ry(y_top+h), sw+0.6, h, fill=1, stroke=0)

def rect(cv, x, y_top, w, h, fill=None, stroke=None, r=0, sw=0.75):
    cv.saveState(); cv.setLineWidth(sw)
    if fill: cv.setFillColor(fill)
    if stroke: cv.setStrokeColor(stroke)
    cv.roundRect(x, ry(y_top+h), w, h, r, fill=1 if fill else 0, stroke=1 if stroke else 0)
    cv.restoreState()

def txt(cv, x, y_top, text, bold=False, sz=10, col=None, align='left'):
    cv.saveState(); cv.setFillColor(col or BODY); cv.setFont('Helvetica-Bold' if bold else 'Helvetica', sz)
    yt = ry(y_top)
    if align == 'right': cv.drawRightString(x, yt, text)
    elif align == 'center': cv.drawCentredString(x, yt, text)
    else: cv.drawString(x, yt, text)
    cv.restoreState()

def tw(cv, text, bold=False, sz=10): return cv.stringWidth(text, 'Helvetica-Bold' if bold else 'Helvetica', sz)

def wrap(cv, x, y_top, text, bold=False, sz=10, col=None, maxw=None, lh=14):
    if maxw is None: maxw = R - x
    fn = 'Helvetica-Bold' if bold else 'Helvetica'
    lines = simpleSplit(text, fn, sz, maxw)
    cv.saveState(); cv.setFillColor(col or BODY); cv.setFont(fn, sz)
    y = y_top
    for ln in lines: cv.drawString(x, ry(y), ln); y += lh
    cv.restoreState(); return y

def hline(cv, y_top, col=None, lw=0.75):
    cv.saveState(); cv.setStrokeColor(col or BORDER); cv.setLineWidth(lw)
    cv.line(L, ry(y_top), R, ry(y_top)); cv.restoreState()

def tag(cv, x, y_top, text, bg, fg, sz=7.5):
    fn = 'Helvetica-Bold'; t_w = cv.stringWidth(text, fn, sz)
    px, py = 9, 4; th = sz + py*2; total_w = t_w + px*2
    cv.saveState()
    cv.setFillColor(bg); cv.roundRect(x, ry(y_top+th), total_w, th, th/2, fill=1, stroke=0)
    cv.setFillColor(fg); cv.setFont(fn, sz); cv.drawString(x+px, ry(y_top+th)+py, text)
    cv.restoreState(); return total_w

def sec_header(cv, c1, c2, label, title, pg, sub=''):
    grad_strip(cv, 0, 6, c1, c2)
    rect(cv, 0, 6, W, 72, fill=DARK)
    txt(cv, L, 6+26, label, bold=True, sz=7.5, col=Color(1,1,1,0.3))
    txt(cv, L, 6+52, title, bold=True, sz=26, col=WHITE)
    if pg: txt(cv, R, 6+30, 'Page '+str(pg), sz=9, col=Color(1,1,1,0.2), align='right')
    if sub: txt(cv, R, 6+46, sub, sz=7.5, col=Color(1,1,1,0.15), align='right')

def cont_header(cv, c1, c2, label, pg=''):
    grad_strip(cv, 0, 4, c1, c2)
    rect(cv, 0, 4, W, 36, fill=DARK)
    txt(cv, L, 4+24, label.upper() + ' — CONTINUED', bold=True, sz=9, col=Color(1,1,1,0.5))
    if pg: txt(cv, R, 4+16, 'Page '+str(pg), sz=9, col=Color(1,1,1,0.2), align='right')

def sub_head(cv, y, text, dot_col, top_gap=18):
    y += top_gap
    cv.saveState(); cv.setFillColor(dot_col); cv.circle(L+4, ry(y-3), 4, fill=1, stroke=0); cv.restoreState()
    txt(cv, L+14, y, text, bold=True, sz=12, col=DARK_TEXT)
    hline(cv, y+8, col=BORDER, lw=1.5)
    return y + 32

def tbl_header(cv, y, cols, headers, col_bgs=None):
    rh = 30; x = L
    for i, (w, h) in enumerate(zip(cols, headers)):
        bg = (col_bgs[i] if col_bgs else None) or DARK
        rect(cv, x, y, w, rh, fill=bg)
        txt(cv, x+14, y+20, h, bold=True, sz=9, col=WHITE)
        x += w
    return y + rh

def tbl_row(cv, y, cols, cells, even=False, cell_cols=None):
    lh = 14; maxl = 1
    for w, cell in zip(cols, cells):
        lines = simpleSplit(str(cell), 'Helvetica', 9.5, w-20)
        maxl = max(maxl, len(lines))
    rh = maxl*lh + 24; bg = HexColor('#F9FAFC') if even else WHITE; x = L
    for i, (w, cell) in enumerate(zip(cols, cells)):
        rect(cv, x, y, w, rh, fill=bg)
        col = (cell_cols[i] if cell_cols else None) or BODY
        lines = simpleSplit(str(cell), 'Helvetica', 9.5, w-20)
        cy = y+16
        for ln in lines: txt(cv, x+10, cy, ln, sz=9.5, col=col); cy += lh
        x += w
    cv.saveState(); cv.setStrokeColor(BORDER); cv.setLineWidth(0.75)
    cv.line(L, ry(y+rh), R, ry(y+rh)); cv.restoreState()
    return y + rh

def sco_col(n): return GREEN if n >= 56 else AMBER if n >= 45 else CORAL

SEO_CAT_MAX = {
    'title': 10, 'metadescription': 4, 'h1': 8, 'wordcount': 6,
    'https': 6, 'viewport': 5, 'imagealt': 3, 'titleh1alignment': 5,
    'schema': 4, 'canonical': 3, 'responsetime': 3,
}

def sco_col_cat(v, cat):
    key = cat.lower().replace(' ', '').replace('_', '')
    mx = SEO_CAT_MAX.get(key, 10)
    if mx == 0: return MUTED
    pct = v / mx
    return GREEN if pct >= 0.9 else AMBER if pct > 0.5 else CORAL

def bar_row(cv, y, label, val, max_val, fill_col):
    txt(cv, L, y, label, sz=9.5, col=BODY)
    bx = L+160; bw = CW-170-50; bh = 10
    rect(cv, bx, y-2, bw, bh, fill=BORDER, r=5)
    pct = val/max_val if max_val else 0
    rect(cv, bx, y-2, bw*pct, bh, fill=fill_col, r=5)
    txt(cv, R-8, y, str(val), bold=True, sz=10, col=fill_col, align='right')
    return y + 20


# ═════════════════════════════════════════════════════════════════════════════
# MAIN GENERATOR
# ═════════════════════════════════════════════════════════════════════════════
def generate_competitor_pdf(report):
    from datetime import datetime
    buf = io.BytesIO()
    cv = canvas.Canvas(buf, pagesize=A4)

    biz_name  = report.get('businessName', 'Competitor Report')
    biz_url   = report.get('businessUrl', '')
    market    = report.get('market', '')
    profiles  = report.get('profiles', [])
    summary   = report.get('summary', '')
    pg = [1]

    try:
        d = datetime.fromisoformat(report.get('date','').replace('Z','+00:00'))
        date_str = d.strftime('%-d %B %Y')
    except Exception:
        date_str = report.get('date','')

    def new_page():
        cv.showPage(); pg[0] += 1

    # ── COVER ────────────────────────────────────────────────────────────────
    grad_strip(cv, 0, 6, INDIGO, PINK)
    rect(cv, 0, 6, W, 108, fill=DARK)
    # Brand
    cv.setFillColor(YELLOW)
    cv.roundRect(L, ry(42+36), 5, 36, 2.5, fill=1, stroke=0)
    tx = L+13
    bw2 = cv.stringWidth('BEAL','Helvetica-Bold',17)
    sw2 = cv.stringWidth(' ','Helvetica-Bold',17)
    cv.saveState()
    cv.setFont('Helvetica-Bold',17); cv.setFillColor(WHITE); cv.drawString(tx, ry(59), 'BEAL')
    cv.setFont('Helvetica',17); cv.drawString(tx+bw2+sw2, ry(59), 'Creative.')
    cv.setFont('Helvetica-Bold',8); cv.setFillColor(Color(1,1,1,0.35)); cv.drawString(tx, ry(74), 'AUDIT MACHINE')
    cv.restoreState()
    cv.saveState(); cv.setFont('Helvetica',8.5); cv.setFillColor(Color(1,1,1,0.25))
    cv.drawRightString(R, ry(6+58), date_str); cv.restoreState()

    # Title block
    y = 6+108+60
    nm_lines = simpleSplit(biz_name, 'Helvetica-Bold', 46, CW)
    for ln in nm_lines[:2]: txt(cv, L, y, ln, bold=True, sz=46, col=DARK_TEXT); y += 52
    y -= 52; y += 18
    txt(cv, L, y, 'COMPETITOR ANALYSIS REPORT', bold=True, sz=9, col=MUTED); y += 14
    if market: txt(cv, L, y, market, sz=10, col=LABEL); y += 14
    txt(cv, L, y, biz_url, sz=9.5, col=LABEL); y += 18
    hline(cv, y); y += 18

    # Stats strip
    n_comp = len([p for p in profiles if p.get('name','').lower() != biz_name.lower()])
    has_seo = sum(1 for p in profiles if p.get('seoScore') is not None)
    stats = [
        ('COMPETITORS', str(n_comp)),
        ('WITH SEO SCORES', str(has_seo)),
        ('MARKET', market[:24] if market else 'Not specified'),
        ('GENERATED', date_str),
    ]
    rect(cv, L, y, CW, 38, fill=LIGHT_BG2, stroke=BORDER, r=8)
    sw3 = CW / len(stats)
    for i, (sl, sv) in enumerate(stats):
        sx = L+i*sw3
        if i > 0:
            cv.saveState(); cv.setStrokeColor(BORDER); cv.setLineWidth(0.75)
            cv.line(sx, ry(y+8), sx, ry(y+30)); cv.restoreState()
        txt(cv, sx+12, y+13, sl, bold=True, sz=7.5, col=LABEL)
        txt(cv, sx+12, y+26, sv, bold=True, sz=10, col=BODY)
    y += 38+16

    if summary:
        sum_lines = simpleSplit(summary, 'Helvetica', 10.5, CW)
        cv.saveState(); cv.setFont('Helvetica',10.5); cv.setFillColor(BODY)
        for ln in sum_lines: cv.drawString(L, ry(y), ln); y += 16
        cv.restoreState(); y += 8

    # Headline findings on cover
    findings = report.get('headlineFindings', [])
    if findings:
        y += 8
        txt(cv, L, y, 'HEADLINE FINDINGS', bold=True, sz=8, col=LABEL); y += 16
        for f in findings[:5]:
            if y > H-80: break
            num_w = tw(cv, str(f.get('number','')), True, 11)
            txt(cv, L, y, str(f.get('number','')), bold=True, sz=11, col=INDIGO)
            txt(cv, L+num_w+6, y, f.get('title',''), bold=True, sz=11, col=DARK_TEXT); y += 14
            det_lines = simpleSplit(f.get('detail',''), 'Helvetica', 9.5, CW-20)
            for dl in det_lines: txt(cv, L+16, y, dl, sz=9.5, col=MUTED); y += 13
            y += 6

    # ── PAGE 2: WHO WE LOOKED AT + SEO COMPARISON ────────────────────────────
    new_page()
    sec_header(cv, INDIGO, GREEN, 'SECTION', 'Who We Looked At', str(pg[0]), biz_name.upper())
    y = 6+72+20

    # Table: Name | Tier | SEO Score | Positioning | What they do well
    tier_cols = [DARK, HexColor('#1E3A8A'), HexColor('#065F46'), HexColor('#4C1D95'), HexColor('#7F1D1D')]
    cols = [140, 45, 70, CW-340, CW-200-(CW-340)-45-70]
    # Make last col fill remaining
    used = sum(cols[:-1]); cols[-1] = CW - used
    y = tbl_header(cv, y, cols, ['COMPETITOR','TIER','SEO SCORE','POSITIONING','WHAT THEY DO WELL'])

    for i, p in enumerate(profiles):
        tier = p.get('tier','')
        tier_col_map = {'Premium':HexColor('#4C1D95'),'Mid':HexColor('#92400E'),'Budget':HexColor('#7F1D1D'),'Client':HexColor('#065F46')}
        seo = p.get('seoScore')
        seo_str = f"{seo}/62" if seo is not None else '—'
        seo_col = sco_col(seo) if seo is not None else MUTED
        y = tbl_row(cv, y, cols,
            [p.get('name',''), tier, seo_str, p.get('positioning',''), p.get('whatTheyDoWell','')],
            even=(i%2==1),
            cell_cols=[DARK_TEXT, tier_col_map.get(tier, MUTED), seo_col, BODY, MUTED])
        if y > H-80:
            new_page()
            cont_header(cv, INDIGO, GREEN, 'Who We Looked At', str(pg[0]))
            y = 4+36+20

    # SEO Comparison bars
    seo_profiles = sorted([p for p in profiles if p.get('seoScore') is not None], key=lambda p: p.get('seoScore',0), reverse=True)
    if seo_profiles:
        if y + len(seo_profiles)*28 + 80 > H-60:
            new_page()
            cont_header(cv, INDIGO, GREEN, 'Who We Looked At', str(pg[0]))
            y = 4+36+20

        y = sub_head(cv, y, 'SEO Score Comparison — out of 62', INDIGO)
        for p in seo_profiles:
            seo = p.get('seoScore', 0)
            col = sco_col(seo)
            y = bar_row(cv, y, p.get('name',''), seo, 62, col)
        y += 8

        # Breakdown table if available
        first_bd = next((p.get('seoBreakdown') for p in seo_profiles if p.get('seoBreakdown')), None)
        if first_bd:
            if y + 60 > H-80:
                new_page()
                cont_header(cv, INDIGO, GREEN, 'SEO Breakdown', str(pg[0]))
                y = 4+36+20

            y = sub_head(cv, y, 'SEO Category Breakdown', INDIGO)
            n_comp_cols = len(seo_profiles)
            cat_col_w = 130
            score_col_w = int((CW - cat_col_w) / n_comp_cols)
            bd_cols = [cat_col_w] + [score_col_w]*n_comp_cols
            headers = ['CATEGORY'] + [p.get('name','')[:14] for p in seo_profiles]
            y = tbl_header(cv, y, bd_cols, headers)

            cats = list(first_bd.keys())
            for i, cat in enumerate(cats):
                cells = [cat.replace('_',' ').title()]
                cell_cols = [BODY]
                for p in seo_profiles:
                    v = p.get('seoBreakdown',{}).get(cat, 0)
                    cells.append(str(v))
                    cell_cols.append(sco_col_cat(v, cat) if v > 0 else CORAL)
                y = tbl_row(cv, y, bd_cols, cells, even=(i%2==1), cell_cols=cell_cols)
                if y > H-80:
                    new_page()
                    cont_header(cv, INDIGO, GREEN, 'SEO Breakdown', str(pg[0]))
                    y = 4+36+20
                    y = tbl_header(cv, y, bd_cols, headers)

            # Total row
            total_cells = ['TOTAL /62']
            total_cols_c = [DARK_TEXT]
            for p in seo_profiles:
                s = p.get('seoScore', 0)
                total_cells.append(str(s))
                total_cols_c.append(sco_col(s))
            rect(cv, L, y, CW, 28, fill=LIGHT_BG2)
            x2 = L
            for i2, (w2, cell2) in enumerate(zip(bd_cols, total_cells)):
                txt(cv, x2+10, y+19, cell2, bold=True, sz=10, col=total_cols_c[i2]); x2 += w2
            hline(cv, y+28); y += 36


    # ── PAGE 3: COMPETITOR PROFILES ──────────────────────────────────────────
    new_page()
    sec_header(cv, PURPLE, PINK, 'SECTION', 'Competitor Profiles', str(pg[0]), biz_name.upper())
    y = 6+72+20

    profile_fields = [
        ('HOOK TYPE',          'hookType'),
        ('HOOK HEADLINE',      'hookHeadline'),
        ('HOOK EFFECTIVENESS', 'hookEffectiveness'),
        ('PRIMARY ANXIETY',    'primaryAnxiety'),
        ('OUTCOME PROMISED',   'outcomePromised'),
        ('HOW THEY PROVE IT',  'howTheyProve'),
        ('ACTION TRIGGER',     'actionTrigger'),
    ]

    for p in profiles:
        # Estimate card height
        field_h = sum(len(simpleSplit(str(p.get(fk,'')), 'Helvetica', 9.5, CW//2-28))*13+22 for _, fk in profile_fields)
        card_h = field_h + 56
        if y + card_h > H-60:
            new_page()
            cont_header(cv, PURPLE, PINK, 'Competitor Profiles', str(pg[0]))
            y = 4+36+20

        # Profile card header
        seo = p.get('seoScore')
        rect(cv, L, y, CW, 36, fill=DARK, r=8)
        txt(cv, L+14, y+14, p.get('name',''), bold=True, sz=13, col=WHITE)
        txt(cv, L+14, y+28, p.get('url',''), sz=8.5, col=Color(1,1,1,0.3))
        if seo is not None:
            seo_label = f'SEO: {seo}/62'
            tag(cv, R-80, y+10, seo_label, sco_col(seo), WHITE)
        y += 36+14

        # Two-column field layout
        half = CW//2
        left_fields  = profile_fields[:4]
        right_fields = profile_fields[4:]
        max_rows = max(len(left_fields), len(right_fields))

        for row_i in range(max_rows):
            row_start_y = y
            col_y = [y, y]
            for col_i, fields_side in enumerate([left_fields, right_fields]):
                if row_i >= len(fields_side): continue
                lbl, fk = fields_side[row_i]
                val = str(p.get(fk,''))
                x_off = L if col_i == 0 else L+half+8
                col_w = half-8
                txt(cv, x_off, col_y[col_i], lbl, bold=True, sz=7.5, col=LABEL)
                col_y[col_i] += 12
                val_lines = simpleSplit(val, 'Helvetica', 9.5, col_w-8)
                for vl in val_lines:
                    txt(cv, x_off, col_y[col_i], vl, sz=9.5, col=BODY)
                    col_y[col_i] += 13
                col_y[col_i] += 8
            y = max(col_y)+4

        rect(cv, L, y, CW, 1, fill=BORDER); y += 14

    # ── PAGE 4: CLAIMS MATRIX ────────────────────────────────────────────────
    claims = report.get('claimsMatrix', {})
    cm_rows = claims.get('rows', [])
    cm_types = claims.get('claimTypes', [])

    if cm_rows:
        new_page()
        sec_header(cv, AMBER, ORANGE, 'SECTION', 'Claims Matrix', str(pg[0]), biz_name.upper())
        y = 6+72+20
        txt(cv, L, y, 'Which brands make which claims — Yes / No / Partial', sz=9.5, col=MUTED); y += 18

        claim_col_w = 110
        val_col_w = int((CW - claim_col_w) / len(cm_types)) if cm_types else 60
        cm_cols = [claim_col_w] + [val_col_w]*len(cm_types)
        headers = ['CLAIM TYPE'] + cm_types
        y = tbl_header(cv, y, cm_cols, headers)

        val_col_map = {'Yes': GREEN, 'No': CORAL, 'Partial': AMBER}
        for i, row in enumerate(cm_rows):
            vals = [row.get('claimType','')]
            vcols = [DARK_TEXT]
            for ct in cm_types:
                v = row.get('values',{}).get(ct, row.get(ct,'—'))
                vals.append(str(v))
                vcols.append(val_col_map.get(str(v), MUTED))
            y = tbl_row(cv, y, cm_cols, vals, even=(i%2==1), cell_cols=vcols)
            if y > H-80:
                new_page()
                cont_header(cv, AMBER, ORANGE, 'Claims Matrix', str(pg[0]))
                y = 4+36+20
                y = tbl_header(cv, y, cm_cols, headers)

    # ── PAGE 5: STRATEGIC LANDSCAPE ──────────────────────────────────────────
    new_page()
    sec_header(cv, GREEN, MINT, 'SECTION', 'Strategic Landscape', str(pg[0]), biz_name.upper())
    y = 6+72+20

    # Table Stakes
    table_stakes = report.get('tableStakes', [])
    white_space  = report.get('whiteSpace', [])
    if table_stakes or white_space:
        y = sub_head(cv, y, 'Market Map', INDIGO)
        ts_col_w = CW//2; ws_col_w = CW - ts_col_w
        y = tbl_header(cv, y, [ts_col_w, ws_col_w],
            ['TABLE STAKES — Everyone Claims This', 'WHITE SPACE — Unclaimed Opportunities'],
            col_bgs=[HexColor('#1E3A8A'), HexColor('#065F46')])
        max_r = max(len(table_stakes), len(white_space))
        for i in range(max_r):
            ts = table_stakes[i] if i < len(table_stakes) else ''
            ws_obj = white_space[i] if i < len(white_space) else {}
            ws_txt = f"{ws_obj.get('opportunity','')} — {ws_obj.get('rationale','')}" if ws_obj else ''
            y = tbl_row(cv, y, [ts_col_w, ws_col_w], [ts, ws_txt], even=(i%2==1))
            if y > H-80:
                new_page(); cont_header(cv, GREEN, MINT, 'Strategic Landscape', str(pg[0])); y = 4+36+20
                y = tbl_header(cv, y, [ts_col_w, ws_col_w], ['TABLE STAKES', 'WHITE SPACE'])

    # Buyer Anxieties
    anxieties = report.get('buyerAnxieties', [])
    if anxieties:
        if y + 80 > H-60:
            new_page(); cont_header(cv, GREEN, MINT, 'Strategic Landscape', str(pg[0])); y = 4+36+20
        y = sub_head(cv, y, 'Buyer Anxieties', AMBER)
        a_cols = [CW//3, CW//3, CW - 2*(CW//3)]
        y = tbl_header(cv, y, a_cols, ['BUYER CONCERN', 'ADDRESSED BY', 'IGNORED BY'],
            col_bgs=[HexColor('#4C1D95'), HexColor('#065F46'), HexColor('#7F1D1D')])
        for i, ba in enumerate(anxieties):
            y = tbl_row(cv, y, a_cols,
                [ba.get('concern',''), ba.get('addressedBy',''), ba.get('ignoredBy','')],
                even=(i%2==1), cell_cols=[DARK_TEXT, GREEN, CORAL])
            if y > H-80:
                new_page(); cont_header(cv, GREEN, MINT, 'Strategic Landscape', str(pg[0])); y = 4+36+20
                y = tbl_header(cv, y, a_cols, ['BUYER CONCERN', 'ADDRESSED BY', 'IGNORED BY'])

    # Noise to Avoid
    noise = report.get('noiseToAvoid', [])
    if noise:
        if y + 60 > H-60:
            new_page(); cont_header(cv, GREEN, MINT, 'Strategic Landscape', str(pg[0])); y = 4+36+20
        y = sub_head(cv, y, 'Noise to Avoid', CORAL)
        for n in noise:
            if y + 20 > H-60:
                new_page(); cont_header(cv, GREEN, MINT, 'Strategic Landscape', str(pg[0])); y = 4+36+20
            txt(cv, L+14, y, '✗  '+n, sz=10, col=CORAL); y += 16

    # Quick Wins
    quick_wins = report.get('quickWins', [])
    if quick_wins:
        if y + 60 > H-60:
            new_page(); cont_header(cv, GREEN, MINT, 'Strategic Landscape', str(pg[0])); y = 4+36+20
        y = sub_head(cv, y, 'Quick Wins', GREEN)
        eff_map = {'Easy':(TAG_GRN_BG,TAG_GRN_FG),'Medium':(TAG_AMB_BG,TAG_AMB_FG),'Hard':(TAG_RED_BG,TAG_RED_FG)}
        for qw in quick_wins:
            eff = qw.get('effort','Medium')
            eb, ef = eff_map.get(eff,(TAG_AMB_BG,TAG_AMB_FG))
            act_lines = simpleSplit(qw.get('action',''), 'Helvetica-Bold', 10.5, CW-100)
            why_lines = simpleSplit(qw.get('why',''), 'Helvetica', 9.5, CW-100)
            card_h = len(act_lines)*14 + len(why_lines)*13 + 30
            if y + card_h > H-60:
                new_page(); cont_header(cv, GREEN, MINT, 'Strategic Landscape', str(pg[0])); y = 4+36+20
            rect(cv, L, y, CW, card_h, fill=LIGHT_BG2, r=8)
            tag(cv, R-80, y+10, eff, eb, ef)
            cy = y+16
            cv.saveState(); cv.setFont('Helvetica-Bold',10.5); cv.setFillColor(DARK_TEXT)
            for ln in act_lines: cv.drawString(L+14, ry(cy), ln); cy += 14
            cv.restoreState()
            for ln in why_lines: txt(cv, L+14, cy, ln, sz=9.5, col=MUTED); cy += 13
            y += card_h+10

    # ── PAGE 6: STRATEGIC IMPLICATIONS ───────────────────────────────────────
    implications = report.get('strategicImplications', [])
    if implications:
        new_page()
        sec_header(cv, INDIGO, PURPLE, 'SECTION', 'Strategic Implications', str(pg[0]), biz_name.upper())
        y = 6+72+20
        for imp in implications:
            det_lines = simpleSplit(imp.get('detail',''), 'Helvetica', 10, CW-56)
            card_h = len(det_lines)*14 + 56
            if y + card_h > H-60:
                new_page(); cont_header(cv, INDIGO, PURPLE, 'Strategic Implications', str(pg[0])); y = 4+36+20
            rect(cv, L, y, CW, card_h, fill=WHITE, stroke=BORDER, r=10)
            rect(cv, L, y, 5, card_h, fill=INDIGO, r=2)
            cv.saveState(); cv.setFillColor(INDIGO); cv.circle(L+28, ry(y+20), 14, fill=1, stroke=0)
            cv.setFont('Helvetica-Bold',10); cv.setFillColor(WHITE)
            cv.drawCentredString(L+28, ry(y+24), str(imp.get('number',''))); cv.restoreState()
            txt(cv, L+52, y+16, imp.get('title',''), bold=True, sz=11.5, col=DARK_TEXT)
            cy = y+32
            for dl in det_lines: txt(cv, L+52, cy, dl, sz=10, col=BODY); cy += 14
            y += card_h+14

    cv.save(); buf.seek(0); return buf.read()


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length).decode('utf-8'))
            pdf = generate_competitor_pdf(body)
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

    def log_message(self, format, *args): pass
