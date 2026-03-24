import type { Audit, SeoCheck, LpSubScore, PriorityFix, SeoCategory, LpCategory } from './types'

export function exportHTML(audit: Audit): void {
  const r = audit.report
  const url = audit.url
  const date = new Date(audit.date).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })
  const slug = audit.url.replace(/https?:\/\//,'').replace(/[^a-zA-Z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')

  const seoScore  = audit.scores.seo ?? 0
  const lpScore   = audit.scores.lp ?? 0
  const overall   = audit.scores.overall ?? Math.round((seoScore + lpScore) / 2)
  const grade     = audit.scores.grade ?? '—'
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
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #ECEEF7">
      <span style="width:8px;height:8px;border-radius:50%;background:${statusDot(c.status)};flex-shrink:0;margin-top:5px;display:inline-block"></span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:#0E1120;margin-bottom:2px">${c.label}</div>
        <div style="font-size:12px;color:#8B90AA;line-height:1.6">${c.detail ?? ''}</div>
      </div>
      <span style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:99px;${critBadge(c.criticality ?? 'nice')};white-space:nowrap">${c.criticality ?? 'nice'}</span>
    </div>`).join('')

  const renderLpSubScores = (subs: LpSubScore[] = []): string => subs.map(s => `
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-size:13px;color:#0E1120">${s.label}</span>
        <span style="font-size:13px;font-weight:700;color:${scoreColor(s.score)}">${s.score}<span style="color:#8B90AA;font-weight:400"> / ${s.max}</span></span>
      </div>
      <div style="height:5px;background:#ECEEF7;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${s.score}%;background:${scoreColor(s.score)};border-radius:3px"></div>
      </div>
      ${s.note ? `<p style="font-size:11px;color:#8B90AA;margin-top:4px">${s.note}</p>` : ''}
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
  <title>Audit Report — ${url}</title>
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
      <div style="font-size:13px;color:#8B90AA;margin-bottom:4px">${r.overview?.pageType || 'Web Page'} · ${r.overview?.wordCount || 0} words · ${r.overview?.responseTime || ''}</div>
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
    <div style="font-size:12px;color:#8B90AA;margin-bottom:20px">Ranked by impact — implement these first</div>
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
        ${isNaPage ? '<div style="font-size:13px;color:#8B90AA;font-style:italic">N/A for this page type — FAQ checks not applicable to contact and about pages</div>' : `
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
        ${c.assessment ? `<p style="font-size:12px;color:#8B90AA;margin-top:4px">${c.assessment}</p>` : ''}
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
          <span style="color:#10B981;flex-shrink:0;font-weight:700">✓</span>
          <span style="font-size:12px;color:#4A5280;line-height:1.6">${s}</span>
        </div>`).join('')}
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#EF4444;margin-bottom:12px">WEAKNESSES</div>
        ${(r.strengthsWeaknesses.weaknesses ?? []).map(w => `
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <span style="color:#EF4444;flex-shrink:0;font-weight:700">✗</span>
          <span style="font-size:12px;color:#4A5280;line-height:1.6">${w}</span>
        </div>`).join('')}
      </div>
    </div>
    ${(r.strengthsWeaknesses.missedOpportunities ?? []).length ? `
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #ECEEF7">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#F59E0B;margin-bottom:12px">MISSED OPPORTUNITIES</div>
      ${r.strengthsWeaknesses.missedOpportunities.map(o => `
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <span style="color:#F59E0B;flex-shrink:0;font-weight:700">→</span>
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
  a.click()
}
