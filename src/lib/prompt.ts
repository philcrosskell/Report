import { AuditRequest } from './types'

export function buildPromptPart1(req: AuditRequest): string {
  const { url, label, project, competitors = [], lpWeights } = req
  const w = lpWeights ?? { messageClarity: 30, trustSocialProof: 25, ctaForms: 20, technicalPerformance: 15, visualUX: 10 }

  return `You are a senior SEO and landing page auditor. Analyse this URL.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

You cannot fetch the URL. Use domain, path, TLD, and industry context. Be specific.

LP weights: messageClarity=${w.messageClarity}, trustSocialProof=${w.trustSocialProof}, ctaForms=${w.ctaForms}, technicalPerformance=${w.technicalPerformance}, visualUX=${w.visualUX}
Grades: A=90-100, B=70-89, C=50-69, D=30-49, F=0-29

Return ONLY valid complete JSON — no markdown, no truncation:

{
  "overview": {
    "url": "${url}",
    "title": "inferred title",
    "description": "inferred meta description",
    "pageType": "Homepage|Service Page|Landing Page|Product Page|Blog",
    "wordCount": 700,
    "responseTime": "1.1s",
    "fileSize": "155 kB",
    "internalLinks": 40,
    "externalLinks": 2,
    "mediaFiles": 14,
    "summary": "2-3 sentence executive summary of strengths and weaknesses"
  },
  "scores": { "seo": 74, "lp": 58, "overall": 66, "grade": "C" },
  "seoCategories": {
    "metaInformation": { "score": 92, "checks": [
      { "label": "Title tag", "status": "pass", "detail": "specific detail", "criticality": "critical" },
      { "label": "Meta description", "status": "pass", "detail": "specific detail", "criticality": "critical" },
      { "label": "Crawlability", "status": "pass", "detail": "specific detail", "criticality": "critical" },
      { "label": "Canonical URL", "status": "pass", "detail": "specific detail", "criticality": "important" },
      { "label": "Language declaration", "status": "pass", "detail": "specific detail", "criticality": "somewhat" },
      { "label": "Charset encoding", "status": "pass", "detail": "specific detail", "criticality": "somewhat" },
      { "label": "Favicon", "status": "pass", "detail": "specific detail", "criticality": "nice" }
    ]},
    "pageQuality": { "score": 75, "checks": [
      { "label": "Word count", "status": "warn", "detail": "specific detail", "criticality": "critical" },
      { "label": "Title-content alignment", "status": "pass", "detail": "specific detail", "criticality": "critical" },
      { "label": "Image alt text", "status": "fail", "detail": "specific detail", "criticality": "somewhat" },
      { "label": "Mobile optimisation", "status": "pass", "detail": "specific detail", "criticality": "somewhat" },
      { "label": "Social markup", "status": "warn", "detail": "specific detail", "criticality": "nice" },
      { "label": "Schema markup", "status": "fail", "detail": "specific detail", "criticality": "nice" }
    ]},
    "pageStructure": { "score": 86, "checks": [
      { "label": "H1 heading", "status": "pass", "detail": "specific detail", "criticality": "critical" },
      { "label": "Heading hierarchy", "status": "warn", "detail": "specific detail", "criticality": "important" },
      { "label": "Paragraph count", "status": "pass", "detail": "specific detail", "criticality": "critical" }
    ]},
    "linkStructure": { "score": 62, "checks": [
      { "label": "Internal links", "status": "pass", "detail": "specific detail", "criticality": "important" },
      { "label": "Anchor text diversity", "status": "fail", "detail": "specific detail", "criticality": "important" },
      { "label": "External links", "status": "pass", "detail": "specific detail", "criticality": "nice" },
      { "label": "Dynamic parameters", "status": "pass", "detail": "specific detail", "criticality": "important" }
    ]},
    "serverTechnical": { "score": 82, "checks": [
      { "label": "HTTPS", "status": "pass", "detail": "specific detail", "criticality": "somewhat" },
      { "label": "HTTP compression", "status": "pass", "detail": "specific detail", "criticality": "important" },
      { "label": "Response time", "status": "warn", "detail": "specific detail", "criticality": "somewhat" },
      { "label": "www redirect", "status": "pass", "detail": "specific detail", "criticality": "critical" }
    ]},
    "externalFactors": { "score": 35, "checks": [
      { "label": "Backlink profile", "status": "warn", "detail": "specific detail", "criticality": "critical" }
    ]}
  },
  "lpScoring": {
    "messageClarity": { "score": 16, "maxScore": ${w.messageClarity}, "percentage": 53, "assessment": "specific assessment", "subScores": [
      { "label": "Headline effectiveness", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Value proposition clarity", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Copy scannability", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Outcome-focused language", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Ad-to-page message match", "score": 1, "max": 2, "note": "specific note" }
    ]},
    "trustSocialProof": { "score": 5, "maxScore": ${w.trustSocialProof}, "percentage": 20, "assessment": "specific assessment", "subScores": [
      { "label": "Customer testimonials", "score": 0, "max": 2, "note": "specific note" },
      { "label": "Trust badges", "score": 0, "max": 2, "note": "specific note" },
      { "label": "Client logos", "score": 0, "max": 2, "note": "specific note" },
      { "label": "Contact accessibility", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Professional appearance", "score": 1, "max": 2, "note": "specific note" }
    ]},
    "ctaForms": { "score": 7, "maxScore": ${w.ctaForms}, "percentage": 35, "assessment": "specific assessment", "subScores": [
      { "label": "CTA clarity and dominance", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Form presence", "score": 0, "max": 2, "note": "specific note" },
      { "label": "Above-fold conversion path", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Urgency and incentive", "score": 0, "max": 2, "note": "specific note" },
      { "label": "CTA-page intent alignment", "score": 1, "max": 2, "note": "specific note" }
    ]},
    "technicalPerformance": { "score": 9, "maxScore": ${w.technicalPerformance}, "percentage": 60, "assessment": "specific assessment", "subScores": [
      { "label": "Page load speed", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Core Web Vitals", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Mobile responsiveness", "score": 2, "max": 2, "note": "specific note" },
      { "label": "Tracking implementation", "score": 1, "max": 2, "note": "specific note" },
      { "label": "Technical errors", "score": 1, "max": 2, "note": "specific note" }
    ]},
    "visualUX": { "score": 6, "maxScore": ${w.visualUX}, "percentage": 60, "assessment": "specific assessment", "subScores": [
      { "label": "Visual hierarchy", "score": 1, "max": 2, "note": "specific note" },
      { "label": "White space and readability", "score": 2, "max": 2, "note": "specific note" },
      { "label": "Image quality", "score": 2, "max": 2, "note": "specific note" },
      { "label": "Navigation simplicity", "score": 0, "max": 2, "note": "specific note" },
      { "label": "Brand consistency", "score": 1, "max": 2, "note": "specific note" }
    ]}
  },
  "projectedScoreAfterFixes": {
    "messageClarity": 22, "trustSocialProof": 18, "ctaForms": 14, "technicalPerformance": 12, "visualUX": 8,
    "total": 74, "grade": "B"
  }
}`
}

export function buildPromptPart2(req: AuditRequest, part1Summary: string): string {
  const { url, label, project, competitors = [] } = req

  return `You are a senior SEO and landing page auditor completing an audit report.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

Part 1 of the audit produced these scores:
${part1Summary}

Now return ONLY valid complete JSON for the remaining sections — no markdown, no truncation:

{
  "gapAnalysis": {
    "executiveSummary": "one paragraph: what works, what is costing conversions, biggest lever",
    "criticalIssues": [
      { "issue": "specific issue", "impact": "specific impact on conversions", "fix": "specific fix action", "effort": "Easy" },
      { "issue": "specific issue", "impact": "specific impact", "fix": "specific fix", "effort": "Medium" },
      { "issue": "specific issue", "impact": "specific impact", "fix": "specific fix", "effort": "Easy" }
    ],
    "quickWins": [
      { "win": "specific win", "action": "specific action", "timeEstimate": "30 minutes" },
      { "win": "specific win", "action": "specific action", "timeEstimate": "1 hour" },
      { "win": "specific win", "action": "specific action", "timeEstimate": "2 hours" }
    ],
    "positioningGap": "one paragraph on hook type, what market does, what is unclaimed",
    "topRecommendation": "single most important action and why",
    "beforeScore": 58,
    "afterScore": 74,
    "beforeGrade": "C",
    "afterGrade": "B"
  },
  "competitorAnalysis": {
    "hookType": "Services List",
    "hookAnalysis": "specific analysis of this page's hook approach",
    "tableStakes": ["claim 1", "claim 2", "claim 3", "claim 4", "claim 5"],
    "whiteSpace": [
      { "opportunity": "specific opportunity", "rationale": "specific rationale", "owner": "Available to claim now" },
      { "opportunity": "specific opportunity", "rationale": "specific rationale", "owner": "Available to claim now" },
      { "opportunity": "specific opportunity", "rationale": "specific rationale", "owner": "Available to claim now" }
    ],
    "buyerAnxieties": [
      { "anxiety": "specific anxiety", "addressed": false, "note": "specific note" },
      { "anxiety": "specific anxiety", "addressed": false, "note": "specific note" },
      { "anxiety": "specific anxiety", "addressed": false, "note": "specific note" },
      { "anxiety": "specific anxiety", "addressed": false, "note": "specific note" }
    ],
    "positioningStrength": "Moderate",
    "positioningNote": "specific positioning assessment",
    "gaps": []
  },
  "priorityFixes": [
    { "rank": 1, "title": "specific title", "problem": "specific problem", "fix": "specific fix", "difficulty": "Medium", "uplift": "+40-60% enquiry conversion", "timeline": "2-4 weeks" },
    { "rank": 2, "title": "specific title", "problem": "specific problem", "fix": "specific fix", "difficulty": "Easy", "uplift": "+25-35% conversion", "timeline": "1 week" },
    { "rank": 3, "title": "specific title", "problem": "specific problem", "fix": "specific fix", "difficulty": "Easy", "uplift": "+15-25% engagement", "timeline": "1-2 days" },
    { "rank": 4, "title": "specific title", "problem": "specific problem", "fix": "specific fix", "difficulty": "Easy", "uplift": "+5-10 SEO points", "timeline": "1-2 hours" },
    { "rank": 5, "title": "specific title", "problem": "specific problem", "fix": "specific fix", "difficulty": "Medium", "uplift": "+10-15 SEO points", "timeline": "2-4 hours" }
  ],
  "strengthsWeaknesses": {
    "strengths": ["strength 1", "strength 2", "strength 3", "strength 4", "strength 5"],
    "weaknesses": ["weakness 1", "weakness 2", "weakness 3", "weakness 4", "weakness 5"],
    "missedOpportunities": ["opportunity 1", "opportunity 2", "opportunity 3", "opportunity 4", "opportunity 5"]
  },
  "recommendations": [
    { "priority": "High", "area": "Conversion", "action": "specific action" },
    { "priority": "High", "area": "Trust", "action": "specific action" },
    { "priority": "High", "area": "Messaging", "action": "specific action" },
    { "priority": "Medium", "area": "SEO", "action": "specific action" },
    { "priority": "Medium", "area": "Technical", "action": "specific action" },
    { "priority": "Low", "area": "SEO", "action": "specific action" }
  ]
}`
}

// Keep single buildPrompt export for backwards compatibility
export function buildPrompt(req: AuditRequest): string {
  return buildPromptPart1(req)
}
