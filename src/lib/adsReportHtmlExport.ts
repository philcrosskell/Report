import type { AdsReport } from './adsReportStorage'

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function money(n: number): string {
  return 'A$' + n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function pct1(n: number): string {
  return n.toFixed(1) + '%'
}
function deltaLabel(now: number, prev: number | null): string {
  if (prev === null || prev === 0) return ''
  const d = ((now - prev) / prev) * 100
  const arrow = d >= 0 ? '▲' : '▼'
  return `${arrow} ${Math.abs(d).toFixed(0)}% vs. prior period`
}
function barRow(label: string, valueLabel: string, widthPct: number, alt: boolean): string {
  return `<div class="barrow"><div class="barlabel">${esc(label)}</div><div class="bartrack"><div class="barfill${alt ? ' alt' : ''}" style="width:${Math.min(100, Math.max(0, widthPct))}%"></div></div><div class="barval">${esc(valueLabel)}</div></div>`
}

export function buildAdsReportHtml(report: AdsReport): string {
  const d = report.data
  const k = d.kpis
  const clientName = esc(report.clientName)
  const period = esc(report.periodLabel)

  const kpiCards = [
    { val: money(k.spend), lbl: 'Total Ad Spend', delta: deltaLabel(k.spend, k.prevSpend) },
    { val: k.clicks.toString(), lbl: 'Clicks', delta: deltaLabel(k.clicks, k.prevClicks) },
    { val: k.conversions.toString(), lbl: 'Conversions', delta: 'This period' },
    { val: pct1(k.ctr), lbl: 'Click-Through Rate', delta: '' },
    { val: pct1(k.convRate), lbl: 'Conversion Rate', delta: '' },
    { val: k.optimizationScore !== null ? pct1(k.optimizationScore) : '—', lbl: 'Google Optimisation Score', delta: '' },
  ].map(c => `<div class="kpi"><div class="val">${c.val}</div><div class="lbl">${c.lbl}</div>${c.delta ? `<div class="delta up">${c.delta}</div>` : ''}</div>`).join('\n')

  const dailyMax = Math.max(1, ...d.daily.map(r => r.clicks))
  const dailyBars = d.daily.map(r => `<div class="hourbar" style="height:${Math.round((r.clicks / dailyMax) * 100)}%" title="${esc(r.date)} · ${r.clicks} clicks"></div>`).join('')

  const deviceMax = Math.max(1, ...d.device.map(r => r.clicks))
  const deviceBars = d.device.map((r, i) => barRow(r.device, `${r.clicks} clicks`, (r.clicks / deviceMax) * 100, i > 0)).join('\n')

  const genderBars = d.gender.map((r, i) => barRow(r.label, pct1(r.pct), r.pct, i > 0)).join('\n')
  const ageBars = d.age.map((r, i) => barRow(r.label, pct1(r.pct), r.pct, false)).join('\n')

  const keywordRows = d.topKeywords.map(r => `<tr><td>${esc(r.keyword)}</td><td class="num">${money(r.cost)}</td><td class="num">${r.clicks}</td><td class="num">${pct1(r.ctr)}</td></tr>`).join('\n')

  const longTailRows = report.approvedLongTail.map(r => `<tr><td>${esc(r.term)}</td><td colspan="2" style="color:var(--muted);">${esc(r.note)}</td></tr>`).join('\n')

  const dayRows = d.dayOfWeek.map(r => `<tr><td>${esc(r.day)}</td><td class="num">${r.clicks}</td><td class="num">${pct1(r.ctr)}</td><td class="num"${r.conversions === 0 ? ' style="color:var(--red);font-weight:700;"' : ''}>${r.conversions}</td></tr>`).join('\n')

  const hourMax = Math.max(1, ...d.hourOfDay.map(r => r.impressions))
  const hourBars = d.hourOfDay.map(r => `<div class="hourbar" style="height:${Math.round((r.impressions / hourMax) * 100)}%" title="${esc(r.hour)}"></div>`).join('')

  const channelRows = d.gaChannels.map(r => `<tr><td>${esc(r.channel)}</td><td class="num">${r.sessions}</td><td class="num">${pct1(r.pct)}</td><td class="num">${r.keyEvents}</td><td class="num">${r.convRate !== null ? pct1(r.convRate) : '—'}</td></tr>`).join('\n')
  const pageRows = d.gaPages.map(r => `<tr><td>${esc(r.page)}</td><td class="num">${r.views}</td><td class="num">${r.users}</td><td class="num">${r.keyEvents}</td></tr>`).join('\n')
  const attrRows = d.attributionPaths.map(r => `<tr><td>${esc(r.path)}</td><td class="num">${r.keyEvents}</td><td class="num">${r.avgDays.toFixed(1)}</td><td class="num">${r.touchpoints}</td></tr>`).join('\n')

  const recRows = report.recommendations.map((r, i) => `
    <li>
      <div class="rec-num">${i + 1}</div>
      <div class="rec-body">
        <b>${esc(r.title)}</b><span class="priority-flag ${r.priority}">${r.priority === 'quick' ? 'Quick win' : 'Strategic'}</span>
        <p>${esc(r.description)}</p>
      </div>
    </li>`).join('\n')

  const negRows = report.approvedNegative.map(r => `<tr><td>${esc(r.term)}</td><td class="num">${money(r.cost)}</td><td>${esc(r.reason)}</td></tr>`).join('\n')

  const colorClasses = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${clientName} — Performance Report</title>
<style>
:root{
  --black:#141414; --black-soft:#242424; --yellow:#FFE500; --yellow-soft:#fdf3b0;
  --navy:#141414; --navy-light:#242424; --teal:#FFE500; --teal-light:#fdf3b0;
  --c-green:#22c55e; --c-purple:#c026d3; --c-blue:#2563eb; --c-orange:#f2622e;
  --amber:#d97706; --amber-light:#fef3c7; --red:#dc2626; --red-light:#fee2e2;
  --green:#16a34a; --green-light:#dcfce7; --bg:#ffffff; --card:#ffffff;
  --border:#e5e5e5; --text:#1a1a1a; --muted:#64748b; --radius:10px;
}
*{box-sizing:border-box;}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--text);line-height:1.5;}
.page{max-width:960px;margin:0 auto 28px;background:var(--card);border-radius:var(--radius);border:1px solid var(--border);box-shadow:0 1px 3px rgba(20,20,20,0.06);padding:40px 48px;}
.page:first-child{margin-top:28px;}
.cover{background:linear-gradient(135deg,var(--navy) 0%,var(--navy-light) 100%);color:#fff;text-align:center;padding:72px 48px;}
.cover .eyebrow{text-transform:uppercase;letter-spacing:2px;font-size:13px;color:var(--yellow);font-weight:700;margin-bottom:18px;}
.cover h1{font-size:34px;margin:0 0 12px;font-weight:700;}
.cover .client-name{font-size:22px;color:#fff;font-weight:600;margin-bottom:6px;}
.cover .period{font-size:15px;color:#b8b8b8;margin-bottom:44px;}
.cover-stats{display:flex;justify-content:center;gap:36px;flex-wrap:wrap;margin-top:20px;}
.cover-stat{min-width:120px;}
.cover-stat .num{font-size:28px;font-weight:700;color:var(--yellow);}
.cover-stat .lbl{font-size:12px;color:#b8b8b8;text-transform:uppercase;letter-spacing:1px;margin-top:4px;}
.cover-footer{margin-top:60px;font-size:13px;color:#8a8a8a;}
.section-title{display:flex;align-items:center;gap:12px;margin-bottom:6px;}
.section-num{background:var(--black);color:var(--yellow);width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;}
.section-num.c1{background:var(--yellow);color:#141414;} .section-num.c2{background:var(--c-green);color:#141414;}
.section-num.c3{background:var(--c-purple);color:#fff;} .section-num.c4{background:var(--c-blue);color:#fff;}
.section-num.c5{background:var(--c-orange);color:#141414;} .section-num.c6{background:var(--yellow);color:#141414;}
.section-num.c7{background:var(--c-green);color:#141414;} .section-num.c8{background:var(--c-purple);color:#fff;}
.section-title h2{font-size:21px;margin:0;color:var(--navy);}
.section-sub{color:var(--muted);font-size:13.5px;margin:0 0 24px 42px;}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:26px;}
.kpi{border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;background:#fbfcfd;}
.kpi .val{font-size:24px;font-weight:700;color:var(--navy);}
.kpi .lbl{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;}
.kpi .delta{font-size:12.5px;margin-top:8px;font-weight:600;display:inline-flex;align-items:center;gap:4px;}
.delta.up{color:var(--green);}
.callout{border-radius:var(--radius);padding:14px 18px;font-size:14px;margin:14px 0;border-left:4px solid var(--yellow);background:var(--yellow-soft);}
.callout.good{border-color:var(--green);background:var(--green-light);}
.callout.watch{border-color:var(--amber);background:var(--amber-light);}
.callout.alert{border-color:var(--red);background:var(--red-light);}
.callout strong{display:block;margin-bottom:2px;color:var(--navy);}
p.narrative{font-size:14.5px;color:var(--text);margin:10px 0 20px;}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;}
th{text-align:left;background:var(--black);color:#fff;padding:9px 12px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.3px;}
th:first-child{border-radius:6px 0 0 0;} th:last-child{border-radius:0 6px 0 0;}
td{padding:9px 12px;border-bottom:1px solid var(--border);}
tr:nth-child(even) td{background:#fafbfc;}
td.num{text-align:right;font-variant-numeric:tabular-nums;}
th.num{text-align:right;}
.tag{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;}
.tag.good{background:var(--green-light);color:var(--green);} .tag.watch{background:var(--amber-light);color:var(--amber);} .tag.alert{background:var(--red-light);color:var(--red);}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:28px;}
.cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
.barchart{margin:10px 0 4px;}
.barrow{display:flex;align-items:center;gap:10px;margin-bottom:7px;font-size:12.5px;}
.barrow .barlabel{width:92px;flex-shrink:0;color:var(--muted);}
.barrow .bartrack{flex:1;background:#eef1f4;border-radius:6px;height:16px;position:relative;overflow:hidden;}
.barrow .barfill{height:100%;border-radius:6px;background:var(--yellow);}
.barrow .barfill.alt{background:var(--black);}
.barrow .barval{width:70px;text-align:right;flex-shrink:0;font-weight:600;color:var(--text);}
.hourchart{display:flex;align-items:flex-end;gap:2px;height:90px;margin:14px 0 6px;}
.hourbar{flex:1;background:var(--yellow);border-radius:2px 2px 0 0;min-width:2px;}
.hourchart-labels{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:2px;}
h3.mini-title{font-size:14px;color:var(--navy);margin:0 0 10px;}
ul.rec-list{margin:0;padding-left:0;list-style:none;}
ul.rec-list li{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);}
ul.rec-list li:last-child{border-bottom:none;}
.rec-num{background:var(--black);color:var(--yellow);width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.rec-body b{color:var(--navy);}
.rec-body p{margin:3px 0 0;font-size:13.5px;color:var(--muted);}
.priority-flag{font-size:10px;font-weight:700;text-transform:uppercase;padding:2px 7px;border-radius:4px;margin-left:8px;vertical-align:middle;}
.priority-flag.quick{background:var(--green-light);color:var(--green);} .priority-flag.strategic{background:var(--amber-light);color:var(--amber);}
.footer-note{text-align:center;color:var(--muted);font-size:12px;margin:10px auto 40px;max-width:960px;padding:0 20px;}
@media (max-width:720px){
  .page{padding:26px 20px;border-radius:0;} .kpi-grid{grid-template-columns:repeat(2,1fr);}
  .cols2, .cols3{grid-template-columns:1fr;} .cover{padding:48px 24px;} .cover h1{font-size:26px;}
  .cover-stats{gap:20px;} table{font-size:11.5px;} th,td{padding:7px 8px;} .barrow .barlabel{width:70px;font-size:11px;}
}
@media print{
  body{background:#fff;}
  .page{box-shadow:none;border-radius:0;margin:0;max-width:100%;padding:26px 34px;page-break-after:always;}
  .page:last-child{page-break-after:auto;}
  .cover{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  th{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}
</style>
</head>
<body>

<section class="page cover">
  <div class="eyebrow">Monthly Performance Report</div>
  <h1>Google Ads &amp; Website Performance</h1>
  <div class="client-name">${clientName}</div>
  <div class="period">Reporting period: ${period}</div>
  <div class="cover-stats">
    <div class="cover-stat"><div class="num">${money(k.spend)}</div><div class="lbl">Ad Spend</div></div>
    <div class="cover-stat"><div class="num">${k.clicks}</div><div class="lbl">Clicks</div></div>
    <div class="cover-stat"><div class="num">${k.conversions}</div><div class="lbl">Conversions</div></div>
    <div class="cover-stat"><div class="num">${money(k.costPerConv)}</div><div class="lbl">Cost / Conversion</div></div>
  </div>
  <div class="cover-footer">Prepared by BEAL Creative &nbsp;·&nbsp; report generated ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
</section>

<section class="page">
  <div class="section-title"><div class="section-num ${colorClasses[0]}">1</div><h2>Executive Summary</h2></div>
  <p class="section-sub">The headline numbers for the period, and what they mean for the business.</p>
  <div class="kpi-grid">${kpiCards}</div>
  <p class="narrative">
    Over this period, ${clientName} spent ${money(k.spend)} on Google Ads generating ${k.clicks} clicks and ${k.conversions} conversions
    (${pct1(k.convRate)} conversion rate), at a blended cost of ${money(k.costPerConv)} per conversion. Click-through rate came in at
    ${pct1(k.ctr)}${k.optimizationScore !== null ? `, and the account's Google Optimisation Score sits at ${pct1(k.optimizationScore)}.` : '.'}
  </p>
</section>

<section class="page">
  <div class="section-title"><div class="section-num ${colorClasses[1]}">2</div><h2>Google Ads Campaign Performance</h2></div>
  <p class="section-sub">Daily trend across the reporting period</p>
  <div class="hourchart">${dailyBars}</div>
  <div class="hourchart-labels"><span>${d.daily[0]?.date ?? ''}</span><span>${d.daily[d.daily.length - 1]?.date ?? ''}</span></div>
  <div class="cols2" style="margin-top:24px;">
    <div>
      <h3 class="mini-title">Period vs. prior period</h3>
      <table>
        <tr><th>Metric</th><th class="num">This period</th><th class="num">Prior period</th></tr>
        <tr><td>Ad spend</td><td class="num">${money(k.spend)}</td><td class="num">${k.prevSpend !== null ? money(k.prevSpend) : '—'}</td></tr>
        <tr><td>Clicks</td><td class="num">${k.clicks}</td><td class="num">${k.prevClicks !== null ? k.prevClicks : '—'}</td></tr>
        <tr><td>Avg. CPC</td><td class="num">${money(k.avgCpc)}</td><td class="num">${k.prevAvgCpc !== null ? money(k.prevAvgCpc) : '—'}</td></tr>
        <tr><td>Conversions</td><td class="num">${k.conversions}</td><td class="num">—</td></tr>
      </table>
    </div>
    <div>
      <h3 class="mini-title">Device split (clicks)</h3>
      <div class="barchart">${deviceBars}</div>
    </div>
  </div>
</section>

<section class="page">
  <div class="section-title"><div class="section-num ${colorClasses[2]}">3</div><h2>Who's Seeing Your Ads</h2></div>
  <p class="section-sub">Age and gender split of ad impressions</p>
  <div class="cols2">
    <div><h3 class="mini-title">Gender</h3><div class="barchart">${genderBars}</div></div>
    <div><h3 class="mini-title">Age range</h3><div class="barchart">${ageBars}</div></div>
  </div>
</section>

<section class="page">
  <div class="section-title"><div class="section-num ${colorClasses[3]}">4</div><h2>Keyword &amp; Search Term Performance</h2></div>
  <p class="section-sub">What people typed before clicking your ad</p>
  <h3 class="mini-title">Top keywords by spend</h3>
  <table><tr><th>Keyword</th><th class="num">Cost</th><th class="num">Clicks</th><th class="num">CTR</th></tr>${keywordRows}</table>
</section>

<section class="page">
  <div class="section-title"><div class="section-num ${colorClasses[4]}">5</div><h2>Recommended Keywords: Add &amp; Exclude</h2></div>
  <p class="section-sub">Reviewed and approved by BEAL Creative before this report was generated</p>
  <div class="cols2">
    <div>
      <h3 class="mini-title">Positive: keywords to add</h3>
      <table><tr><th>Term</th><th colspan="2">Why</th></tr>${longTailRows || '<tr><td colspan="3" style="color:var(--muted);">No keyword additions suggested this period.</td></tr>'}</table>
    </div>
    <div>
      <h3 class="mini-title">Negative: keywords to exclude</h3>
      <table><tr><th>Term</th><th class="num">Cost</th><th>Reason</th></tr>${negRows || '<tr><td colspan="3" style="color:var(--muted);">No negative keyword candidates flagged this period.</td></tr>'}</table>
    </div>
  </div>
</section>

<section class="page">
  <div class="section-title"><div class="section-num ${colorClasses[5]}">6</div><h2>When Customers Search</h2></div>
  <p class="section-sub">Day-of-week and time-of-day patterns — useful for budget pacing</p>
  <h3 class="mini-title">Clicks &amp; conversions by day</h3>
  <table><tr><th>Day</th><th class="num">Clicks</th><th class="num">CTR</th><th class="num">Conversions</th></tr>${dayRows}</table>
  <h3 class="mini-title">Impressions by hour of day</h3>
  <div class="hourchart">${hourBars}</div>
</section>

<section class="page">
  <div class="section-title"><div class="section-num ${colorClasses[6]}">7</div><h2>Website Performance (Google Analytics)</h2></div>
  <p class="section-sub">How traffic from all sources behaves once it lands on the site</p>
  <h3 class="mini-title">Traffic channels</h3>
  <table><tr><th>Channel</th><th class="num">Sessions</th><th class="num">Share</th><th class="num">Key events</th><th class="num">Conv. rate</th></tr>${channelRows}</table>
  <h3 class="mini-title">Top pages</h3>
  <table><tr><th>Page</th><th class="num">Views</th><th class="num">Users</th><th class="num">Key events</th></tr>${pageRows}</table>
  ${d.attributionPaths.length ? `<h3 class="mini-title">How customers actually convert (attribution paths)</h3>
  <table><tr><th>Customer journey</th><th class="num">Key events</th><th class="num">Avg. days to convert</th><th class="num">Touchpoints</th></tr>${attrRows}</table>` : ''}
</section>

<section class="page">
  <div class="section-title"><div class="section-num ${colorClasses[7]}">8</div><h2>Recommendations &amp; Next Steps</h2></div>
  <p class="section-sub">Reviewed and approved by BEAL Creative before this report was generated</p>
  <ul class="rec-list">${recRows}</ul>
</section>

<div class="footer-note">
  Prepared by BEAL Creative for ${clientName} · Data sources: Google Ads, Google Analytics 4 (${period}) · All figures in AUD.
</div>

</body>
</html>`
}

export function exportAdsReportHtml(report: AdsReport): void {
  const html = buildAdsReportHtml(report)
  const slug = report.clientName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const blob = new Blob([html], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `ads-report-${slug || 'client'}-${new Date().toISOString().split('T')[0]}.html`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href) }, 100)
}
