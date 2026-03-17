import type { SavedCompetitorReport } from './types'

export function exportCompetitorHTML(saved: SavedCompetitorReport): void {
  const r = saved.report
  const date = new Date(saved.date).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })
  const slug = saved.businessUrl.replace(/https?:\/\//,'').replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  const effortColor = (e: string) => e === 'Easy' ? { bg:'#D1FAE5', color:'#065F46', label:'Easy Fix' } : e === 'Hard' ? { bg:'#FEE2E2', color:'#991B1B', label:'Hard Fix' } : { bg:'#FEF3C7', color:'#92400E', label:'Medium Fix' }
  const effortAccent = (e: string) => e === 'Easy' ? { bg:'#ECFDF5', circle:'#10B981' } : e === 'Hard' ? { bg:'#FEF2F2', circle:'#EF4444' } : { bg:'#FFFBEB', circle:'#F59E0B' }

  const card = (gradientColors: string, title: string, body: string) => `
    <div style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:32px;box-shadow:0 8px 40px rgba(0,0,0,0.5)">
      <div style="background:#07090F">
        <div style="height:5px;background:linear-gradient(90deg,${gradientColors})"></div>
        <div style="padding:22px 32px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.35);margin-bottom:6px">SECTION</div>
          <div style="font-size:24px;font-weight:700;color:#fff">${title}</div>
        </div>
      </div>
      <div style="padding:28px 32px 36px">${body}</div>
    </div>`

  const renderQuickWins = (wins: { action: string; why: string; effort: 'Easy' | 'Medium' | 'Hard' }[] = []): string =>
    wins.slice(0,5).map((w, i) => {
      const badge = effortColor(w.effort)
      const accent = effortAccent(w.effort)
      return `
      <div style="display:flex;border-radius:12px;overflow:hidden;border:1px solid #ECEEF7;margin-bottom:16px;box-shadow:0 2px 14px rgba(0,0,0,0.12)">
        <div style="width:52px;background:${accent.bg};display:flex;flex-direction:column;align-items:center;padding-top:20px;flex-shrink:0">
          <div style="width:34px;height:34px;border-radius:50%;background:${accent.circle};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff">${i+1}</div>
        </div>
        <div style="flex:1;padding:18px 20px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700;color:#0E1120">${w.action}</div>
            <span style="display:inline-block;background:${badge.bg};color:${badge.color};font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:.04em;white-space:nowrap">${badge.label}</span>
          </div>
          <div style="font-size:12px;color:#8B90AA;line-height:1.7">${w.why}</div>
        </div>
      </div>`
    }).join('')

  const renderProfiles = (): string => (r.profiles ?? []).map(p => `
    <div style="border-radius:12px;border:1px solid #ECEEF7;overflow:hidden;margin-bottom:20px;box-shadow:0 2px 14px rgba(0,0,0,0.08)">
      <div style="padding:18px 24px;background:#F7F8FD;border-bottom:1px solid #ECEEF7;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:15px;font-weight:700;color:#0E1120">${p.name}</div>
          <a href="${p.url.startsWith('http') ? p.url : 'https://'+p.url}" style="font-size:11px;color:#6366F1;text-decoration:none">${p.url}</a>
        </div>
        <span style="font-size:10px;font-weight:700;padding:4px 12px;border-radius:99px;background:#EDE9FE;color:#5B21B6">${p.tier}</span>
      </div>
      <div style="padding:20px 24px">
        ${p.positioning ? `<div style="margin-bottom:14px"><div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#6366F1;margin-bottom:5px">POSITIONING</div><div style="font-size:13px;color:#4A5280;line-height:1.7">${p.positioning}</div></div>` : ''}
        ${p.whatTheyDoWell ? `<div style="margin-bottom:14px;padding:12px 16px;background:#ECFDF5;border-radius:8px;border-left:3px solid #10B981"><div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#10B981;margin-bottom:4px">WHAT THEY DO WELL</div><div style="font-size:12px;color:#4A5280;line-height:1.65">${p.whatTheyDoWell}</div></div>` : ''}
        ${p.hookHeadline ? `<div style="margin-bottom:14px"><div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#8B90AA;margin-bottom:5px">HOOK (${p.hookType?.toUpperCase() ?? ''})</div><div style="font-size:13px;font-weight:600;color:#0E1120;margin-bottom:4px">${p.hookHeadline}</div><div style="font-size:12px;color:#8B90AA">${p.hookEffectiveness}</div></div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px">
          ${p.primaryAnxiety ? `<div style="padding:12px 14px;background:#FEF2F2;border-radius:8px;border-left:3px solid #EF4444"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;color:#EF4444;margin-bottom:4px">PRIMARY ANXIETY TARGETED</div><div style="font-size:12px;color:#4A5280;line-height:1.6">${p.primaryAnxiety}</div></div>` : ''}
          ${p.outcomePromised ? `<div style="padding:12px 14px;background:#ECFDF5;border-radius:8px;border-left:3px solid #10B981"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;color:#10B981;margin-bottom:4px">OUTCOME PROMISED</div><div style="font-size:12px;color:#4A5280;line-height:1.6">${p.outcomePromised}</div></div>` : ''}
        </div>
        ${p.actionTrigger ? `<div style="margin-top:12px;padding:12px 14px;background:#F5F6FF;border-radius:8px"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;color:#6366F1;margin-bottom:4px">ACTION TRIGGER</div><div style="font-size:12px;color:#4A5280">${p.actionTrigger}</div></div>` : ''}
      </div>
    </div>`).join('')

  const renderClaimsMatrix = (): string => {
    if (!r.claimsMatrix?.rows?.length) return ''
    const competitors = r.profiles?.map(p => p.name) ?? []
    const allNames = [saved.businessName, ...competitors]
    return `
    <div style="overflow-x:auto;border-radius:10px;border:1px solid #ECEEF7;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08)">
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#F7F8FD;">
            <th style="padding:12px 16px;text-align:left;color:#8B90AA;font-weight:700;font-size:10px;letter-spacing:.08em;border-bottom:1px solid #ECEEF7;">CLAIM TYPE</th>
            <th style="padding:12px 16px;text-align:center;color:#6366F1;font-weight:700;font-size:10px;letter-spacing:.08em;border-bottom:1px solid #ECEEF7;">${saved.businessName.toUpperCase()}</th>
            ${competitors.map(c => `<th style="padding:12px 16px;text-align:center;color:#8B90AA;font-weight:700;font-size:10px;letter-spacing:.08em;border-bottom:1px solid #ECEEF7;">${c.toUpperCase()}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${r.claimsMatrix.rows.map((row, ri) => `
          <tr style="background:${ri % 2 === 0 ? '#fff' : '#F7F8FD'}">
            <td style="padding:12px 16px;color:#0E1120;font-weight:600;font-size:12px;border-bottom:1px solid #ECEEF7;">${row.claimType}</td>
            ${allNames.map(name => {
              const val = row.values[name] ?? '—'
              const color = val === 'Yes' ? '#10B981' : val === 'No' ? '#EF4444' : val === 'Partial' ? '#F59E0B' : '#8B90AA'
              return `<td style="padding:12px 16px;text-align:center;border-bottom:1px solid #ECEEF7;color:${color};font-weight:700;font-size:12px;">${val}</td>`
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`
  }

  const renderWhiteSpace = (items: { opportunity: string; rationale: string; owner: string }[] = []): string =>
    items.map(w => `
    <div style="border-radius:10px;border:1px solid #ECEEF7;overflow:hidden;margin-bottom:14px;box-shadow:0 1px 8px rgba(0,0,0,0.08)">
      <div style="padding:14px 20px;background:#F5F6FF;border-bottom:1px solid #ECEEF7">
        <div style="font-size:13px;font-weight:700;color:#0E1120">${w.opportunity}</div>
      </div>
      <div style="padding:14px 20px;background:#fff;display:flex;gap:20px">
        <div style="flex:1"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;color:#6366F1;margin-bottom:4px">WHY THIS MATTERS</div><div style="font-size:12px;color:#4A5280;line-height:1.65">${w.rationale}</div></div>
        <div style="flex:0 0 120px"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:4px">OWNER</div><div style="font-size:12px;color:#4A5280">${w.owner}</div></div>
      </div>
    </div>`).join('')

  const renderBuyerAnxieties = (items: { concern: string; addressedBy: string; ignoredBy: string }[] = []): string =>
    items.map(a => `
    <div style="border-radius:10px;border:1px solid #ECEEF7;overflow:hidden;margin-bottom:14px;box-shadow:0 1px 8px rgba(0,0,0,0.10)">
      <div style="padding:16px 20px;background:#FEF2F2;border-bottom:1px solid #ECEEF7">
        <div style="font-size:13px;font-weight:700;color:#0E1120">${a.concern}</div>
      </div>
      <div style="padding:16px 20px;background:#fff;display:flex;gap:20px">
        <div style="flex:1"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;color:#10B981;margin-bottom:4px">✓ ADDRESSED BY</div><div style="font-size:12px;color:#4A5280;line-height:1.65">${a.addressedBy || 'Nobody'}</div></div>
        <div style="flex:1"><div style="font-size:9px;font-weight:700;letter-spacing:.08em;color:#EF4444;margin-bottom:4px">✗ IGNORED BY</div><div style="font-size:12px;color:#4A5280;line-height:1.65">${a.ignoredBy || 'Nobody'}</div></div>
      </div>
    </div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Competitor Intelligence — ${saved.businessName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0E1120; color: #0E1120; }
    .wrapper { max-width: 860px; margin: 0 auto; padding: 40px 24px 80px; }
    @media print { body { background: #0E1120 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#8B5CF6;margin-bottom:10px">COMPETITOR INTELLIGENCE REPORT</div>
      <div style="font-size:42px;font-weight:700;color:#0E1120;line-height:1.1;margin-bottom:8px">${saved.businessName}</div>
      <div style="font-size:13px;color:#8B90AA;margin-bottom:4px">Competitor Analysis · ${r.profiles?.length ?? 0} competitor${(r.profiles?.length ?? 0) !== 1 ? 's' : ''} analysed</div>
      <a href="${saved.businessUrl.startsWith('http') ? saved.businessUrl : 'https://'+saved.businessUrl}" style="font-size:11px;color:#B0B5CC;text-decoration:none">${saved.businessUrl}</a>
      ${r.summary ? `
      <div style="height:1px;background:linear-gradient(90deg,#ECEEF7,transparent);margin:20px 0"></div>
      <div style="font-size:13px;color:#4A5280;line-height:1.75">${r.summary}</div>` : ''}
    </div>
  </div>

  ${r.headlineFindings?.length ? card('#6366F1,#8B5CF6', 'Headline Findings', `
    ${r.headlineFindings.map((f, i) => `
    <div style="display:flex;gap:16px;padding:16px 0;border-bottom:1px solid #ECEEF7;${i === 0 ? 'padding-top:0' : ''}">
      <div style="width:28px;height:28px;border-radius:50%;background:#EDE9FE;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#6366F1;flex-shrink:0">${f.number}</div>
      <div><div style="font-size:13px;font-weight:700;color:#0E1120;margin-bottom:4px">${f.title}</div><div style="font-size:12px;color:#8B90AA;line-height:1.7">${f.detail}</div></div>
    </div>`).join('')}
  `) : ''}

  ${r.quickWins?.length ? card('#F59E0B,#FBBF24', 'Quick Wins', `
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">Highest-impact actions to differentiate immediately</div>
    ${renderQuickWins(r.quickWins)}
  `) : ''}

  ${r.profiles?.length ? card('#6366F1,#3B82F6', 'Competitor Profiles', renderProfiles()) : ''}

  ${r.claimsMatrix?.rows?.length ? card('#8B5CF6,#6366F1', 'Claims Matrix', renderClaimsMatrix()) : ''}

  ${r.whiteSpace?.length ? card('#10B981,#6366F1', 'White Space Opportunities', `
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">Unowned positioning opportunities in the market</div>
    ${renderWhiteSpace(r.whiteSpace)}
  `) : ''}

  ${r.buyerAnxieties?.length ? card('#EF4444,#F59E0B', 'Buyer Anxieties', `
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">Key concerns buyers have and how competitors address them</div>
    ${renderBuyerAnxieties(r.buyerAnxieties)}
  `) : ''}

  ${(r.tableStakes?.length || r.noiseToAvoid?.length) ? card('#6366F1,#3B82F6', 'Recommendations', `
    ${r.tableStakes?.length ? `
    <div style="display:flex;align-items:center;gap:10px;margin:0 0 14px">
      <div style="width:8px;height:8px;border-radius:50%;background:#6366F1;flex-shrink:0"></div>
      <div style="font-size:13px;font-weight:700;color:#0E1120">Table Stakes</div>
      <div style="flex:1;height:1.5px;background:#ECEEF7"></div>
    </div>
    <div style="background:#F7F8FD;border-radius:10px;border:1px solid #ECEEF7;padding:18px 20px;margin-bottom:28px">
      <div style="font-size:12px;color:#4A5280;margin-bottom:12px">Minimum requirements to remain competitive:</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${r.tableStakes.map(t => `<span style="font-size:11px;font-weight:600;padding:4px 12px;border-radius:99px;background:#EDE9FE;color:#5B21B6">${t}</span>`).join('')}
      </div>
    </div>` : ''}
    ${r.noiseToAvoid?.length ? `
    <div style="display:flex;align-items:center;gap:10px;margin:0 0 14px">
      <div style="width:8px;height:8px;border-radius:50%;background:#EF4444;flex-shrink:0"></div>
      <div style="font-size:13px;font-weight:700;color:#0E1120">Noise to Avoid</div>
      <div style="flex:1;height:1.5px;background:#ECEEF7"></div>
    </div>
    <div style="border-radius:10px;border:1px solid #FEE2E2;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08)">
      <div style="padding:16px 20px;background:#FEF2F2;border-bottom:1px solid #FEE2E2">
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#EF4444">MESSAGING TO AVOID — USED HEAVILY BY COMPETITORS</div>
      </div>
      <div style="padding:16px 20px;background:#fff">
        ${r.noiseToAvoid.map(n => `<div style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start"><span style="color:#EF4444;font-weight:700;flex-shrink:0">✗</span><div style="font-size:12px;color:#4A5280;line-height:1.65">${n}</div></div>`).join('')}
      </div>
    </div>` : ''}
  `) : ''}

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
  a.download = `competitor-${slug}-${new Date(saved.date).toISOString().split('T')[0]}.html`
  a.click()
}
