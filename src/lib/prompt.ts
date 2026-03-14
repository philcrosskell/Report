import { AuditRequest } from './types'

export function buildPrompt(req: AuditRequest): string {
  const { url, label, project, competitors = [], lpWeights } = req
  const w = lpWeights ?? { messageClarity: 30, trustSocialProof: 25, ctaForms: 20, technicalPerformance: 15, visualUX: 10 }

  return `You are a senior SEO and landing page auditor. Analyse this URL and return a structured JSON report.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

You cannot fetch the live URL. Use domain name, URL path, TLD, and industry context to make an accurate professional assessment. Be specific and actionable — avoid generic advice.

---
SCORING RULES

SEO Score (0-100): Assess 6 categories, each 0-100:
- metaInformation: title tag (≤580px), meta description (≤1000px), canonical, crawlability, language, charset, favicon
- pageQuality: word count (target 800+), title-content alignment, image alt text, mobile viewport, social markup, schema markup
- pageStructure: H1 presence and length (≥20 chars), heading hierarchy, duplicate headings
- linkStructure: internal link count, anchor text diversity, external links, dynamic parameters
- serverTechnical: HTTPS, compression, response time (target <0.4s), www redirect
- externalFactors: backlink profile estimate

LP Score (0-100): 5 weighted categories, each with 5 sub-scores (0, 1, or 2):
- messageClarity (max ${w.messageClarity}): headline effectiveness, value proposition, copy scannability, outcome language, ad match
- trustSocialProof (max ${w.trustSocialProof}): testimonials, trust badges, client logos, contact accessibility, professionalism
- ctaForms (max ${w.ctaForms}): CTA dominance, form presence, above-fold path, urgency, intent alignment
- technicalPerformance (max ${w.technicalPerformance}): load speed, core web vitals, mobile, tracking, errors
- visualUX (max ${w.visualUX}): visual hierarchy, white space, image quality, nav simplicity, brand consistency

Overall = weighted average of SEO and LP scores
Grade: A=90-100, B=70-89, C=50-69, D=30-49, F=0-29

---
RESPONSE FORMAT

Return ONLY a single valid JSON object. No markdown fences. No explanation. No truncation. The JSON must be complete and valid — every array and object must be properly closed.

Required structure:

{
  "overview": {
    "url": string,
    "title": string,
    "description": string,
    "pageType": string,
    "wordCount": number,
    "responseTime": string,
    "fileSize": string,
    "internalLinks": number,
    "externalLinks": number,
    "mediaFiles": number,
    "summary": string (2-3 sentences)
  },
  "scores": { "seo": number, "lp": number, "overall": number, "grade": "A"|"B"|"C"|"D"|"F" },
  "seoCategories": {
    "metaInformation": { "score": number, "checks": [{ "label": string, "status": "pass"|"warn"|"fail", "detail": string, "criticality": "critical"|"important"|"somewhat"|"nice" }] },
    "pageQuality": { "score": number, "checks": [...] },
    "pageStructure": { "score": number, "checks": [...] },
    "linkStructure": { "score": number, "checks": [...] },
    "serverTechnical": { "score": number, "checks": [...] },
    "externalFactors": { "score": number, "checks": [...] }
  },
  "lpScoring": {
    "messageClarity": { "score": number, "maxScore": ${w.messageClarity}, "percentage": number, "assessment": string, "subScores": [{ "label": string, "score": number, "max": 2, "note": string }] },
    "trustSocialProof": { "score": number, "maxScore": ${w.trustSocialProof}, "percentage": number, "assessment": string, "subScores": [...] },
    "ctaForms": { "score": number, "maxScore": ${w.ctaForms}, "percentage": number, "assessment": string, "subScores": [...] },
    "technicalPerformance": { "score": number, "maxScore": ${w.technicalPerformance}, "percentage": number, "assessment": string, "subScores": [...] },
    "visualUX": { "score": number, "maxScore": ${w.visualUX}, "percentage": number, "assessment": string, "subScores": [...] }
  },
  "projectedScoreAfterFixes": {
    "messageClarity": number, "trustSocialProof": number, "ctaForms": number, "technicalPerformance": number, "visualUX": number,
    "total": number, "grade": string
  },
  "gapAnalysis": {
    "executiveSummary": string,
    "criticalIssues": [{ "issue": string, "impact": string, "fix": string, "effort": "Easy"|"Medium"|"Hard" }],
    "quickWins": [{ "win": string, "action": string, "timeEstimate": string }],
    "positioningGap": string,
    "topRecommendation": string,
    "beforeScore": number,
    "afterScore": number,
    "beforeGrade": string,
    "afterGrade": string
  },
  "competitorAnalysis": {
    "hookType": string,
    "hookAnalysis": string,
    "tableStakes": [string],
    "whiteSpace": [{ "opportunity": string, "rationale": string, "owner": string }],
    "buyerAnxieties": [{ "anxiety": string, "addressed": boolean, "note": string }],
    "positioningStrength": "Strong"|"Moderate"|"Weak",
    "positioningNote": string,
    "gaps": [{ "area": string, "status": "Ahead"|"Behind"|"Similar", "detail": string }]
  },
  "priorityFixes": [{ "rank": number, "title": string, "problem": string, "fix": string, "difficulty": "Easy"|"Medium"|"Hard", "uplift": string, "timeline": string }],
  "strengthsWeaknesses": {
    "strengths": [string],
    "weaknesses": [string],
    "missedOpportunities": [string]
  },
  "recommendations": [{ "priority": "High"|"Medium"|"Low", "area": string, "action": string }]
}

Populate every field with real, specific analysis of ${url}. Do not use placeholder text.`
}
