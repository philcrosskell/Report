import type { Audit, SeoCheck } from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

function scoreColour(n: number) {
  if (n >= 70) return '#10B981'
  if (n >= 50) return '#F59E0B'
  return '#EF4444'
}

function gradeColour(g: string) {
  if (g === 'A') return '#10B981'
  if (g === 'B') return '#10B981'
  if (g === 'C') return '#F59E0B'
  return '#EF4444'
}

function pill(text: string, bg: string, fg: string) {
  return `<span style="display:inline-block;background:${bg};color:${fg};font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;letter-spacing:.04em">${esc(text)}</span>`
}

function statusPill(status: string) {
  if (status === 'pass') return pill('Pass', '#D1FAE5', '#065F46')
  if (status === 'warn') return pill('Warn', '#FEF3C7', '#92400E')
  return pill('Fail', '#FEE2E2', '#B91C1C')
}

function effortPill(d: string) {
  if (d === 'Easy') return pill('Easy Fix', '#D1FAE5', '#065F46')
  if (d === 'Medium') return pill('Medium Fix', '#FEF3C7', '#92400E')
  return pill('Hard Fix', '#FEE2E2', '#B91C1C')
}

function priorityPill(p: string) {
  if (p === 'High') return pill('High', '#FEE2E2', '#B91C1C')
  if (p === 'Medium') return pill('Medium', '#FEF3C7', '#92400E')
  return pill('Low', '#F3F4F6', '#6B7280')
}

const CAT_LABELS: Record<string, string> = {
  metaInformation: 'Meta Information',
  pageQuality: 'Page Quality',
  pageStructure: 'Page Structure',
  linkStructure: 'Link Structure',
  serverTechnical: 'Server & Technical',
  externalFactors: 'External Factors',
}

// ─── Page card wrapper ─────────────────────────────────────────────────────────

function pageCard(content: string) {
  return `<div style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:32px;box-shadow:0 8px 40px rgba(0,0,0,0.5)">${content}</div>`
}

// ─── Section header (sits flush at top of each page card) ──────────────────────

function sectionHeader(_num: string, label: string, title: string, gradStart: string, gradEnd: string) {
  return `<div style="background:#07090F">
    <div style="height:5px;background:linear-gradient(90deg,${gradStart},${gradEnd})"></div>
    <div style="padding:22px 32px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.35);margin-bottom:6px">${esc(label)}</div>
      <div style="font-size:24px;font-weight:700;color:#fff">${esc(title)}</div>
    </div>
  </div>`
}

function subHead(title: string, dotColor: string) {
  return `
  <div style="display:flex;align-items:center;gap:10px;margin:28px 0 14px">
    <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></div>
    <div style="font-size:13px;font-weight:700;color:#0E1120">${esc(title)}</div>
    <div style="flex:1;height:1.5px;background:#ECEEF7"></div>
  </div>`
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function exportHTML(audit: Audit) {
  const r = audit.report
  const url = audit.url
  const date = new Date(audit.date).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })
  const title = r.overview.title || url

  // ── Cover ─────────────────────────────────────────────────────────────────
  const coverSection = pageCard(`
  <div style="background:#07090F">
    <div style="height:5px;background:linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899)"></div>
    <div style="padding:28px 32px 24px;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:5px;height:40px;background:#FFE600;border-radius:3px;flex-shrink:0"></div>
        <div>
          <div style="font-size:19px;font-weight:400;color:#fff;line-height:1.2">
            <span style="font-weight:700">BEAL</span> Creative.
          </div>
          <div style="font-size:9px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,.35);margin-top:3px">AUDIT MACHINE</div>
        </div>
      </div>
      <div style="text-align:right;color:rgba(255,255,255,.25);font-size:11px">${esc(date)}</div>
    </div>
  </div>
  <div style="padding:32px 32px 36px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#8B5CF6;margin-bottom:10px">PAGE AUDIT REPORT</div>
    <div style="font-size:42px;font-weight:700;color:#0E1120;line-height:1.1;margin-bottom:8px">${esc(title)}</div>
    <div style="font-size:13px;color:#8B90AA;margin-bottom:4px">${esc(r.overview.pageType || 'Page Audit')}</div>
    <a href="${esc(url)}" style="font-size:11px;color:#B0B5CC;text-decoration:none">${esc(url)}</a>

    <div style="height:1px;background:linear-gradient(90deg,#ECEEF7,transparent);margin:20px 0"></div>

    <div style="display:flex;gap:14px;margin-bottom:20px">
      ${[
        ['SEO SCORE', String(r.scores.seo), scoreColour(r.scores.seo)],
        ['LP SCORE',  String(r.scores.lp),  scoreColour(r.scores.lp)],
        ['OVERALL',   String(r.scores.overall), scoreColour(r.scores.overall)],
        ['GRADE',     r.scores.grade, gradeColour(r.scores.grade)],
      ].map(([lbl,val,col]) => `
        <div style="flex:1;border-radius:12px;overflow:hidden;border:1px solid #ECEEF7;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
          <div style="height:4px;background:${col}"></div>
          <div style="padding:14px 16px 16px;background:#F9FAFB;text-align:center">
            <div style="font-size:28px;font-weight:700;color:${col}">${esc(val)}</div>
            <div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#B0B5CC;margin-top:4px">${esc(lbl)}</div>
          </div>
        </div>`).join('')}
    </div>

    <div style="background:#F7F8FD;border:1px solid #ECEEF7;border-radius:10px;padding:14px 20px;display:flex;gap:0;margin-bottom:20px">
      ${[
        ['PAGE TYPE', r.overview.pageType || '—'],
        ['WORD COUNT', String(r.overview.wordCount)],
        ['RESPONSE TIME', r.overview.responseTime],
        ['INT. LINKS', String(r.overview.internalLinks)],
        ['FILE SIZE', r.overview.fileSize],
      ].map((s,i) => `
        <div style="flex:1;${i>0?'border-left:1px solid #ECEEF7;':''} padding:0 ${i>0?'16':'0'}px 0 ${i>0?'16':'0'}px">
          <div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#B0B5CC;margin-bottom:4px">${esc(s[0])}</div>
          <div style="font-size:12px;font-weight:700;color:#4A5280">${esc(s[1])}</div>
        </div>`).join('')}
    </div>

    <div style="font-size:13px;color:#4A5280;line-height:1.75">${esc(r.overview.summary)}</div>
  </div>`)

  // ── Gap Analysis ──────────────────────────────────────────────────────────
  const ga = r.gapAnalysis
  const gapSection = pageCard(`
  ${sectionHeader('02','SECTION','Gap Analysis','#6366F1','#8B5CF6')}
  <div style="padding:28px 32px 36px">
  <div style="display:flex;gap:14px;margin:0 0 20px">
    ${[
      ['CURRENT SCORE', ga.beforeScore + ' (' + ga.beforeGrade + ')', '#F59E0B', '#F9FAFB', '#E5E7EB'],
      ['PROJECTED SCORE', ga.afterScore + ' (' + ga.afterGrade + ')', '#10B981', '#F9FAFB', '#E5E7EB'],
      ['POTENTIAL UPLIFT', '+' + (ga.afterScore - ga.beforeScore), '#10B981', '#ECFDF5', '#A7F3D0'],
    ].map(([lbl,val,col,bg,bc]) => `
      <div style="flex:1;border-radius:10px;overflow:hidden;border:1px solid ${bc};box-shadow:0 2px 12px rgba(0,0,0,0.15)">
        <div style="height:4px;background:${col}"></div>
        <div style="padding:14px 16px 16px;background:${bg}">
          <div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#8B90AA;margin-bottom:6px">${esc(lbl)}</div>
          <div style="font-size:32px;font-weight:700;color:${col}">${esc(val)}</div>
        </div>
      </div>`).join('')}
  </div>

  <div style="background:#F5F6FF;border-radius:10px;border-left:4px solid #6366F1;padding:18px 20px;margin-bottom:6px">
    <div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#6366F1;margin-bottom:8px">EXECUTIVE SUMMARY</div>
    <div style="font-size:13px;color:#4A5280;line-height:1.75">${esc(ga.executiveSummary)}</div>
  </div>

  ${subHead('Critical Issues','#EF4444')}

  ${ga.criticalIssues.map((ci,i) => `
  <div style="display:flex;border-radius:10px;overflow:hidden;border:1px solid #ECEEF7;margin-bottom:14px;box-shadow:0 1px 8px rgba(0,0,0,0.10)">
    <div style="width:5px;background:#EF4444;flex-shrink:0"></div>
    <div style="flex:1;padding:18px 20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
        <div style="font-size:13px;font-weight:700;color:#0E1120">${i+1}. ${esc(ci.issue)}</div>
        ${effortPill(ci.effort)}
      </div>
      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#B0B5CC;margin-bottom:4px">IMPACT</div>
      <div style="font-size:12px;color:#8B90AA;line-height:1.7;margin-bottom:10px">${esc(ci.impact)}</div>
      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#B0B5CC;margin-bottom:4px">FIX</div>
      <div style="font-size:12px;color:#4A5280;line-height:1.7">${esc(ci.fix)}</div>
    </div>
  </div>`).join('')}

  ${subHead('Quick Wins','#10B981')}

  ${ga.quickWins.map((qw,i) => `
  <div style="background:#F7F8FD;border-radius:8px;padding:14px 16px;margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div style="font-size:12px;font-weight:700;color:#0E1120">${i+1}. ${esc(qw.win)}</div>
      ${pill(qw.timeEstimate,'#DBEAFE','#1D4ED8')}
    </div>
    <div style="font-size:12px;color:#7A82A5;line-height:1.7">${esc(qw.action)}</div>
  </div>`).join('')}

  <div style="border-radius:10px;overflow:hidden;margin-top:20px;box-shadow:0 6px 28px rgba(99,102,241,0.28)">
    <div style="background:#6366F1;padding:10px 16px;font-size:9px;font-weight:700;letter-spacing:.12em;color:#fff">★ &nbsp;TOP RECOMMENDATION</div>
    <div style="background:#EEEDFE;padding:16px">
      <div style="font-size:13px;font-weight:700;color:#2D1FA3;line-height:1.7">${esc(ga.topRecommendation)}</div>
    </div>
  </div>
  </div>`)

  // ── SEO Analysis ──────────────────────────────────────────────────────────
  const cats = r.seoCategories
  const seoSection = pageCard(`
  ${sectionHeader('03','SECTION','SEO Analysis','#EF4444','#F97316')}
  <div style="padding:28px 32px 36px">

  ${subHead('Category Scores','#6366F1')}

  <div style="margin-bottom:8px">
    ${Object.entries(cats).map(([key,cat]) => {
      const lbl = CAT_LABELS[key] || key
      const col = cat.score >= 70 ? '#10B981' : cat.score >= 50 ? '#F59E0B' : '#EF4444'
      const pct = cat.score
      return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div style="width:160px;font-size:12px;color:#4A5280;flex-shrink:0">${esc(lbl)}</div>
        <div style="flex:1;background:#ECEEF7;border-radius:5px;height:10px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${col};border-radius:5px"></div>
        </div>
        <div style="width:38px;font-size:12px;font-weight:700;color:${col};text-align:right">${pct}%</div>
      </div>`
    }).join('')}
  </div>

  ${Object.entries(cats).map(([key,cat]) => {
    const lbl = CAT_LABELS[key] || key
    const dotCol = cat.score >= 70 ? '#10B981' : cat.score >= 50 ? '#F59E0B' : '#EF4444'
    return `
    ${subHead(lbl + ' — ' + cat.score + '%', dotCol)}
    ${cat.checks.map((ch: SeoCheck) => `
    <div style="display:flex;gap:16px;margin-bottom:14px">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <div style="width:8px;height:8px;border-radius:50%;background:${ch.status==='pass'?'#10B981':ch.status==='warn'?'#F59E0B':'#EF4444'};flex-shrink:0"></div>
          <div style="font-size:12px;font-weight:700;color:#0E1120">${esc(ch.label)}</div>
        </div>
        <div style="font-size:12px;color:#8B90AA;line-height:1.7;padding-left:16px;max-width:68%">${esc(ch.detail)}</div>
      </div>
      <div style="flex-shrink:0;padding-top:2px">${statusPill(ch.status)}</div>
    </div>`).join('')}`
  }).join('')}
  </div>`)

  // ── Priority Fixes ────────────────────────────────────────────────────────
  const fixSection = pageCard(`
  ${sectionHeader('04','SECTION','Priority Fixes','#F59E0B','#FBBF24')}
  <div style="padding:28px 32px 36px">
  <div style="margin-top:0">
  ${r.priorityFixes.map((fix) => {
    const accentMap: Record<string,string> = { Easy:'#10B981', Medium:'#F59E0B', Hard:'#EF4444' }
    const accent = accentMap[fix.difficulty] || '#6366F1'
    const lightBg = fix.difficulty==='Easy' ? '#ECFDF5' : fix.difficulty==='Medium' ? '#FFFBEB' : '#FEF2F2'
    return `
    <div style="display:flex;border-radius:12px;overflow:hidden;border:1px solid #ECEEF7;margin-bottom:16px;box-shadow:0 2px 14px rgba(0,0,0,0.12)">
      <div style="width:52px;background:${lightBg};display:flex;flex-direction:column;align-items:center;padding-top:20px;flex-shrink:0">
        <div style="width:34px;height:34px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff">${fix.rank}</div>
      </div>
      <div style="flex:1;padding:18px 20px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px">
          <div style="font-size:13px;font-weight:700;color:#0E1120">${esc(fix.title)}</div>
          ${effortPill(fix.difficulty)}
        </div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#B0B5CC;margin-bottom:4px">PROBLEM</div>
        <div style="font-size:12px;color:#4A5280;line-height:1.7;margin-bottom:10px">${esc(fix.problem)}</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#B0B5CC;margin-bottom:4px">FIX</div>
        <div style="font-size:12px;color:#4A5280;line-height:1.7;margin-bottom:12px">${esc(fix.fix)}</div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:11px;font-weight:700;color:#6366F1">${esc(fix.uplift)}</span>
          <span style="font-size:11px;color:#8B90AA">${esc(fix.timeline)}</span>
        </div>
      </div>
    </div>`
  }).join('')}
  </div>
  </div>`)
  const sw = r.strengthsWeaknesses
  const swSection = pageCard(`
  ${sectionHeader('05','SECTION','Strengths, Weaknesses & Opportunities','#10B981','#06B6D4')}
  <div style="padding:28px 32px 36px">
  <div style="display:flex;gap:14px;margin-top:0">
    ${[
      ['Strengths', sw.strengths, '#065F46', '#ECFDF5', '#10B981'],
      ['Weaknesses', sw.weaknesses, '#7F1D1D', '#FEF2F2', '#EF4444'],
      ['Missed Opportunities', sw.missedOpportunities, '#1E3A8A', '#EFF6FF', '#3B82F6'],
    ].map(([heading, items, hdrBg, bg, dot]) => `
      <div style="flex:1;border-radius:10px;overflow:hidden;border:1px solid #ECEEF7">
        <div style="background:${hdrBg};padding:10px 14px;font-size:10px;font-weight:700;letter-spacing:.1em;color:#fff">${esc(heading as string)}</div>
        <div style="padding:14px;background:${bg}">
          ${(items as string[]).map(item => `
            <div style="display:flex;gap:8px;margin-bottom:10px">
              <div style="width:7px;height:7px;border-radius:50%;background:${dot};flex-shrink:0;margin-top:4px"></div>
              <div style="font-size:12px;color:#4A5280;line-height:1.65">${esc(item)}</div>
            </div>`).join('')}
        </div>
      </div>`).join('')}
  </div>
  </div>`)

  // ── Recommendations ───────────────────────────────────────────────────────
  const recSection = pageCard(`
  ${sectionHeader('06','SECTION','Recommendations','#6366F1','#3B82F6')}
  <div style="padding:28px 32px 36px">
  <div style="border-radius:10px;overflow:hidden;margin-top:0;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#07090F;color:#fff">
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em">PRIORITY</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em">AREA</th>
          <th style="padding:10px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em">RECOMMENDED ACTION</th>
        </tr>
      </thead>
      <tbody>
        ${r.recommendations.map((rec,i) => `
          <tr style="background:${i%2===0?'#fff':'#F9FAFC'}">
            <td style="padding:12px 14px;border-bottom:1px solid #ECEEF7;vertical-align:top">${priorityPill(rec.priority)}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #ECEEF7;font-weight:600;color:#0E1120;vertical-align:top">${esc(rec.area)}</td>
            <td style="padding:12px 14px;border-bottom:1px solid #ECEEF7;color:#4A5280;line-height:1.65">${esc(rec.action)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  </div>`)

  // ── Assemble full document ─────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AuditIQ Report — ${esc(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0E1120; color: #0E1120; }
    .wrapper { max-width: 860px; margin: 0 auto; padding: 40px 24px 80px; }
    @media (max-width: 600px) {
      .score-row { flex-direction: column !important; }
      .stat-row  { flex-direction: column !important; }
      .sw-row    { flex-direction: column !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    ${coverSection}
    ${gapSection}
    ${seoSection}
    ${fixSection}
    ${swSection}
    ${recSection}
    <div style="margin-top:32px;padding:20px 0;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:4px;height:28px;background:#FFE600;border-radius:2px"></div>
        <div>
          <div style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.6)"><strong style="color:#fff">BEAL</strong> Creative.</div>
          <div style="font-size:8px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,0.25)">AUDIT MACHINE</div>
        </div>
      </div>
      <div style="font-size:11px;color:rgba(255,255,255,0.25)">Generated ${esc(date)}</div>
    </div>
  </div>
</body>
</html>`

  // ── Trigger download ───────────────────────────────────────────────────────
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url2 = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = audit.url.replace(/https?:\/\//,'').replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
  a.href = url2
  a.download = `AuditIQ-${slug}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url2)
}
