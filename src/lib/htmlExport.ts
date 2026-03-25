import type { Audit, SeoCheck, LpSubScore, PriorityFix, SeoCategory, LpCategory } from './types'

export function exportHTML(audit: Audit): void {
  const r = audit.report
  const url = audit.url
  const date = new Date(audit.date).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })
  const slug = audit.url.replace(/https?:\/\//,'').replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  const seoScore  = audit.scores.seo ?? 0
  const lpScore   = audit.scores.lp ?? 0
  const overall   = audit.scores.overall ?? Math.round((seoScore + lpScore) / 2)
  const grade     = audit.scores.grade ?? 'â'
  const aeo       = r.aeoScore
  const faqScore  = aeo?.faqScore ?? null
  const faqMax    = aeo?.faqMax ?? null
  const aeoRd     = aeo?.aeoReadiness ?? null
  const isNaPage  = faqScore === null
  const aeoTotal  = aeo?.total ?? null
  const aeoGrade  = aeo?.grade ?? null

  const scoreColor = (s: number) => s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444'
  const gradeColor = (g: string) => {
    const l = (g||'')[0]?.toUpperCase()
    if (l === 'A') return '#10B981'
    if (l === 'B') return '#6366F1'
    if (l === 'C') return '#F59E0B'
    return '#EF4444'
  }
  const critBadge = (c: string) => {
    if (c === 'critical') return 'background:#FEE2E2;color:#B91C1C'
    if (c === 'important') return 'background:#FEF3C7;color:#92400E'
    if (c === 'somewhat') return 'background:#DBEAFE;color:#1D4ED8'
    return 'background:#F3F4F6;color:#6B7280'
  }
  const statusDot = (s: string) => s === 'pass' ? '#10B981' : s === 'fail' ? '#EF4444' : '#F59E0B'

  const card = (gradientColors: string, label: string, title: string, body: string) => `
    <div style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:32px;box-shadow:0 8px 40px rgba(0,0,0,0.5)">
      <div style="background:#07090F">
        <div style="height:5px;background:linear-gradient(90deg,${gradientColors})"></div>
        <div style="padding:22px 32px">
          <div style="font-size:10px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.35);margin-bottom:6px">${label}</div>
          <div style="font-size:24px;font-weight:700;color:#fff">${title}</div>
        </div>
      </div>
      <div style="padding:28px 32px 36px">${body}</div>
    </div>`

  const renderChecks = (checks: SeoCheck[] = []): string => checks.map(c => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:16px 0;border-bottom:1px solid #ECEEF7">
      <span style="width:8px;height:8px;border-radius:50%;background:${statusDot(c.status)};flex-shrink:0;margin-top:5px;display:inline-block"></span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:#0E1120;margin-bottom:2px">${c.label}</div>
        <div style="font-size:12px;color:#8B90AA;line-height:1.6">${c.detail ?? ''}</div>
      </div>
      <span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:99px;${critBadge(c.criticality ?? 'nice')};white-space:nowrap">${c.criticality ?? 'nice'}</span>
    </div>`).join('')

  const renderLpSubScores = (subs: LpSubScore[] = []): string => subs.map(s => `
    <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #ECEEF7">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:13px;font-weight:600;color:#0E1120">${s.label}</span>
        <span style="font-size:13px;font-weight:700;color:${scoreColor(s.score)}">${s.score}<span style="color:#8B90AA;font-weight:400"> / ${s.max}</span></span>
      </div>
      <div style="height:5px;background:#ECEEF7;border-radius:3px;overflow:hidden;margin-bottom:8px">
        <div style="height:100%;width:${s.score}%;background:${scoreColor(s.score)};border-radius:3px"></div>
      </div>
      ${s.note ? `<p style="font-size:12px;color:#8B90AA;margin:0;line-height:1.5">${s.note}</p>` : ''}
    </div>`).join('')

  const renderSeoCategory = (label: string, cat: SeoCategory): string => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-size:13px;color:#0E1120">${label}</span>
        <span style="font-size:13px;font-weight:700;color:${scoreColor(cat.score)}">${cat.score}</span>
      </div>
      <div style="height:5px;background:#ECEEF7;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${cat.score}%;background:${scoreColor(cat.score)};border-radius:3px"></div>
      </div>
    </div>`

  const renderPriorityFixes = (fixes: PriorityFix[] = []): string => fixes.slice(0,5).map((f, i) => {
    const effortStyle = f.difficulty === 'Easy'
      ? 'background:#D1FAE5;color:#065F46'
      : f.difficulty === 'Hard'
        ? 'background:#FEE2E2;color:#B91C1C'
        : 'background:#FEF3C7;color:#92400E'
    const accentBg = f.difficulty === 'Easy' ? '#ECFDF5' : f.difficulty === 'Hard' ? '#FEF2F2' : '#FFFBEB'
    const accentCol = f.difficulty === 'Easy' ? '#10B981' : f.difficulty === 'Hard' ? '#EF4444' : '#F59E0B'
    return `
    <div style="display:flex;border-radius:12px;overflow:hidden;border:1px solid #ECEEF7;margin-bottom:16px;box-shadow:0 2px 14px rgba(0,0,0,0.08)">
      <div style="width:52px;background:${accentBg};display:flex;flex-direction:column;align-items:center;padding-top:20px;flex-shrink:0">
        <div style="width:34px;height:34px;border-radius:50%;background:${accentCol};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff">${f.rank ?? i+1}</div>
      </div>
      <div style="flex:1;padding:18px 20px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px">
          <div style="font-size:13px;font-weight:700;color:#0E1120">${f.title}</div>
          <span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;${effortStyle};white-space:nowrap">${f.difficulty} Fix</span>
        </div>
        <div style="font-size:12px;color:#8B90AA;line-height:1.7;margin-bottom:6px">${f.problem}</div>
        <div style="font-size:12px;color:#4A5280;line-height:1.7">${f.fix}</div>
        ${f.uplift ? `<span style="font-size:11px;color:#10B981;margin-top:6px;display:inline-block">Uplift: ${f.uplift}</span>` : ''}
      </div>
    </div>`
  }).join('')

  const allSeoChecks: SeoCheck[] = r.seoCategories
    ? Object.values(r.seoCategories).flatMap((cat: SeoCategory) => cat.checks ?? [])
    : []

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Audit Report â ${url}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0E1120; color: #0E1120; }
    .wrapper { max-width: 860px; margin: 0 auto; padding: 40px 24px 80px; }
    @media print { body { background: #0E1120 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="wrapper">

  <!-- HEADER CARD -->
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
      <div style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#8B5CF6;margin-bottom:10px">PAGE AUDIT REPORT</div>
      <div style="font-size:36px;font-weight:700;color:#0E1120;line-height:1.1;margin-bottom:8px">${r.overview?.title || url}</div>
      <div style="font-size:13px;color:#8B90AA;margin-bottom:4px">${r.overview?.pageType || 'Web Page'} Â· ${r.overview?.wordCount || 0} words Â· ${r.overview?.responseTime || ''}</div>
      <a href="${url}" style="font-size:11px;color:#B0B5CC;text-decoration:none">${url}</a>

      <div style="height:1px;background:linear-gradient(90deg,#ECEEF7,transparent);margin:20px 0"></div>

      <!-- SCORE CARDS -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">
        <div style="text-align:center;padding:16px;background:#F7F8FD;border-radius:10px;border:1px solid #ECEEF7">
          <div style="font-size:28px;font-weight:700;color:${scoreColor(overall)}">${overall}</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-top:4px">OVERALL</div>
        </div>
        <div style="text-align:center;padding:16px;background:#F7F8FD;border-radius:10px;border:1px solid #ECEEF7">
          <div style="font-size:28px;font-weight:700;color:${gradeColor(String(grade))}">${grade}</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-top:4px">GRADE</div>
        </div>
        <div style="text-align:center;padding:16px;background:#F7F8FD;border-radius:10px;border:1px solid #ECEEF7">
          <div style="font-size:28px;font-weight:700;color:${scoreColor(seoScore)}">${seoScore}</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-top:4px">SEO</div>
        </div>
        <div style="text-align:center;padding:16px;background:#F7F8FD;border-radius:10px;border:1px solid #ECEEF7">
          <div style="font-size:28px;font-weight:700;color:${scoreColor(lpScore)}">${lpScore}</div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-top:4px">LP</div>
        </div>
        ${aeo ? `<div style="text-align:center;padding:16px;background:#F7F8FD;border-radius:10px;border:1px solid #ECEEF7">
          <div style="font-size:22px;font-weight:700;color:${scoreColor(Math.round((aeoTotal ?? 0) / ((faqMax ?? 0) + 30) * 100))}">${aeoTotal}<span style="font-size:12px;font-weight:400;color:#8B90AA">/${(faqMax ?? 0) + 30}</span></div>
          <div style="font-size:10px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-top:4px">AEO</div>
        </div>` : ''}
      </div>

      ${r.overview?.summary ? `
      <div style="height:1px;background:linear-gradient(90deg,#ECEEF7,transparent);margin:20px 0"></div>
      <div style="font-size:13px;color:#4A5280;line-height:1.75">${r.overview.summary}</div>` : ''}
    </div>
  </div>

  ${r.gapAnalysis ? card('#6366F1,#8B5CF6', 'SECTION', 'Gap Analysis', `
    ${r.gapAnalysis?.executiveSummary ? `
    <div style="font-size:13px;color:#4A5280;line-height:1.75;margin-bottom:20px">${r.gapAnalysis.executiveSummary}</div>` : ''}
    ${r.gapAnalysis?.positioningGap ? `
    <div style="background:#F5F6FF;border-radius:10px;border-left:4px solid #6366F1;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:#6366F1;margin-bottom:8px">POSITIONING GAP</div>
      <div style="font-size:13px;color:#4A5280;line-height:1.75">${r.gapAnalysis.positioningGap}</div>
    </div>` : ''}
    ${r.gapAnalysis?.topRecommendation ? `
    <div style="background:#07090F;border-radius:10px;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.4);margin-bottom:8px">TOP RECOMMENDATION</div>
      <div style="font-size:13px;color:#fff;line-height:1.75">${r.gapAnalysis.topRecommendation}</div>
    </div>` : ''}
  `) : ''}

  ${r.priorityFixes?.length ? card('#F59E0B,#FBBF24', 'SECTION', 'Priority Fixes', `
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">Ranked by impact â implement these first</div>
    ${renderPriorityFixes(r.priorityFixes)}
  `) : ''}

  ${r.seoCategories ? card('#6366F1,#3B82F6', 'SECTION', 'SEO Analysis', `
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">Score: <strong style="color:${scoreColor(seoScore)}">${seoScore}/100</strong></div>
    <div style="margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:14px">CATEGORY BREAKDOWN</div>
      ${renderSeoCategory('Meta Information', r.seoCategories.metaInformation)}
      ${renderSeoCategory('Page Quality', r.seoCategories.pageQuality)}
      ${renderSeoCategory('Page Structure', r.seoCategories.pageStructure)}
      ${renderSeoCategory('Link Structure', r.seoCategories.linkStructure)}
      ${renderSeoCategory('Server & Technical', r.seoCategories.serverTechnical)}
      ${renderSeoCategory('External Factors', r.seoCategories.externalFactors)}
    </div>
    ${r.seoCategories ? `
    ${[
      ['META INFORMATION', r.seoCategories.metaInformation],
      ['PAGE QUALITY', r.seoCategories.pageQuality],
      ['PAGE STRUCTURE', r.seoCategories.pageStructure],
      ['LINK STRUCTURE', r.seoCategories.linkStructure],
      ['SERVER & TECHNICAL', r.seoCategories.serverTechnical],
      ['EXTERNAL FACTORS', r.seoCategories.externalFactors],
    ].map(([label, cat]) => (cat as SeoCategory)?.checks?.length ? `
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-top:24px;margin-bottom:14px">${label}</div>
    ${renderChecks((cat as SeoCategory).checks)}` : '').join('')}
    ` : ''}
  `) : ''}

  ${aeo ? card('#F59E0B,#EF4444', 'SECTION', 'Answer Engine Optimisation', `
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">How well this page is structured for AI tools like ChatGPT, Perplexity and Google AI Overviews</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
      <div style="background:#F7F8FD;border-radius:10px;padding:16px;border:1px solid #ECEEF7">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:12px">FAQ SCORE</div>
        ${isNaPage ? '<div style="font-size:13px;color:#8B90AA;font-style:italic">N/A for this page type â FAQ checks not applicable to contact and about pages</div>' : `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;color:#374151">FAQ Schema Q&A Pairs</span>
            <span style="font-size:12px;font-weight:700;color:${scoreColor(Math.round(((aeo?.breakdown?.faqSchemaPairs ?? 0)/4)*100))}">${aeo?.breakdown?.faqSchemaPairs ?? 0}/4</span>
          </div>
          <div style="height:6px;background:#E5E7EB;border-radius:3px"><div style="height:6px;border-radius:3px;background:${scoreColor(Math.round(((aeo?.breakdown?.faqSchemaPairs ?? 0)/4)*100))};width:${Math.round(((aeo?.breakdown?.faqSchemaPairs ?? 0)/4)*100)}%"></div></div>
        </div>
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;color:#374151">Q&A with Answer Content</span>
            <span style="font-size:12px;font-weight:700;color:${scoreColor(Math.round(((aeo?.breakdown?.faqAnswerPairs ?? 0)/3)*100))}">${aeo?.breakdown?.faqAnswerPairs ?? 0}/3</span>
          </div>
          <div style="height:6px;background:#E5E7EB;border-radius:3px"><div style="height:6px;border-radius:3px;background:${scoreColor(Math.round(((aeo?.breakdown?.faqAnswerPairs ?? 0)/3)*100))};width:${Math.round(((aeo?.breakdown?.faqAnswerPairs ?? 0)/3)*100)}%"></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:12px;color:#374151">Question Headings</span>
            <span style="font-size:12px;font-weight:700;color:${scoreColor(Math.round(((aeo?.breakdown?.questionHeadings ?? 0)/3)*100))}">${aeo?.breakdown?.questionHeadings ?? 0}/3</span>
          </div>
          <div style="height:6px;background:#E5E7EB;border-radius:3px"><div style="height:6px;border-radius:3px;background:${scoreColor(Math.round(((aeo?.breakdown?.questionHeadings ?? 0)/3)*100))};width:${Math.round(((aeo?.breakdown?.questionHeadings ?? 0)/3)*100)}%"></div></div>
        </div>
        `}
      </div>
      <div style="background:#F7F8FD;border-radius:10px;padding:16px;border:1px solid #ECEEF7">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:12px">AEO READINESS <span style="color:#374151">${aeoRd ?? 0}/30</span></div>
        ${[
          ['Schema Markup', aeo?.breakdown?.schemaPresent ?? 0, 8],
          ['Schema Relevance', aeo?.breakdown?.schemaRelevance ?? 0, 6],
          ['Lists & Tables', aeo?.breakdown?.structuredLists ?? 0, 4],
          ['Meta as Answer', aeo?.breakdown?.metaAsAnswer ?? 0, 3],
          ['Entity Signals', aeo?.breakdown?.entitySignals ?? 0, 3],
          ['Content Depth', aeo?.breakdown?.contentDepth ?? 0, 3],
          ['Open Graph', aeo?.breakdown?.openGraph ?? 0, 2],
          ['HTTPS + Canonical', aeo?.breakdown?.httpsCanonical ?? 0, 1],
        ].map(([label, pts, max]) => `
          <div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;margin-bottom:3px">
              <span style="font-size:11px;color:#374151">${label}</span>
              <span style="font-size:11px;font-weight:700;color:${scoreColor(Math.round((Number(pts)/Number(max))*100))}">${pts}/${max}</span>
            </div>
            <div style="height:5px;background:#E5E7EB;border-radius:3px"><div style="height:5px;border-radius:3px;background:${scoreColor(Math.round((Number(pts)/Number(max))*100))};width:${Math.round((Number(pts)/Number(max))*100)}%"></div></div>
          </div>
        `).join('')}
      </div>
    </div>
  `) : ''}

  ${r.lpScoring ? card('#10B981,#6366F1', 'SECTION', 'Landing Page Analysis', `
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">Score: <strong style="color:${scoreColor(lpScore)}">${lpScore}/100</strong></div>
    ${Object.entries(r.lpScoring).map(([key, cat]) => {
      const c = cat as LpCategory
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
      const pct = c.percentage ?? 0
      return `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:13px;color:#0E1120">${label}</span>
          <span style="font-size:13px;font-weight:700;color:${scoreColor(pct)}">${c.score}<span style="color:#8B90AA;font-weight:400"> / ${c.maxScore}</span></span>
        </div>
        <div style="height:5px;background:#ECEEF7;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${scoreColor(pct)};border-radius:3px"></div>
        </div>
        ${c.assessment ? `<p style="font-size:12px;color:#8B90AA;margin-top:6px;margin-bottom:16px;line-height:1.5">${c.assessment}</p>` : ''}
        ${c.subScores?.length ? renderLpSubScores(c.subScores) : ''}
      </div>`
    }).join('')}
  `) : ''}

  ${r.strengthsWeaknesses ? card('#6366F1,#3B82F6', 'SECTION', 'Strengths & Weaknesses', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#10B981;margin-bottom:12px">STRENGTHS</div>
        ${(r.strengthsWeaknesses.strengths ?? []).map(s => `
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <span style="color:#10B981;flex-shrink:0;font-weight:700">â</span>
          <span style="font-size:12px;color:#4A5280;line-height:1.6">${s}</span>
        </div>`).join('')}
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#EF4444;margin-bottom:12px">WEAKNESSES</div>
        ${(r.strengthsWeaknesses.weaknesses ?? []).map(w => `
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <span style="color:#EF4444;flex-shrink:0;font-weight:700">â</span>
          <span style="font-size:12px;color:#4A5280;line-height:1.6">${w}</span>
        </div>`).join('')}
      </div>
    </div>
    ${(r.strengthsWeaknesses.missedOpportunities ?? []).length ? `
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #ECEEF7">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#F59E0B;margin-bottom:12px">MISSED OPPORTUNITIES</div>
      ${r.strengthsWeaknesses.missedOpportunities.map(o => `
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <span style="color:#F59E0B;flex-shrink:0;font-weight:700">â</span>
        <span style="font-size:12px;color:#4A5280;line-height:1.6">${o}</span>
      </div>`).join('')}
    </div>` : ''}
  `) : ''}

  ${r.recommendations?.length ? card('#8B5CF6,#6366F1', 'SECTION', 'Recommendations', `
    ${r.recommendations.map(rec => {
      const priBg = rec.priority === 'High' ? 'background:#FEE2E2;color:#B91C1C' : rec.priority === 'Medium' ? 'background:#FEF3C7;color:#92400E' : 'background:#D1FAE5;color:#065F46'
      return `
      <div style="border-radius:10px;border:1px solid #ECEEF7;overflow:hidden;margin-bottom:12px;box-shadow:0 1px 8px rgba(0,0,0,0.06)">
        <div style="padding:14px 20px;background:#F7F8FD;border-bottom:1px solid #ECEEF7;display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:13px;font-weight:700;color:#0E1120">${rec.area}</div>
          <span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:99px;${priBg}">${rec.priority}</span>
        </div>
        <div style="padding:14px 20px;background:#fff">
          <div style="font-size:12px;color:#4A5280;line-height:1.7">${rec.action}</div>
        </div>
      </div>`
    }).join('')}
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
  a.download = `audit-${slug}-${new Date(audit.date).toISOString().split('T')[0]}.html`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href) }, 100)
}


export function exportCompetitorHTML(report: import('./types').CompetitorIntelligenceReport): void {
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
  const seoCompCard = seoProfiles.length ? card('#6366F1,#3B82F6', 'SECTION', 'SEO Comparison', `
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
      </div>`).join('')}
    ${seoProfiles[0]?.seoBreakdown ? `
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #ECEEF7">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#8B90AA;margin-bottom:14px">BREAKDOWN</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#F7F8FD">
                <th style="text-align:left;padding:8px 12px;color:#8B90AA;font-size:10px;font-weight:700;letter-spacing:.08em;border-bottom:1px solid #ECEEF7">CATEGORY</th>
                ${seoProfiles.map(p => `<th style="text-align:center;padding:8px 12px;color:#8B90AA;font-size:10px;font-weight:700;letter-spacing:.08em;border-bottom:1px solid #ECEEF7">${p.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${Object.keys(seoProfiles[0].seoBreakdown ?? {}).map(cat => `
                <tr style="border-bottom:1px solid #ECEEF7">
                  <td style="padding:8px 12px;color:#4A5280;text-transform:capitalize">${cat.replace(/([A-Z])/g,' $1').trim()}</td>
                  ${seoProfiles.map(p => {
                    const v = p.seoBreakdown?.[cat] ?? 0
                    return `<td style="text-align:center;padding:8px 12px;font-weight:700;color:${v > 0 ? '#10B981' : '#8B90AA'}">${v}</td>`
                  }).join('')}
                </tr>`).join('')}
              <tr style="background:#F7F8FD;font-weight:700">
                <td style="padding:10px 12px;color:#0E1120;font-weight:700">Total /62</td>
                ${seoProfiles.map(p => `<td style="text-align:center;padding:10px 12px;font-weight:700;color:${scoreColor(p.seoScore??0)}">${p.seoScore}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>` : ''}
  `) : ''

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
        ${report.tableStakes.map(s => `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#6366F1;font-weight:700">·</span><span style="font-size:12px;color:#4A5280">${s}</span></div>`).join('')}
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
        ${report.noiseToAvoid.map(n => `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#EF4444;font-weight:700">✗</span><span style="font-size:12px;color:#4A5280">${n}</span></div>`).join('')}
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
    <div style="font-size:13px;color:#8B90AA;margin-bottom:4px">${report.market ? report.market + ' · ' : ''}${report.profiles.length} competitors analysed</div>
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
