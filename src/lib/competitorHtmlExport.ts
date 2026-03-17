import type { SavedCompetitorReport } from './types'

export function exportCompetitorHTML(saved: SavedCompetitorReport): void {
  const r = saved.report
  const date = new Date(saved.date).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })
  const slug = saved.businessUrl.replace(/https?:\/\//,'').replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  const renderQuickWins = (wins: { action: string; why: string; effort: 'Easy' | 'Medium' | 'Hard' }[] = []): string =>
    wins.slice(0,5).map((w, i) => `
    <div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #2e2e38;">
      <div style="width:24px;height:24px;border-radius:50%;background:#FFE500;color:#0f0f11;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:#f0f0f5;margin-bottom:2px;">${w.action}</div>
        <div style="font-size:12px;color:#a0a0b8;">${w.why}</div>
      </div>
      <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#1e1e24;color:#a0a0b8;height:fit-content;white-space:nowrap;">${w.effort}</span>
    </div>`).join('')

  const renderWhiteSpace = (items: { opportunity: string; rationale: string; owner: string }[] = []): string =>
    items.map(w => `
    <div style="padding:12px 14px;background:#1e1e24;border-radius:8px;margin-bottom:8px;border-left:3px solid #FFE500;">
      <div style="font-size:13px;font-weight:600;color:#f0f0f5;margin-bottom:4px;">${w.opportunity}</div>
      <div style="font-size:12px;color:#a0a0b8;margin-bottom:4px;">${w.rationale}</div>
      <div style="font-size:11px;color:#FFE500;">Owner: ${w.owner}</div>
    </div>`).join('')

  const renderBuyerAnxieties = (items: { concern: string; addressedBy: string; ignoredBy: string }[] = []): string =>
    items.map(a => `
    <div style="padding:12px 14px;background:#1e1e24;border-radius:8px;margin-bottom:8px;">
      <div style="font-size:13px;font-weight:600;color:#f0f0f5;margin-bottom:6px;">${a.concern}</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <div style="font-size:12px;color:#34d399;">✓ Addressed by: ${a.addressedBy || '—'}</div>
        <div style="font-size:12px;color:#f87171;">✗ Ignored by: ${a.ignoredBy || '—'}</div>
      </div>
    </div>`).join('')

  const renderCompetitorProfiles = (): string => (r.profiles ?? []).map(p => `
    <div style="background:#1e1e24;border:1px solid #2e2e38;border-radius:10px;padding:16px 20px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="font-size:15px;font-weight:600;color:#f0f0f5;">${p.name}</div>
          <div style="font-size:12px;color:#60a5fa;">${p.url}</div>
          <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:#26262e;color:#a0a0b8;margin-top:4px;display:inline-block;">${p.tier}</span>
        </div>
      </div>
      ${p.positioning ? `<div style="margin-bottom:10px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#a0a0b8;margin-bottom:4px;">Positioning</div><p style="font-size:13px;color:#f0f0f5;">${p.positioning}</p></div>` : ''}
      ${p.whatTheyDoWell ? `<div style="margin-bottom:10px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#34d399;margin-bottom:4px;">What they do well</div><p style="font-size:13px;color:#f0f0f5;">${p.whatTheyDoWell}</p></div>` : ''}
      ${p.hookHeadline ? `<div style="margin-bottom:10px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#a0a0b8;margin-bottom:4px;">Hook (${p.hookType})</div><p style="font-size:13px;color:#f0f0f5;">${p.hookHeadline}</p><p style="font-size:12px;color:#a0a0b8;margin-top:2px;">${p.hookEffectiveness}</p></div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
        ${p.primaryAnxiety ? `<div style="padding:10px 12px;background:#16161a;border-radius:8px;border-left:3px solid #f87171;"><div style="font-size:11px;color:#f87171;margin-bottom:4px;">Primary anxiety</div><p style="font-size:12px;color:#f0f0f5;">${p.primaryAnxiety}</p></div>` : ''}
        ${p.outcomePromised ? `<div style="padding:10px 12px;background:#16161a;border-radius:8px;border-left:3px solid #34d399;"><div style="font-size:11px;color:#34d399;margin-bottom:4px;">Outcome promised</div><p style="font-size:12px;color:#f0f0f5;">${p.outcomePromised}</p></div>` : ''}
      </div>
      ${p.actionTrigger ? `<div style="margin-top:10px;padding:10px 12px;background:#16161a;border-radius:8px;"><div style="font-size:11px;color:#FFE500;margin-bottom:4px;">Action trigger</div><p style="font-size:12px;color:#f0f0f5;">${p.actionTrigger}</p></div>` : ''}
    </div>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Competitor Intelligence — ${saved.businessName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #0f0f11; color: #f0f0f5; line-height: 1.6; }
    table { border-collapse: collapse; width: 100%; }
    @media print { body { background: #0f0f11 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>

<div style="background:#16161a;border-bottom:1px solid #2e2e38;">
  <div style="max-width:1000px;margin:0 auto;padding:0 24px;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid #2e2e38;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:4px;height:32px;background:#FFE500;border-radius:2px;"></div>
        <div>
          <div style="font-size:15px;font-weight:700;color:#f0f0f5;">Audit Machine</div>
          <div style="font-size:11px;color:#a0a0b8;">by BEAL Creative</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:13px;font-weight:600;color:#f0f0f5;">Competitor Intelligence Report</div>
        <div style="font-size:12px;color:#a0a0b8;">${date}</div>
      </div>
    </div>
    <div style="padding:20px 0;">
      <div style="font-size:22px;font-weight:700;color:#f0f0f5;">${saved.businessName}</div>
      <div style="font-size:13px;color:#60a5fa;margin-top:2px;">${saved.businessUrl}</div>
      ${r.market ? `<div style="font-size:12px;color:#a0a0b8;margin-top:4px;">Market: ${r.market}</div>` : ''}
      <div style="font-size:12px;color:#a0a0b8;margin-top:4px;">${r.profiles?.length ?? 0} competitors analysed</div>
    </div>
  </div>
</div>

<div style="max-width:1000px;margin:0 auto;padding:32px 24px;">

  ${r.summary ? `
  <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:10px;">Executive Summary</div>
    <p style="font-size:14px;color:#f0f0f5;line-height:1.7;">${r.summary}</p>
  </div>` : ''}

  ${r.quickWins?.length ? `
  <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:4px;">Quick Wins</div>
    <div style="font-size:13px;color:#a0a0b8;margin-bottom:16px;">Highest-impact actions to differentiate immediately</div>
    ${renderQuickWins(r.quickWins ?? [])}
  </div>` : ''}

  ${r.profiles?.length ? `
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#FFE500;border-radius:2px;"></div>
      <h2 style="font-size:16px;font-weight:600;color:#f0f0f5;">Competitor Profiles</h2>
    </div>
    ${renderCompetitorProfiles()}
  </div>` : ''}

  ${r.claimsMatrix?.rows?.length ? `
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#60a5fa;border-radius:2px;"></div>
      <h2 style="font-size:16px;font-weight:600;color:#f0f0f5;">Claims Matrix</h2>
    </div>
    <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;">
      ${renderClaimsMatrix()}
    </div>
  </div>` : ''}

  ${r.whiteSpace?.length ? `
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#FFE500;border-radius:2px;"></div>
      <h2 style="font-size:16px;font-weight:600;color:#f0f0f5;">White Space Opportunities</h2>
    </div>
    ${renderWhiteSpace(r.whiteSpace)}
  </div>` : ''}

  ${r.buyerAnxieties?.length ? `
  <div style="margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:3px;height:20px;background:#f87171;border-radius:2px;"></div>
      <h2 style="font-size:16px;font-weight:600;color:#f0f0f5;">Buyer Anxieties</h2>
    </div>
    ${renderBuyerAnxieties(r.buyerAnxieties)}
  </div>` : ''}

  ${r.tableStakes?.length ? `
  <div style="background:#16161a;border:1px solid #2e2e38;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#a0a0b8;margin-bottom:12px;">Table Stakes</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${r.tableStakes.map(t => `<span style="font-size:12px;padding:4px 12px;border-radius:99px;background:#1e1e24;border:1px solid #2e2e38;color:#a0a0b8;">${t}</span>`).join('')}
    </div>
  </div>` : ''}

  ${r.noiseToAvoid?.length ? `
  <div style="background:#16161a;border:1px solid #f87171;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#f87171;margin-bottom:12px;">Noise to Avoid</div>
    ${r.noiseToAvoid.map(n => `<div style="font-size:13px;color:#f0f0f5;margin-bottom:6px;display:flex;gap:8px;"><span style="color:#f87171;">✗</span>${n}</div>`).join('')}
  </div>` : ''}

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
  a.download = `competitor-${slug}-${new Date(saved.date).toISOString().split('T')[0]}.html`
  a.click()
}
