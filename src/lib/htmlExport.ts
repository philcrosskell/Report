import type { Audit, SeoCheck, LpSubScore, PriorityFix, SeoCategory, LpCategory } from './types'

export function exportHTML(audit: Audit) {
  const r = audit.report
  const url = audit.url
  const date = new Date(audit.date).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })
  const slug = audit.url.replace(/https?:\/\//,'').replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  const seoScore = audit.scores.seo ?? 0
  const lpScore = audit.scores.lp ?? 0
  const overallScore = audit.scores.overall ?? Math.round((seoScore + lpScore) / 2)
  const overallGrade = audit.scores.grade ?? '–'

  const scoreColor = (s: number) => s >= 80 ? '#34d399' : s >= 60 ? '#fbbf24' : '#f87171'
  const gradeColor = (g: string) => {
    if (!g) return '#a0a0b8'
    const l = g[0].toUpperCase()
    if (l === 'A') return '#34d399'
    if (l === 'B') return '#60a5fa'
    if (l === 'C') return '#fbbf24'
    return '#f87171'
  }
  const critColor = (c: string) =>
    c === 'critical' ? '#f87171' : c === 'important' ? '#fbbf24' : c === 'somewhat' ? '#60a5fa' : '#a0a0b8'
  const statusDot = (s: string) =>
    s === 'pass' ? '#34d399' : s === 'fail' ? '#f87171' : '#fbbf24'

  const renderChecks = (checks: SeoCheck[] = []): string => checks.map(c => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2e2e38;display:flex;align-items:center;gap:8px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${statusDot(c.status)};flex-shrink:0;display:inline-block;"></span>
        <span style="color:#f0f0f5;font-size:13px;">${c.label}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #2e2e38;color:#a0a0b8;font-size:12px;vertical-align:top;">${c.detail ?? ''}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2e2e38;vertical-align:top;">
        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${c.criticality === 'critical' ? 'rgba(248,113,113,0.15)' : c.criticality === 'important' ? 'rgba(251,191,36,0.15)' : 'rgba(96,165,250,0.15)'};color:${critColor(c.criticality ?? 'low')};">${c.criticality ?? 'low'}</span>
      </td>
    </tr>
  `).join('')

  const renderLpSubScores = (subs: LpSubScore[] = []): string => subs.map(s => {
    const pct = Math.round(s.score)
    return `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;color:#f0f0f5;">${s.label}</span>
        <span style="font-size:13px;font-weight:600;color:${scoreColor(pct)};">${s.score}<span style="color:#a0a0b8;font-weight:400;">/ ${s.max}</span></span>
      </div>
      <div style="height:4px;background:#2e2e38;border-radius:2px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${scoreColor(pct)};border-radius:2px;"></div>
      </div>
      ${s.note ? `<p style="font-size:11px;color:#a0a0b8;margin:4px 0 0;">${s.note}</p>` : ''}
    </div>`
  }).join('')

  const renderSeoCategory = (label: string, cat: SeoCategory): string => `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;color:#f0f0f5;">${label}</span>
        <span style="font-size:13px;font-weight:600;color:${scoreColor(cat.score)};">${cat.score}</span>
      </div>
      <div style="height:4px;background:#2e2e38;border-radius:2px;overflow:hidden;">
        <div style="height:100%;width:${cat.score}%;background:${scoreColor(cat.score)};border-radius:2px;"></div>
      </div>
    </div>`

  const renderPriorityFixes = (fixes: PriorityFix[] = []): string => fixes.slice(0,5).map((f, i) => `
    <div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #2e2e38;">
      <div style="width:24px;height:24px;border-radius:50%;background:#FFE500;color:#0f0f11;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${f.rank ?? i+1}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:#f0f0f5;margin-bottom:2px;">${f.title}</div>
        <div style="font-size:12px;color:#a0a0b8;margin-bottom:4px;">${f.problem}</div>
        <div style="font-size:12px;color:#f0f0f5;">${f.fix}</div>
        ${f.uplift ? `<span style="font-size:11px;color:#34d399;margin-top:4px;display:inline-block;">Uplift: ${f.uplift}</span>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0;">
        <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#1e1e24;color:#a0a0b8;">${f.difficulty}</span>
        <span style="font-size:11px;color:#a0a0b8;">${f.timeline}</span>
      </div>
    </div>
  `).join('')

  const seoCategories = r.seoCategories
  const lpScoring = r.lpScoring
  const allSeoChecks: SeoCheck[] = seoCategories
    ? Object.values(seoCategories).flatMap((cat: SeoCategory) => cat.checks ?? [])
    : []

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
    }
  </style>
</head>
<body>

<!-- HEADER -->
<div style="background:#16161a;border-bottom:1px solid #2e2e38;">
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
        <div style="font-size:13px;color:#a0a0b8;">Grade: <span style="color:${gradeColor(String(overallGrade))};font-weight:600;">${overallGrade}</span></div>
      </div>
      <div style="background:#1e1e24;border:1px solid #2e2e38;border-radius:10px;padding:16px 20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:8px;">SEO Score</div>
        <div style="font-size:36px;font-weight:700;color:${scoreColor(seoScore)};">${seoScore}</div>
      </div>
      <div style="background:#1e1e24;border:1px solid #2e2e38;border-radius:10px;padding:16px 20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:8px;">LP Score</div>
        <div style="font-size:36px;font-weight:700;color:${scoreColor(lpScore)};">${lpScore}</div>
      </div>
    </div>
  </div>
</div>

<div style="max-width:960px;margin:0 auto;padding:32px 24px;">

  <!-- EXECUTIVE SUMMARY -->
  ${r.overview?.summary ? `
  <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:10px;">Executive Summary</div>
    <p style="font-size:14px;color:#f0f0f5;line-height:1.7;">${r.overview.summary}</p>
  </div>` : ''}

  <!-- STRENGTHS & WEAKNESSES -->
  ${r.strengthsWeaknesses ? `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    <div style="background:#16161a;border:1px solid #34d399;border-radius:10px;padding:20px 24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#34d399;margin-bottom:12px;">Strengths</div>
      ${(r.strengthsWeaknesses.strengths ?? []).map(s => `
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <span style="color:#34d399;flex-shrink:0;">✓</span>
          <span style="font-size:13px;color:#f0f0f5;">${s}</span>
        </div>`).join('')}
    </div>
    <div style="background:#16161a;border:1px solid #f87171;border-radius:10px;padding:20px 24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#f87171;margin-bottom:12px;">Weaknesses</div>
      ${(r.strengthsWeaknesses.weaknesses ?? []).map(w => `
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <span style="color:#f87171;flex-shrink:0;">✗</span>
          <span style="font-size:13px;color:#f0f0f5;">${w}</span>
        </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- PRIORITY FIXES -->
  ${r.priorityFixes?.length ? `
  <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:4px;">Priority Fixes</div>
    <div style="font-size:13px;color:#a0a0b8;margin-bottom:16px;">Ranked by impact</div>
    ${renderPriorityFixes(r.priorityFixes)}
  </div>` : ''}

  <!-- SEO CATEGORIES -->
  ${seoCategories ? `
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#FFE500;border-radius:2px;"></div>
      <h2 style="font-size:16px;font-weight:600;color:#f0f0f5;">SEO Analysis</h2>
      <span style="margin-left:auto;font-size:13px;color:${scoreColor(seoScore)};font-weight:600;">${seoScore} / 100</span>
    </div>
    <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:16px;">Category Breakdown</div>
      ${renderSeoCategory('Meta Information', seoCategories.metaInformation)}
      ${renderSeoCategory('Page Quality', seoCategories.pageQuality)}
      ${renderSeoCategory('Page Structure', seoCategories.pageStructure)}
      ${renderSeoCategory('Link Structure', seoCategories.linkStructure)}
      ${renderSeoCategory('Server & Technical', seoCategories.serverTechnical)}
      ${renderSeoCategory('External Factors', seoCategories.externalFactors)}
    </div>
    ${allSeoChecks.length ? `
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
        <tbody>${renderChecks(allSeoChecks)}</tbody>
      </table>
    </div>` : ''}
  </div>` : ''}

  <!-- LP SCORING -->
  ${lpScoring ? `
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#60a5fa;border-radius:2px;"></div>
      <h2 style="font-size:16px;font-weight:600;color:#f0f0f5;">Landing Page Analysis</h2>
      <span style="margin-left:auto;font-size:13px;color:${scoreColor(lpScore)};font-weight:600;">${lpScore} / 100</span>
    </div>
    <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:16px;">Category Breakdown</div>
      ${Object.entries(lpScoring).map(([key, cat]) => {
        const c = cat as LpCategory
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
        return `
        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:13px;color:#f0f0f5;">${label}</span>
            <span style="font-size:13px;font-weight:600;color:${scoreColor(c.percentage ?? 0)};">${c.score}<span style="color:#a0a0b8;font-weight:400;">/ ${c.maxScore}</span></span>
          </div>
          <div style="height:4px;background:#2e2e38;border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${c.percentage ?? 0}%;background:${scoreColor(c.percentage ?? 0)};border-radius:2px;"></div>
          </div>
          ${c.assessment ? `<p style="font-size:12px;color:#a0a0b8;margin-top:4px;">${c.assessment}</p>` : ''}
          ${c.subScores?.length ? renderLpSubScores(c.subScores) : ''}
        </div>`
      }).join('')}
    </div>
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
