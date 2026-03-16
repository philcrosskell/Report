import { AuditRequest } from './types'
import { ScrapedPage } from './scraper'

export function buildPromptPart1(req: AuditRequest, scraped?: ScrapedPage): string {
  const { url, label, project, competitors = [], lpWeights } = req
  const w = lpWeights ?? { messageClarity: 30, trustSocialProof: 25, ctaForms: 20, technicalPerformance: 15, visualUX: 10 }
  const hasReal = scraped && !scraped.error

  return `You are a senior SEO and landing page auditor. Analyse this page and return Part 1 of the audit as JSON.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

${hasReal ? `REAL PAGE DATA (use as ground truth — do not contradict these facts):
Title: ${scraped.title || 'MISSING'}
Meta description: ${scraped.metaDescription || 'MISSING'}
H1 (${scraped.h1.length}): ${scraped.h1.slice(0,3).join(' | ') || 'NONE IN STATIC HTML — scraper cannot execute JavaScript. If the site uses a JS framework (Webflow, Framer, React, etc.), the H1 may exist but be rendered client-side. Flag as a potential issue with this caveat, not a definitive critical fail.'}
H2 (${scraped.h2.length}): ${scraped.h2.slice(0,4).join(' | ') || 'none'}
Words: ${scraped.wordCount} | Paragraphs: ${scraped.paragraphCount}
Internal links: ${scraped.internalLinks} | External: ${scraped.externalLinks} | Nav items: ${scraped.navLinksCount}
Images: ${scraped.images} | Missing alt: ${scraped.imagesMissingAlt}
Forms: ${scraped.hasForms ? `YES — ${scraped.formCount} form(s), ~${scraped.formFields} fields` : 'NO FORMS ON THIS PAGE'}
CTAs: ${scraped.ctaButtonCount} | Phone: ${scraped.phoneNumbers[0] ?? 'none'} | Email: ${scraped.emailAddresses[0] ?? 'none'}
HTTPS: ${scraped.hasHttps ? 'yes' : 'NO'} | Response: ${scraped.responseTimeMs}ms | Size: ${Math.round(scraped.htmlSizeBytes/1024)}kB
Canonical: ${scraped.canonicalUrl || 'missing'} | Lang: ${scraped.language || 'not set'} | Viewport: ${scraped.hasViewport ? 'yes' : 'MISSING'}
Schema: ${scraped.hasSchema ? scraped.schemaTypes.join(', ') : 'none'} | OG: ${scraped.hasOpenGraph ? 'yes' : 'missing'} | Analytics: ${scraped.hasGoogleAnalytics || scraped.hasGTM ? 'yes' : 'none detected'} | Favicon: ${scraped.hasFavicon ? 'yes' : 'missing'}
${scraped.isSinglePageSite ? `
⚠ SINGLE PAGE SITE — This appears to be a single page website. You MUST flag the following as critical SEO issues in pageQuality and linkStructure checks:
- Limited keyword targeting: can only rank for one primary topic
- No topical authority: Google cannot index depth of expertise
- Missing location pages: cannot rank for multiple cities/regions
- No internal linking structure: limits crawlability and authority distribution
- No content strategy possible: organic traffic growth permanently capped
- Recommend migration to multi-page structure as highest-impact SEO change` : ''}` : 'No live page data — infer from URL and domain context only.'}

LP weights: messageClarity=${w.messageClarity}, trustSocialProof=${w.trustSocialProof}, ctaForms=${w.ctaForms}, technicalPerformance=${w.technicalPerformance}, visualUX=${w.visualUX}
Grades: A=90-100 B=70-89 C=50-69 D=30-49 F=0-29

Return ONLY valid complete JSON for Part 1. Start your response with { and end with }. No markdown. No preamble. No explanation. No truncation.

Schema:
{
  "overview": { "url": string, "title": string, "description": string, "pageType": string, "wordCount": number, "responseTime": string, "fileSize": string, "internalLinks": number, "externalLinks": number, "mediaFiles": number, "summary": string },
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
    "messageClarity": { "score": number, "maxScore": ${w.messageClarity}, "percentage": number, "assessment": string, "subScores": [{ "label": string, "score": 0|1|2, "max": 2, "note": string }] },
    "trustSocialProof": { "score": number, "maxScore": ${w.trustSocialProof}, "percentage": number, "assessment": string, "subScores": [...] },
    "ctaForms": { "score": number, "maxScore": ${w.ctaForms}, "percentage": number, "assessment": string, "subScores": [...] },
    "technicalPerformance": { "score": number, "maxScore": ${w.technicalPerformance}, "percentage": number, "assessment": string, "subScores": [...] },
    "visualUX": { "score": number, "maxScore": ${w.visualUX}, "percentage": number, "assessment": string, "subScores": [...] }
  },
  "projectedScoreAfterFixes": { "messageClarity": number, "trustSocialProof": number, "ctaForms": number, "technicalPerformance": number, "visualUX": number, "total": number, "grade": string }
}

Each seoCategory needs 3-8 specific checks based on the real data. Each lpScoring category needs exactly 5 subScores. Be specific — reference actual findings from the real page data above.`
}

export function buildPromptPart2(req: AuditRequest, part1Summary: string, scraped?: ScrapedPage): string {
  const { url, label, project, competitors = [] } = req
  const hasReal = scraped && !scraped.error

  return `You are a senior SEO and landing page auditor completing an audit.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

Part 1 scores: ${part1Summary}

${hasReal ? `Key facts: Forms=${scraped.hasForms ? `YES (${scraped.formCount}, ~${scraped.formFields} fields)` : 'NONE'} | H1="${scraped.h1[0] ?? 'not found in static HTML (may be JS-rendered)'}" | Words=${scraped.wordCount} | Phone=${scraped.phoneNumbers[0] ?? 'none'} | Schema=${scraped.hasSchema ? scraped.schemaTypes.join(',') : 'none'} | Missing alt=${scraped.imagesMissingAlt}${scraped.isSinglePageSite ? ' | ⚠ SINGLE PAGE SITE — include migration to multi-page as a High priority fix and critical issue in gap analysis' : ''}` : ''}

Return ONLY valid complete JSON for Part 2. Start your response with { and end with }. No markdown. No preamble. No explanation. No truncation.

{
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
    "gaps": []
  },
  "priorityFixes": [{ "rank": number, "title": string, "problem": string, "fix": string, "difficulty": "Easy"|"Medium"|"Hard", "uplift": string, "timeline": string }],
  "strengthsWeaknesses": { "strengths": [string], "weaknesses": [string], "missedOpportunities": [string] },
  "recommendations": [{ "priority": "High"|"Medium"|"Low", "area": string, "action": string }]
}

Include 3 criticalIssues, 3 quickWins, 5 priorityFixes, 5 each for strengths/weaknesses/missed, 6 recommendations. All specific to this URL and real findings.`
}

export function buildPrompt(req: AuditRequest): string {
  return buildPromptPart1(req)
}import { AuditRequest } from './types'
import { ScrapedPage } from './scraper'

export function buildPromptPart1(req: AuditRequest, scraped?: ScrapedPage): string {
  const { url, label, project, competitors = [], lpWeights } = req
  const w = lpWeights ?? { messageClarity: 30, trustSocialProof: 25, ctaForms: 20, technicalPerformance: 15, visualUX: 10 }
  const hasReal = scraped && !scraped.error

  return `You are a senior SEO and landing page auditor. Analyse this page and return Part 1 of the audit as JSON.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

${hasReal ? `REAL PAGE DATA (use as ground truth — do not contradict these facts):
Title: ${scraped.title || 'MISSING'}
Meta description: ${scraped.metaDescription || 'MISSING'}
H1 (${scraped.h1.length}): ${scraped.h1.slice(0,3).join(' | ') || 'NONE'}
H2 (${scraped.h2.length}): ${scraped.h2.slice(0,4).join(' | ') || 'none'}
Words: ${scraped.wordCount} | Paragraphs: ${scraped.paragraphCount}
Internal links: ${scraped.internalLinks} | External: ${scraped.externalLinks} | Nav items: ${scraped.navLinksCount}
Images: ${scraped.images} | Missing alt: ${scraped.imagesMissingAlt}
Forms: ${scraped.hasForms ? `YES — ${scraped.formCount} form(s), ~${scraped.formFields} fields` : 'NO FORMS ON THIS PAGE'}
CTAs: ${scraped.ctaButtonCount} | Phone: ${scraped.phoneNumbers[0] ?? 'none'} | Email: ${scraped.emailAddresses[0] ?? 'none'}
HTTPS: ${scraped.hasHttps ? 'yes' : 'NO'} | Response: ${scraped.responseTimeMs}ms | Size: ${Math.round(scraped.htmlSizeBytes/1024)}kB
Canonical: ${scraped.canonicalUrl || 'missing'} | Lang: ${scraped.language || 'not set'} | Viewport: ${scraped.hasViewport ? 'yes' : 'MISSING'}
Schema: ${scraped.hasSchema ? scraped.schemaTypes.join(', ') : 'none'} | OG: ${scraped.hasOpenGraph ? 'yes' : 'missing'} | Analytics: ${scraped.hasGoogleAnalytics || scraped.hasGTM ? 'yes' : 'none detected'} | Favicon: ${scraped.hasFavicon ? 'yes' : 'missing'}
${scraped.isSinglePageSite ? `
⚠ SINGLE PAGE SITE — This appears to be a single page website. You MUST flag the following as critical SEO issues in pageQuality and linkStructure checks:
- Limited keyword targeting: can only rank for one primary topic
- No topical authority: Google cannot index depth of expertise
- Missing location pages: cannot rank for multiple cities/regions
- No internal linking structure: limits crawlability and authority distribution
- No content strategy possible: organic traffic growth permanently capped
- Recommend migration to multi-page structure as highest-impact SEO change` : ''}` : 'No live page data — infer from URL and domain context only.'}

LP weights: messageClarity=${w.messageClarity}, trustSocialProof=${w.trustSocialProof}, ctaForms=${w.ctaForms}, technicalPerformance=${w.technicalPerformance}, visualUX=${w.visualUX}
Grades: A=90-100 B=70-89 C=50-69 D=30-49 F=0-29

Return ONLY valid complete JSON for Part 1. Start your response with { and end with }. No markdown. No preamble. No explanation. No truncation.

Schema:
{
  "overview": { "url": string, "title": string, "description": string, "pageType": string, "wordCount": number, "responseTime": string, "fileSize": string, "internalLinks": number, "externalLinks": number, "mediaFiles": number, "summary": string },
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
    "messageClarity": { "score": number, "maxScore": ${w.messageClarity}, "percentage": number, "assessment": string, "subScores": [{ "label": string, "score": 0|1|2, "max": 2, "note": string }] },
    "trustSocialProof": { "score": number, "maxScore": ${w.trustSocialProof}, "percentage": number, "assessment": string, "subScores": [...] },
    "ctaForms": { "score": number, "maxScore": ${w.ctaForms}, "percentage": number, "assessment": string, "subScores": [...] },
    "technicalPerformance": { "score": number, "maxScore": ${w.technicalPerformance}, "percentage": number, "assessment": string, "subScores": [...] },
    "visualUX": { "score": number, "maxScore": ${w.visualUX}, "percentage": number, "assessment": string, "subScores": [...] }
  },
  "projectedScoreAfterFixes": { "messageClarity": number, "trustSocialProof": number, "ctaForms": number, "technicalPerformance": number, "visualUX": number, "total": number, "grade": string }
}

Each seoCategory needs 3-8 specific checks based on the real data. Each lpScoring category needs exactly 5 subScores. Be specific — reference actual findings from the real page data above.`
}

export function buildPromptPart2(req: AuditRequest, part1Summary: string, scraped?: ScrapedPage): string {
  const { url, label, project, competitors = [] } = req
  const hasReal = scraped && !scraped.error

  return `You are a senior SEO and landing page auditor completing an audit.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

Part 1 scores: ${part1Summary}

${hasReal ? `Key facts: Forms=${scraped.hasForms ? `YES (${scraped.formCount}, ~${scraped.formFields} fields)` : 'NONE'} | H1="${scraped.h1[0] ?? 'missing'}" | Words=${scraped.wordCount} | Phone=${scraped.phoneNumbers[0] ?? 'none'} | Schema=${scraped.hasSchema ? scraped.schemaTypes.join(',') : 'none'} | Missing alt=${scraped.imagesMissingAlt}${scraped.isSinglePageSite ? ' | ⚠ SINGLE PAGE SITE — include migration to multi-page as a High priority fix and critical issue in gap analysis' : ''}` : ''}

Return ONLY valid complete JSON for Part 2. Start your response with { and end with }. No markdown. No preamble. No explanation. No truncation.

{
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
    "gaps": []
  },
  "priorityFixes": [{ "rank": number, "title": string, "problem": string, "fix": string, "difficulty": "Easy"|"Medium"|"Hard", "uplift": string, "timeline": string }],
  "strengthsWeaknesses": { "strengths": [string], "weaknesses": [string], "missedOpportunities": [string] },
  "recommendations": [{ "priority": "High"|"Medium"|"Low", "area": string, "action": string }]
}

Include 3 criticalIssues, 3 quickWins, 5 priorityFixes, 5 each for strengths/weaknesses/missed, 6 recommendations. All specific to this URL and real findings.`
}

export function buildPrompt(req: AuditRequest): string {
  return buildPromptPart1(req)
}
