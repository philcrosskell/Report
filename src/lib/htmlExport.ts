import type { Audit, SeoCheck } from './types'

export function exportHTML(audit: Audit) {
  const r = audit.report
  const url = audit.url
  const date = new Date(audit.date).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })
  const slug = audit.url.replace(/https?:\/\//,'').replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  const scoreColor = (s: number) => {
    if (s >= 80) return '#34d399'
    if (s >= 60) return '#fbbf24'
    return '#f87171'
  }

  const gradeColor = (g: string) => {
    if (!g) return '#a0a0b8'
    const letter = g[0].toUpperCase()
    if (letter === 'A') return '#34d399'
    if (letter === 'B') return '#60a5fa'
    if (letter === 'C') return '#fbbf24'
    return '#f87171'
  }

  const critColor = (c: string) => {
    if (c === 'critical') return '#f87171'
    if (c === 'high') return '#fbbf24'
    if (c === 'medium') return '#60a5fa'
    return '#a0a0b8'
  }

  const statusDot = (s: string) => {
    if (s === 'pass') return '#34d399'
    if (s === 'fail') return '#f87171'
    return '#fbbf24'
  }

  const seo = r.seo
  const lp = r.lp
  const seoScore = seo?.score ?? 0
  const lpScore = lp?.score ?? 0
  const overallScore = r.overview?.score ?? Math.round((seoScore + lpScore) / 2)
  const overallGrade = r.overview?.grade ?? seo?.grade ?? '–'

  const renderChecks = (checks: SeoCheck[] = []) => checks.map(c => `
    <tr>
      <td style="padding:10px 12px; border-bottom:1px solid #2e2e38; display:flex; align-items:center; gap:8px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${statusDot(c.status)};flex-shrink:0;display:inline-block;"></span>
        <span style="color:#f0f0f5;font-size:13px;">${c.label}</span>
      </td>
      <td style="padding:10px 12px; border-bottom:1px solid #2e2e38; color:#a0a0b8; font-size:12px; vertical-align:top;">${c.detail ?? ''}</td>
      <td style="padding:10px 12px; border-bottom:1px solid #2e2e38; vertical-align:top;">
        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${c.criticality === 'critical' ? 'rgba(248,113,113,0.15)' : c.criticality === 'high' ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)'};color:${critColor(c.criticality ?? 'low')};">${c.criticality ?? 'low'}</span>
      </td>
    </tr>
  `).join('')

  const renderSubScores = (sub: Record<string, {score:number;max:number;note?:string}> = {}): string =>
    Object.entries(sub).map(([key, val]) => {
      const pct = Math.round((val.score / val.max) * 100)
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
      return `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:13px;color:#f0f0f5;">${label}</span>
          <span style="font-size:13px;font-weight:600;color:${scoreColor(pct)};">${val.score}<span style="color:#a0a0b8;font-weight:400;">/ ${val.max}</span></span>
        </div>
        <div style="height:4px;background:#2e2e38;border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${scoreColor(pct)};border-radius:2px;"></div>
        </div>
        ${val.note ? `<p style="font-size:11px;color:#a0a0b8;margin:4px 0 0;">${val.note}</p>` : ''}
      </div>`
    }).join('')

  const renderQuickWins = (wins: {title?:string;fix?:string;problem?:string;rationale?:string;uplift?:string;difficulty?:string}[] = []): string => wins.slice(0,5).map((w, i) => `
    <div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #2e2e38;">
      <div style="width:24px;height:24px;border-radius:50%;background:#FFE500;color:#0f0f11;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:#f0f0f5;margin-bottom:2px;">${w.title ?? w.fix ?? ''}</div>
        <div style="font-size:12px;color:#a0a0b8;">${w.problem ?? w.rationale ?? ''}</div>
        ${w.uplift ? `<span style="font-size:11px;color:#34d399;margin-top:4px;display:inline-block;">+${w.uplift} uplift</span>` : ''}
      </div>
      ${w.difficulty ? `<span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#1e1e24;color:#a0a0b8;height:fit-content;white-space:nowrap;">${w.difficulty}</span>` : ''}
    </div>
  `).join('')

  const renderBuyerAnxieties = (anxieties: {anxiety?:string;owner?:string;addressed?:boolean;note?:string}[] = []): string => anxieties.map(a => `
    <div style="padding:12px 14px;background:#1e1e24;border-radius:8px;margin-bottom:8px;border-left:3px solid ${a.addressed ? '#34d399' : '#f87171'};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <span style="font-size:13px;color:#f0f0f5;">${a.anxiety ?? a.owner ?? ''}</span>
        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${a.addressed ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'};color:${a.addressed ? '#34d399' : '#f87171'};white-space:nowrap;">${a.addressed ? 'Addressed' : 'Not addressed'}</span>
      </div>
      ${a.note ? `<p style="font-size:12px;color:#a0a0b8;margin:6px 0 0;">${a.note}</p>` : ''}
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Audit Report — ${url}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #0f0f11; color: #f0f0f5; line-height: 1.6; }
    table { border-collapse: collapse; width: 100%; }
    a { color: #FFE500; text-decoration: none; }
    @media print {
      body { background: #0f0f11 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

<!-- HEADER -->
<div style="background:#16161a;border-bottom:1px solid #2e2e38;padding:0;">
  <div style="max-width:960px;margin:0 auto;padding:0 24px;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid #2e2e38;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:4px;height:32px;background:#FFE500;border-radius:2px;"></div>
        <div>
          <div style="font-size:15px;font-weight:700;color:#f0f0f5;">Audit Machine</div>
          <div style="font-size:11px;color:#a0a0b8;">by BEAL Creative</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;color:#a0a0b8;">${date}</div>
        <div style="font-size:12px;color:#60a5fa;">${url}</div>
      </div>
    </div>

    <!-- SCORE CARDS -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:20px 0;">
      <div style="background:#1e1e24;border:1px solid #2e2e38;border-radius:10px;padding:16px 20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:8px;">Overall Score</div>
        <div style="font-size:36px;font-weight:700;color:${scoreColor(overallScore)};">${overallScore}</div>
        <div style="font-size:13px;color:#a0a0b8;">Grade: <span style="color:${gradeColor(overallGrade)};font-weight:600;">${overallGrade}</span></div>
      </div>
      <div style="background:#1e1e24;border:1px solid #2e2e38;border-radius:10px;padding:16px 20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:8px;">SEO Score</div>
        <div style="font-size:36px;font-weight:700;color:${scoreColor(seoScore)};">${seoScore}</div>
        <div style="font-size:13px;color:#a0a0b8;">Grade: <span style="color:${gradeColor(seo?.grade ?? '–')};font-weight:600;">${seo?.grade ?? '–'}</span></div>
      </div>
      <div style="background:#1e1e24;border:1px solid #2e2e38;border-radius:10px;padding:16px 20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:8px;">LP Score</div>
        <div style="font-size:36px;font-weight:700;color:${scoreColor(lpScore)};">${lpScore}</div>
        <div style="font-size:13px;color:#a0a0b8;">Grade: <span style="color:${gradeColor(lp?.grade ?? '–')};font-weight:600;">${lp?.grade ?? '–'}</span></div>
      </div>
    </div>
  </div>
</div>

<div style="max-width:960px;margin:0 auto;padding:32px 24px;">

  <!-- EXECUTIVE SUMMARY -->
  ${r.overview?.executiveSummary ? `
  <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:10px;">Executive Summary</div>
    <p style="font-size:14px;color:#f0f0f5;line-height:1.7;">${r.overview.executiveSummary}</p>
  </div>` : ''}

  <!-- OPPORTUNITY -->
  ${r.overview?.opportunity ? `
  <div style="background:#1e1e24;border:1px solid #FFE500;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#FFE500;margin-bottom:10px;">Key Opportunity</div>
    <p style="font-size:14px;color:#f0f0f5;line-height:1.7;">${r.overview.opportunity}</p>
  </div>` : ''}

  <!-- QUICK WINS -->
  ${r.overview?.quickWins?.length ? `
  <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:4px;">Quick Wins</div>
    <div style="font-size:13px;color:#a0a0b8;margin-bottom:16px;">Highest impact actions to take first</div>
    ${renderQuickWins(r.overview.quickWins)}
  </div>` : ''}

  <!-- SEO SECTION -->
  ${seo ? `
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#FFE500;border-radius:2px;"></div>
      <h2 style="font-size:16px;font-weight:600;color:#f0f0f5;">SEO Analysis</h2>
      <span style="margin-left:auto;font-size:13px;color:${scoreColor(seoScore)};font-weight:600;">${seoScore} / 100</span>
    </div>

    <!-- SEO Sub-scores -->
    ${seo.subScores ? `
    <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:16px;">Score Breakdown</div>
      ${renderSubScores(seo.subScores as Record<string, {score:number;max:number;note?:string}>)}
    </div>` : ''}

    <!-- SEO Checks -->
    ${seo.checks?.length ? `
    <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid #2e2e38;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;">Technical Checks</div>
      </div>
      <table>
        <thead>
          <tr style="background:#1e1e24;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#a0a0b8;font-weight:500;text-transform:uppercase;letter-spacing:.06em;">Check</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#a0a0b8;font-weight:500;text-transform:uppercase;letter-spacing:.06em;">Detail</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#a0a0b8;font-weight:500;text-transform:uppercase;letter-spacing:.06em;">Priority</th>
          </tr>
        </thead>
        <tbody>${renderChecks(seo.checks)}</tbody>
      </table>
    </div>` : ''}
  </div>` : ''}

  <!-- LANDING PAGE SECTION -->
  ${lp ? `
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#60a5fa;border-radius:2px;"></div>
      <h2 style="font-size:16px;font-weight:600;color:#f0f0f5;">Landing Page Analysis</h2>
      <span style="margin-left:auto;font-size:13px;color:${scoreColor(lpScore)};font-weight:600;">${lpScore} / 100</span>
    </div>

    <!-- LP Sub-scores -->
    ${lp.subScores ? `
    <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:16px;">Score Breakdown</div>
      ${renderSubScores(lp.subScores as Record<string, {score:number;max:number;note?:string}>)}
    </div>` : ''}

    <!-- Buyer Anxieties -->
    ${lp.buyerAnxieties?.length ? `
    <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:4px;">Buyer Anxieties</div>
      <div style="font-size:13px;color:#a0a0b8;margin-bottom:16px;">Concerns visitors have that your page may or may not address</div>
      ${renderBuyerAnxieties(lp.buyerAnxieties)}
    </div>` : ''}

    <!-- Positioning -->
    ${lp.positioningNote ? `
    <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:10px;">Positioning</div>
      <p style="font-size:13px;color:#f0f0f5;">${lp.positioningNote}</p>
      ${lp.positioningStrength ? `<div style="margin-top:8px;font-size:12px;color:#a0a0b8;">Strength: <span style="color:#34d399;">${lp.positioningStrength}</span></div>` : ''}
    </div>` : ''}
  </div>` : ''}

  <!-- FOOTER -->
  <div style="border-top:1px solid #2e2e38;padding-top:20px;margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:3px;height:20px;background:#FFE500;border-radius:2px;"></div>
      <span style="font-size:12px;color:#a0a0b8;">Generated by <span style="color:#FFE500;">Audit Machine</span> by BEAL Creative</span>
    </div>
    <span style="font-size:12px;color:#a0a0b8;">${date}</span>
  </div>

</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `audit-${slug}-${new Date(audit.date).toISOString().split('T')[0]}.html`
  a.click()
}
