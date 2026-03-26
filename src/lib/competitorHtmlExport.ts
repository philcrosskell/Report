import type { CompetitorIntelligenceReport } from './types'

export function exportCompetitorHTML(report: CompetitorIntelligenceReport): void {
  const date = new Date(report.date).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })
  const slug = report.businessName.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  const scoreColor = (s: number) => s >= 56 ? '#10B981' : s >= 45 ? '#F59E0B' : '#EF4444'
  const effortStyle = (e: string) => e === 'Easy' ? 'background:#D1FAE5;color:#065F46' : e === 'Hard' ? 'background:#FEE2E2;color:#B91C1C' : 'background:#FEF3C7;color:#92400E'

  const card = (grad: string, label: string, title: string, body: string) => `
    <div style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:32px;box-shadow:0 8px 40px rgba(0,0,0,0.5)">
      <div style="background:#07090F">
        <div style="height:5px;background:linear-gradient(90deg,${grad})"></div>
        <div style="padding:22px 32px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.35);margin-bottom:6px">${label}</div>
          <div style="font-size:24px;font-weight:700;color:#fff">${title}</div>
        </div>
      </div>
      <div style="padding:28px 32px 36px">${body}</div>
    </div>`

  // WHO WE LOOKED AT table
  const whoTable = `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#F7F8FD">
            <th style="text-align:left;padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;border-bottom:1px solid #ECEEF7">COMPETITOR</th>
            <th style="text-align:left;padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;border-bottom:1px solid #ECEEF7">TIER</th>
            <th style="text-align:left;padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;border-bottom:1px solid #ECEEF7">SEO SCORE</th>
            <th style="text-align:left;padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;border-bottom:1px solid #ECEEF7">POSITIONING</th>
            <th style="text-align:left;padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;border-bottom:1px solid #ECEEF7">WHAT THEY DO WELL</th>
          </tr>
        </thead>
        <tbody>
          ${report.profiles.map(p => {
            const tierColor = p.tier === 'Premium' ? '#6366F1' : p.tier === 'Mid' ? '#F59E0B' : p.tier === 'Budget' ? '#EF4444' : '#10B981'
            const barPct = p.seoScore != null ? Math.round((p.seoScore / 62) * 100) : 0
            return `<tr style="border-bottom:1px solid #ECEEF7">
              <td style="padding:12px 14px">
                <div style="font-size:13px;font-weight:600;color:#0E1120">${p.name}</div>
                <div style="font-size:11px;color:#8B90AA">${p.url}</div>
              </td>
              <td style="padding:12px 14px"><span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;background:${tierColor}22;color:${tierColor}">${p.tier}</span></td>
              <td style="padding:12px 14px">
                ${p.seoScore != null ? `<div style="font-size:13px;font-weight:700;color:${scoreColor(p.seoScore)};margin-bottom:4px">${p.seoScore}/62</div>
                <div style="height:4px;background:#ECEEF7;border-radius:2px;width:80px"><div style="height:4px;border-radius:2px;background:${scoreColor(p.seoScore)};width:${barPct}%"></div></div>` : '<span style="color:#8B90AA">—</span>'}
              </td>
              <td style="padding:12px 14px;font-size:12px;color:#4A5280">${p.positioning}</td>
              <td style="padding:12px 14px;font-size:12px;color:#4A5280">${p.whatTheyDoWell}</td>
            </tr>`
          }).join('')}
        </tbody>
      </table>
    </div>`

  // SEO COMPARISON card
  const seoProfiles = report.profiles.filter(p => p.seoScore != null).sort((a,b) => (b.seoScore??0)-(a.seoScore??0))
  const seoCompCard = seoProfiles.length ? card('#6366F1,#3B82F6', 'SECTION', 'SEO Score Comparison', `
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">Technical SEO scores out of 62</div>
    ${seoProfiles.map(p => `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:13px;font-weight:600;color:#0E1120">${p.name}</span>
          <span style="font-size:13px;font-weight:700;color:${scoreColor(p.seoScore??0)}">${p.seoScore}/62</span>
        </div>
        <div style="height:8px;background:#ECEEF7;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${Math.round(((p.seoScore??0)/62)*100)}%;background:${scoreColor(p.seoScore??0)};border-radius:4px"></div>
        </div>
      </div>`).join('${seoProfiles[0]?.seoBreakdown ? `
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #ECEEF7">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:14px">BREAKDOWN BY CHECK</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#F7F8FD">
                <th style="text-align:left;padding:8px 12px;color:#8B90AA;font-size:10px;font-weight:700;letter-spacing:.08em;border-bottom:1px solid #ECEEF7">CHECK</th>
                ${seoProfiles.map(p => `<th style="text-align:center;padding:8px 12px;color:#8B90AA;font-size:10px;font-weight:700;letter-spacing:.08em;border-bottom:1px solid #ECEEF7">${p.name.toUpperCase()}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${[
                ['Title',           'title',           10],
                ['Meta Description','metaDescription',  8],
                ['H1',              'h1',               8],
                ['Word Count',      'wordCount',        8],
                ['HTTPS',           'https',            6],
                ['Viewport',        'viewport',         5],
                ['Image Alt',       'imageAlt',         5],
                ['Title H1 Alignment','titleH1Alignment',5],
                ['Schema',          'schema',           4],
                ['Canonical',       'canonical',        3],
                ['Response Time',   'responseTime',     3],
              ].map(([label, key, max], rowIdx) => `
                <tr style="border-bottom:1px solid #ECEEF7${rowIdx % 2 === 1 ? ';background:#F9FAFB' : ''}">
                  <td style="padding:8px 12px;color:#4A5280">${label}</td>
                  ${seoProfiles.map(p => {
                    const v = p.seoBreakdown?.[key] ?? 0
                    const pct = Math.round((v / max) * 100)
                    const col = pct === 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'
                    return `<td style="text-align:center;padding:8px 12px;font-weight:700;color:${col}">${v}/${max}</td>`
                  }).join('')}
                </tr>`).join('')}
              <tr style="background:#F7F8FD;font-weight:700;border-top:2px solid #ECEEF7">
                <td style="padding:10px 12px;color:#0E1120;font-weight:700">Total /62</td>
                ${seoProfiles.map(p => `<td style="text-align:center;padding:10px 12px;font-weight:700;color:${scoreColor(p.seoScore??0)}">${p.seoScore}/62</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>` : ''}

  // PROFILES section
  const profilesCard = card('#8B5CF6,#6366F1', 'SECTION', 'Competitor Profiles', `
    ${report.profiles.map(p => `
      <div style="border:1px solid #ECEEF7;border-radius:12px;overflow:hidden;margin-bottom:20px">
        <div style="background:#07090F;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:15px;font-weight:700;color:#fff">${p.name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.4)">${p.url}</div>
          </div>
          ${p.seoScore != null ? `<span style="font-size:13px;font-weight:700;color:${scoreColor(p.seoScore)}">${p.seoScore}/62</span>` : ''}
        </div>
        <div style="padding:18px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${[['Hook Type', p.hookType],['Hook Headline', p.hookHeadline],['Hook Effectiveness', p.hookEffectiveness],['Primary Anxiety', p.primaryAnxiety],['Outcome Promised', p.outcomePromised],['How They Prove It', p.howTheyProve],['Action Trigger', p.actionTrigger]].map(([l,v]) => `
            <div>
              <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:3px">${l}</div>
              <div style="font-size:12px;color:#4A5280">${v}</div>
            </div>`).join('')}
        </div>
      </div>`).join('')}
  `)

  // CLAIMS MATRIX
  const claimsCard = report.claimsMatrix?.rows?.length ? card('#F59E0B,#EF4444', 'SECTION', 'Claims Matrix', `
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#F7F8FD">
            <th style="text-align:left;padding:8px 12px;color:#8B90AA;font-size:10px;font-weight:700;letter-spacing:.08em;border-bottom:1px solid #ECEEF7">CLAIM TYPE</th>
            ${report.claimsMatrix.claimTypes.map(c => `<th style="text-align:center;padding:8px 12px;color:#8B90AA;font-size:10px;font-weight:700;letter-spacing:.08em;border-bottom:1px solid #ECEEF7">${c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${report.claimsMatrix.rows.map(row => `
            <tr style="border-bottom:1px solid #ECEEF7">
              <td style="padding:8px 12px;color:#4A5280;font-weight:600">${row.claimType}</td>
              ${report.claimsMatrix.claimTypes.map(c => {
                const v = row.values?.[c] ?? '—'
                const col = v === 'Yes' ? '#10B981' : v === 'No' ? '#EF4444' : v === 'Partial' ? '#F59E0B' : '#8B90AA'
                return `<td style="text-align:center;padding:8px 12px;font-weight:700;color:${col}">${v}</td>`
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `) : ''

  // STRATEGY section
  const stratCard = card('#10B981,#6366F1', 'SECTION', 'Strategic Landscape', `
    ${report.tableStakes?.length ? `
      <div style="margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:10px">TABLE STAKES</div>
        ${report.tableStakes.map(s => `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#6366F1;font-weight:700">Â·</span><span style="font-size:12px;color:#4A5280">${s}</span></div>`).join('')}
      </div>` : ''}
    ${report.whiteSpace?.length ? `
      <div style="margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:10px">WHITE SPACE OPPORTUNITIES</div>
        ${report.whiteSpace.map(w => `
          <div style="border:1px solid #ECEEF7;border-radius:10px;padding:14px 16px;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:#0E1120;margin-bottom:4px">${w.opportunity}</div>
            <div style="font-size:12px;color:#8B90AA;margin-bottom:4px">${w.rationale}</div>
            <span style="font-size:11px;font-weight:700;color:#6366F1">Owner: ${w.owner}</span>
          </div>`).join('')}
      </div>` : ''}
    ${report.buyerAnxieties?.length ? `
      <div style="margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:10px">BUYER ANXIETIES</div>
        ${report.buyerAnxieties.map(b => `
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;padding:10px 0;border-bottom:1px solid #ECEEF7;font-size:12px">
            <div style="color:#0E1120;font-weight:600">${b.concern}</div>
            <div style="color:#10B981">${b.addressedBy}</div>
            <div style="color:#EF4444">${b.ignoredBy}</div>
          </div>`).join('')}
      </div>` : ''}
    ${report.noiseToAvoid?.length ? `
      <div style="margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:10px">NOISE TO AVOID</div>
        ${report.noiseToAvoid.map(n => `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#EF4444;font-weight:700">Ã¢ÂÂ</span><span style="font-size:12px;color:#4A5280">${n}</span></div>`).join('')}
      </div>` : ''}
    ${report.quickWins?.length ? `
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:10px">QUICK WINS</div>
        ${report.quickWins.map(q => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid #ECEEF7;gap:12px">
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:#0E1120;margin-bottom:2px">${q.action}</div>
              <div style="font-size:12px;color:#8B90AA">${q.why}</div>
            </div>
            <span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:99px;${effortStyle(q.effort)};white-space:nowrap">${q.effort}</span>
          </div>`).join('')}
      </div>` : ''}
  `)

  // STRATEGIC IMPLICATIONS
  const implCard = report.strategicImplications?.length ? card('#6366F1,#8B5CF6', 'SECTION', 'Strategic Implications', `
    ${report.strategicImplications.map(s => `
      <div style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #ECEEF7">
        <div style="width:32px;height:32px;border-radius:50%;background:#6366F1;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0">${s.number}</div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#0E1120;margin-bottom:4px">${s.title}</div>
          <div style="font-size:12px;color:#4A5280;line-height:1.6">${s.detail}</div>
        </div>
      </div>`).join('')}
  `) : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Competitor Report — ${report.businessName}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;background:#0E1120;color:#0E1120}
.wrapper{max-width:900px;margin:0 auto;padding:40px 24px 80px}
@media print{body{background:#0E1120!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="wrapper">

<!-- HEADER -->
<div style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:32px;box-shadow:0 8px 40px rgba(0,0,0,0.5)">
  <div style="background:#07090F">
    <div style="height:5px;background:linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899)"></div>
    <div style="padding:28px 32px 24px;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:5px;height:40px;background:#FFE600;border-radius:3px;flex-shrink:0"></div>
        <div>
          <div style="font-size:19px;font-weight:400;color:#fff;line-height:1.2"><span style="font-weight:700">BEAL</span> Creative.</div>
          <div style="font-size:9px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,.35);margin-top:3px">AUDIT MACHINE</div>
        </div>
      </div>
      <div style="text-align:right;color:rgba(255,255,255,.25);font-size:11px">${date}</div>
    </div>
  </div>
  <div style="padding:32px 32px 36px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#8B5CF6;margin-bottom:10px">COMPETITOR ANALYSIS REPORT</div>
    <div style="font-size:36px;font-weight:700;color:#0E1120;line-height:1.1;margin-bottom:8px">${report.businessName}</div>
    <div style="font-size:13px;color:#8B90AA;margin-bottom:4px">${report.market ? report.market + ' Â· ' : ''}${report.profiles.length} competitors analysed</div>
    <a href="${report.businessUrl}" style="font-size:11px;color:#B0B5CC;text-decoration:none">${report.businessUrl}</a>
    ${report.summary ? `
    <div style="height:1px;background:linear-gradient(90deg,#ECEEF7,transparent);margin:20px 0"></div>
    <div style="font-size:13px;color:#4A5280;line-height:1.75">${report.summary}</div>` : ''}
  </div>
</div>

${card('#6366F1,#10B981', 'SECTION', 'Who We Looked At', whoTable)}
${seoCompCard}
${profilesCard}
${claimsCard}
${stratCard}
${implCard}

<!-- FOOTER -->
<div style="margin-top:32px;padding:20px 0;display:flex;align-items:center;justify-content:space-between">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="width:4px;height:28px;background:#FFE600;border-radius:2px"></div>
    <div>
      <div style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.6)"><strong style="color:#fff">BEAL</strong> Creative.</div>
      <div style="font-size:8px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,0.25)">AUDIT MACHINE</div>
    </div>
  </div>
  <div style="font-size:11px;color:rgba(255,255,255,0.25)">Generated ${date}</div>
</div>

</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `competitor-${slug}-${new Date(report.date).toISOString().split('T')[0]}.html`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href) }, 100)
}
