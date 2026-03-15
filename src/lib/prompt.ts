import { AuditRequest } from './types'
import { ScrapedPage } from './scraper'

export function buildPromptPart1(req: AuditRequest, scraped?: ScrapedPage): string {
  const { url, label, project, competitors = [], lpWeights } = req
  const w = lpWeights ?? { messageClarity: 30, trustSocialProof: 25, ctaForms: 20, technicalPerformance: 15, visualUX: 10 }

  return `You are a senior SEO and landing page auditor. Analyse this URL and return a structured JSON report.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

${scraped && !scraped.error ? `IMPORTANT: The page has been fetched live. Use the REAL DATA below as ground truth for your audit. Do NOT guess or infer anything that is already answered by the live data. Only infer things that cannot be determined from the HTML (e.g. conversion rate, ad spend, brand perception).

${buildScrapedSection(scraped)}` : `Note: Could not fetch the live page. Base your analysis on URL structure, domain, path, TLD, and industry context.`}

LP weights: messageClarity=${w.messageClarity}, trustSocialProof=${w.trustSocialProof}, ctaForms=${w.ctaForms}, technicalPerformance=${w.technicalPerformance}, visualUX=${w.visualUX}
Grades: A=90-100, B=70-89, C=50-69, D=30-49, F=0-29

Return ONLY valid complete JSON — no markdown, no truncation:

{
  "overview": {
    "url": "${url}",
    "title": "${scraped?.title || 'inferred title'}",
    "description": "${scraped?.metaDescription || 'inferred meta description'}",
    "pageType": "Homepage|Service Page|Landing Page|Product Page|Blog",
    "wordCount": ${scraped?.wordCount || 700},
    "responseTime": "${scraped ? scraped.responseTimeMs + 'ms' : '1.1s'}",
    "fileSize": "${scraped ? Math.round((scraped.htmlSizeBytes || 0) / 1024) + ' kB' : '155 kB'}",
    "internalLinks": ${scraped?.internalLinks || 40},
    "externalLinks": ${scraped?.externalLinks || 2},
    "mediaFiles": ${scraped?.images || 14},
    "summary": "2-3 sentence executive summary using the real page data"
  },
  "scores": { "seo": 74, "lp": 58, "overall": 66, "grade": "C" },
  "seoCategories": {
    "metaInformation": { "score": 92, "checks": [
      { "label": "Title tag", "status": "${scraped ? (scraped.title ? 'pass' : 'fail') : 'pass'}", "detail": "${scraped?.title ? `Present: "${scraped.title.slice(0, 60)}${scraped.title.length > 60 ? '...' : ''}"` : 'MISSING — add a descriptive title tag'}", "criticality": "critical" },
      { "label": "Meta description", "status": "${scraped ? (scraped.metaDescription ? 'pass' : 'fail') : 'pass'}", "detail": "${scraped?.metaDescription ? `Present: "${scraped.metaDescription.slice(0, 80)}${scraped.metaDescription.length > 80 ? '...' : ''}"` : 'MISSING — no meta description found'}", "criticality": "critical" },
      { "label": "Crawlability", "status": "${scraped ? (scraped.robots?.includes('noindex') ? 'fail' : 'pass') : 'pass'}", "detail": "${scraped ? (scraped.robots?.includes('noindex') ? 'BLOCKED — noindex detected in robots meta' : 'No access restrictions detected') : 'Cannot confirm without live data'}", "criticality": "critical" },
      { "label": "Canonical URL", "status": "${scraped ? (scraped.hasCanonical ? 'pass' : 'warn') : 'pass'}", "detail": "${scraped ? (scraped.hasCanonical ? `Canonical set: ${scraped.canonicalUrl}` : 'No canonical tag found') : 'Cannot confirm without live data'}", "criticality": "important" },
      { "label": "Language declaration", "status": "${scraped ? (scraped.language ? 'pass' : 'warn') : 'pass'}", "detail": "${scraped ? (scraped.language ? `Language set to: ${scraped.language}` : 'No lang attribute on html element') : 'Cannot confirm'}", "criticality": "somewhat" },
      { "label": "Charset encoding", "status": "${scraped ? (scraped.charset ? 'pass' : 'warn') : 'pass'}", "detail": "${scraped ? (scraped.charset ? `Charset: ${scraped.charset}` : 'Charset not detected in meta') : 'Cannot confirm'}", "criticality": "somewhat" },
      { "label": "Favicon", "status": "${scraped ? (scraped.hasFavicon ? 'pass' : 'warn') : 'pass'}", "detail": "${scraped ? (scraped.hasFavicon ? 'Favicon linked correctly' : 'No favicon link detected') : 'Cannot confirm'}", "criticality": "nice" },
      { "label": "Open Graph tags", "status": "${scraped ? (scraped.hasOpenGraph ? 'pass' : 'warn') : 'warn'}", "detail": "${scraped ? (scraped.hasOpenGraph ? 'Open Graph tags present' : 'No Open Graph tags — social sharing previews will be poor') : 'Cannot confirm without live data'}", "criticality": "nice" }
    ]},
    "pageQuality": { "score": 75, "checks": [
      { "label": "Word count", "status": "${scraped ? (scraped.wordCount >= 800 ? 'pass' : scraped.wordCount >= 400 ? 'warn' : 'fail') : 'warn'}", "detail": "${scraped ? `${scraped.wordCount} words detected — ${scraped.wordCount >= 800 ? 'good' : scraped.wordCount >= 400 ? 'below 800-word target' : 'VERY LOW — significantly impacts SEO'}` : 'Estimated — could not fetch live'}", "criticality": "critical" },
      { "label": "H1 heading", "status": "${scraped ? (scraped.h1.length === 1 ? 'pass' : scraped.h1.length === 0 ? 'fail' : 'warn') : 'pass'}", "detail": "${scraped ? (scraped.h1.length === 0 ? 'NO H1 FOUND — critical SEO issue' : scraped.h1.length === 1 ? `H1: "${scraped.h1[0].slice(0, 60)}"` : `Multiple H1s found (${scraped.h1.length}) — should be exactly one`) : 'Cannot confirm without live data'}", "criticality": "critical" },
      { "label": "Image alt text", "status": "${scraped ? (scraped.imagesMissingAlt === 0 ? 'pass' : scraped.imagesMissingAlt <= 3 ? 'warn' : 'fail') : 'warn'}", "detail": "${scraped ? `${scraped.images} images total — ${scraped.imagesWithAlt} with alt text, ${scraped.imagesMissingAlt} missing` : 'Cannot confirm without live data'}", "criticality": "somewhat" },
      { "label": "Mobile viewport", "status": "${scraped ? (scraped.hasViewport ? 'pass' : 'fail') : 'pass'}", "detail": "${scraped ? (scraped.hasViewport ? 'Viewport meta tag present' : 'MISSING viewport meta tag — critical mobile SEO issue') : 'Cannot confirm'}", "criticality": "somewhat" },
      { "label": "Schema markup", "status": "${scraped ? (scraped.hasSchema ? 'pass' : 'fail') : 'fail'}", "detail": "${scraped ? (scraped.hasSchema ? `Schema present: ${scraped.schemaTypes.join(', ')}` : 'No structured data found — missing rich snippet eligibility') : 'Cannot confirm'}", "criticality": "nice" },
      { "label": "Analytics / tracking", "status": "${scraped ? ((scraped.hasGoogleAnalytics || scraped.hasGTM) ? 'pass' : 'warn') : 'warn'}", "detail": "${scraped ? ((scraped.hasGoogleAnalytics || scraped.hasGTM) ? 'Google Analytics / GTM detected' : 'No analytics tracking detected in page source') : 'Cannot confirm'}", "criticality": "important" }
    ]},
    "pageStructure": { "score": 86, "checks": [
      { "label": "Heading hierarchy", "status": "pass", "detail": "${scraped ? `H1: ${scraped.h1.length}, H2: ${scraped.h2.length}, H3: ${scraped.h3.length}` : 'Cannot confirm without live data'}", "criticality": "important" },
      { "label": "Paragraph structure", "status": "${scraped ? (scraped.paragraphCount >= 3 ? 'pass' : 'warn') : 'pass'}", "detail": "${scraped ? `${scraped.paragraphCount} paragraph elements found` : 'Cannot confirm'}", "criticality": "critical" }
    ]},
    "linkStructure": { "score": 62, "checks": [
      { "label": "Internal links", "status": "${scraped ? (scraped.internalLinks >= 10 ? 'pass' : 'warn') : 'pass'}", "detail": "${scraped ? `${scraped.internalLinks} internal links found` : 'Cannot confirm'}", "criticality": "important" },
      { "label": "External links", "status": "${scraped ? (scraped.externalLinks <= 10 ? 'pass' : 'warn') : 'pass'}", "detail": "${scraped ? `${scraped.externalLinks} external links found` : 'Cannot confirm'}", "criticality": "nice" },
      { "label": "Navigation complexity", "status": "${scraped ? (scraped.navLinksCount > 12 ? 'warn' : 'pass') : 'warn'}", "detail": "${scraped ? `${scraped.navLinksCount} navigation links — ${scraped.navLinksCount > 12 ? 'high number creates multiple exit points from page' : 'manageable number of nav options'}` : 'Cannot confirm'}", "criticality": "important" }
    ]},
    "serverTechnical": { "score": 86, "checks": [
      { "label": "HTTPS", "status": "${scraped ? (scraped.hasHttps ? 'pass' : 'fail') : 'pass'}", "detail": "${scraped ? (scraped.hasHttps ? 'Secure HTTPS connection confirmed' : 'NOT HTTPS — critical security and SEO issue') : 'Cannot confirm'}", "criticality": "critical" },
      { "label": "Response time", "status": "${scraped ? (scraped.responseTimeMs < 400 ? 'pass' : scraped.responseTimeMs < 1500 ? 'warn' : 'fail') : 'warn'}", "detail": "${scraped ? `${scraped.responseTimeMs}ms server response time (target: sub-400ms)` : 'Cannot measure without live fetch'}", "criticality": "somewhat" },
      { "label": "Page size", "status": "${scraped ? (scraped.htmlSizeBytes < 200000 ? 'pass' : scraped.htmlSizeBytes < 500000 ? 'warn' : 'fail') : 'pass'}", "detail": "${scraped ? `HTML: ${Math.round(scraped.htmlSizeBytes / 1024)}kB${scraped.htmlSizeBytes > 200000 ? ' — consider optimisation' : ''}` : 'Cannot measure'}", "criticality": "somewhat" }
    ]},
    "externalFactors": { "score": 35, "checks": [
      { "label": "Backlink profile", "status": "warn", "detail": "Cannot assess backlinks without external tool data — recommend Ahrefs or Semrush audit", "criticality": "critical" }
    ]}
  },
  "lpScoring": {
    "messageClarity": {
      "score": 16, "maxScore": ${w.messageClarity}, "percentage": 53, "assessment": "Assess based on the real H1, title, and copy found on the page",
      "subScores": [
        { "label": "Headline effectiveness", "score": 1, "max": 2, "note": "${scraped?.h1?.[0] ? `H1 is: "${scraped.h1[0].slice(0, 80)}" — assess if outcome-focused or services-list` : 'No H1 found'}" },
        { "label": "Value proposition clarity", "score": 1, "max": 2, "note": "Based on meta description and title" },
        { "label": "Copy scannability", "score": 1, "max": 2, "note": "${scraped ? `${scraped.h2.length} H2 subheadings, ${scraped.paragraphCount} paragraphs` : 'Cannot confirm'}" },
        { "label": "Outcome-focused language", "score": 1, "max": 2, "note": "Based on headline and page content analysis" },
        { "label": "Ad-to-page message match", "score": 1, "max": 2, "note": "Cannot confirm without ad data" }
      ]
    },
    "trustSocialProof": {
      "score": 5, "maxScore": ${w.trustSocialProof}, "percentage": 20, "assessment": "Assess visible trust signals",
      "subScores": [
        { "label": "Customer testimonials / reviews", "score": 0, "max": 2, "note": "Based on page content analysis" },
        { "label": "Trust badges / accreditations", "score": 0, "max": 2, "note": "Based on page content analysis" },
        { "label": "Client logos / social proof", "score": 0, "max": 2, "note": "Based on page content analysis" },
        { "label": "Contact info accessibility", "score": ${scraped ? (scraped.phoneNumbers.length > 0 || scraped.emailAddresses.length > 0 ? 2 : 0) : 1}, "max": 2, "note": "${scraped ? (scraped.phoneNumbers.length > 0 ? `Phone found: ${scraped.phoneNumbers[0]}` : scraped.emailAddresses.length > 0 ? `Email found: ${scraped.emailAddresses[0]}` : 'No phone or email found in page source') : 'Cannot confirm'}" },
        { "label": "Professional appearance", "score": 1, "max": 2, "note": "Inferred from page structure and content" }
      ]
    },
    "ctaForms": {
      "score": 7, "maxScore": ${w.ctaForms}, "percentage": 35, "assessment": "Based on real form and CTA detection",
      "subScores": [
        { "label": "CTA clarity and dominance", "score": ${scraped ? (scraped.ctaButtonCount > 0 ? 1 : 0) : 1}, "max": 2, "note": "${scraped ? `${scraped.ctaButtonCount} CTA elements detected` : 'Cannot confirm'}" },
        { "label": "Form presence and friction", "score": ${scraped ? (scraped.hasForms ? (scraped.formFields <= 5 ? 2 : 1) : 0) : 0}, "max": 2, "note": "${scraped ? (scraped.hasForms ? `${scraped.formCount} form(s) found with ~${scraped.formFields} fields — ${scraped.formFields <= 5 ? 'good — low friction' : 'consider reducing field count'}` : 'NO FORMS DETECTED on this page') : 'Cannot confirm without live fetch'}" },
        { "label": "Above-fold conversion path", "score": 1, "max": 2, "note": "Cannot determine fold position without render data" },
        { "label": "Urgency and incentive", "score": 0, "max": 2, "note": "Based on copy analysis" },
        { "label": "CTA-page intent alignment", "score": 1, "max": 2, "note": "Based on URL path and content" }
      ]
    },
    "technicalPerformance": {
      "score": 9, "maxScore": ${w.technicalPerformance}, "percentage": 60, "assessment": "Based on real response time and technical data",
      "subScores": [
        { "label": "Page load speed", "score": ${scraped ? (scraped.responseTimeMs < 400 ? 2 : scraped.responseTimeMs < 1500 ? 1 : 0) : 1}, "max": 2, "note": "${scraped ? `Server response: ${scraped.responseTimeMs}ms — ${scraped.responseTimeMs < 400 ? 'fast' : scraped.responseTimeMs < 1500 ? 'acceptable but could improve' : 'slow — investigate server performance'}` : 'Cannot measure without live data'}" },
        { "label": "Core Web Vitals", "score": 1, "max": 2, "note": "Cannot measure CWV without browser render — recommend PageSpeed Insights" },
        { "label": "Mobile responsiveness", "score": ${scraped ? (scraped.hasViewport ? 2 : 0) : 2}, "max": 2, "note": "${scraped ? (scraped.hasViewport ? 'Viewport meta tag confirmed' : 'NO viewport meta — mobile experience will be broken') : 'Cannot confirm'}" },
        { "label": "Tracking implementation", "score": ${scraped ? ((scraped.hasGoogleAnalytics || scraped.hasGTM) ? 2 : 0) : 1}, "max": 2, "note": "${scraped ? ((scraped.hasGoogleAnalytics || scraped.hasGTM) ? 'Analytics tracking confirmed in page source' : 'No analytics detected in HTML source') : 'Cannot confirm'}" },
        { "label": "Technical errors", "score": 1, "max": 2, "note": "No obvious errors detected in page fetch" }
      ]
    },
    "visualUX": {
      "score": 6, "maxScore": ${w.visualUX}, "percentage": 60, "assessment": "Based on page structure and content",
      "subScores": [
        { "label": "Visual hierarchy", "score": 1, "max": 2, "note": "Based on heading structure and CTA count" },
        { "label": "White space and readability", "score": 2, "max": 2, "note": "Based on paragraph and content structure" },
        { "label": "Image quality and relevance", "score": ${scraped ? (scraped.images > 0 ? 2 : 1) : 2}, "max": 2, "note": "${scraped ? `${scraped.images} images found on page` : 'Cannot confirm'}" },
        { "label": "Navigation simplicity", "score": ${scraped ? (scraped.navLinksCount <= 8 ? 2 : scraped.navLinksCount <= 12 ? 1 : 0) : 1}, "max": 2, "note": "${scraped ? `${scraped.navLinksCount} navigation items` : 'Cannot confirm'}" },
        { "label": "Colour and brand consistency", "score": 1, "max": 2, "note": "Cannot fully assess without visual render" }
      ]
    }
  },
  "projectedScoreAfterFixes": {
    "messageClarity": 22, "trustSocialProof": 18, "ctaForms": 14, "technicalPerformance": 12, "visualUX": 8,
    "total": 74, "grade": "B"
  }
}`
}

export function buildPromptPart2(req: AuditRequest, part1Summary: string, scraped?: ScrapedPage): string {
  const { url, label, project, competitors = [] } = req

  return `You are a senior SEO and landing page auditor completing an audit report.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}

Part 1 produced these scores:
${part1Summary}

${scraped && !scraped.error ? `Key real facts from the live page:
- Forms: ${scraped.hasForms ? `YES (${scraped.formCount} form, ~${scraped.formFields} fields)` : 'NO FORMS on this page'}
- H1: ${scraped.h1?.[0] ?? 'MISSING'}
- Words: ${scraped.wordCount}
- Contact: ${scraped.phoneNumbers.length > 0 ? scraped.phoneNumbers[0] : 'none found'}
- Schema: ${scraped.hasSchema ? scraped.schemaTypes.join(', ') : 'none'}
- Missing alt text: ${scraped.imagesMissingAlt} images` : ''}

Return ONLY valid complete JSON for the remaining sections — no markdown, no truncation:

{
  "gapAnalysis": {
    "executiveSummary": "one paragraph using the real page data — reference specific findings from the live fetch",
    "criticalIssues": [
      { "issue": "specific issue based on real data", "impact": "specific conversion impact", "fix": "specific actionable fix", "effort": "Easy" },
      { "issue": "specific issue", "impact": "specific impact", "fix": "specific fix", "effort": "Medium" },
      { "issue": "specific issue", "impact": "specific impact", "fix": "specific fix", "effort": "Easy" }
    ],
    "quickWins": [
      { "win": "specific win based on real findings", "action": "specific action", "timeEstimate": "30 minutes" },
      { "win": "specific win", "action": "specific action", "timeEstimate": "1 hour" },
      { "win": "specific win", "action": "specific action", "timeEstimate": "2 hours" }
    ],
    "positioningGap": "specific positioning analysis for this URL and market",
    "topRecommendation": "single most important action given the real page findings",
    "beforeScore": 58,
    "afterScore": 74,
    "beforeGrade": "C",
    "afterGrade": "B"
  },
  "competitorAnalysis": {
    "hookType": "Services List",
    "hookAnalysis": "specific analysis based on the real H1: ${scraped?.h1?.[0] ?? 'not found'}",
    "tableStakes": ["claim 1", "claim 2", "claim 3", "claim 4", "claim 5"],
    "whiteSpace": [
      { "opportunity": "specific opportunity", "rationale": "specific rationale", "owner": "Available to claim now" },
      { "opportunity": "specific opportunity", "rationale": "specific rationale", "owner": "Available to claim now" }
    ],
    "buyerAnxieties": [
      { "anxiety": "specific buyer anxiety", "addressed": false, "note": "based on real page content" },
      { "anxiety": "specific anxiety", "addressed": false, "note": "specific note" },
      { "anxiety": "specific anxiety", "addressed": true, "note": "specific note" },
      { "anxiety": "specific anxiety", "addressed": false, "note": "specific note" }
    ],
    "positioningStrength": "Moderate",
    "positioningNote": "specific positioning note for this business",
    "gaps": []
  },
  "priorityFixes": [
    { "rank": 1, "title": "specific fix", "problem": "specific problem from real data", "fix": "specific action", "difficulty": "Medium", "uplift": "+40-60% enquiry conversion", "timeline": "2-4 weeks" },
    { "rank": 2, "title": "specific fix", "problem": "specific problem", "fix": "specific action", "difficulty": "Easy", "uplift": "+25-35% conversion", "timeline": "1 week" },
    { "rank": 3, "title": "specific fix", "problem": "specific problem", "fix": "specific action", "difficulty": "Easy", "uplift": "+15-25% engagement", "timeline": "1-2 days" },
    { "rank": 4, "title": "specific fix", "problem": "specific problem", "fix": "specific action", "difficulty": "Easy", "uplift": "+5-10 SEO points", "timeline": "1-2 hours" },
    { "rank": 5, "title": "specific fix", "problem": "specific problem", "fix": "specific action", "difficulty": "Medium", "uplift": "+10-15 SEO points", "timeline": "2-4 hours" }
  ],
  "strengthsWeaknesses": {
    "strengths": ["specific strength from real data", "strength 2", "strength 3", "strength 4", "strength 5"],
    "weaknesses": ["specific weakness from real data", "weakness 2", "weakness 3", "weakness 4", "weakness 5"],
    "missedOpportunities": ["specific opportunity", "opportunity 2", "opportunity 3", "opportunity 4", "opportunity 5"]
  },
  "recommendations": [
    { "priority": "High", "area": "Conversion", "action": "specific action based on real findings" },
    { "priority": "High", "area": "Trust", "action": "specific action" },
    { "priority": "High", "area": "Messaging", "action": "specific action" },
    { "priority": "Medium", "area": "SEO", "action": "specific action" },
    { "priority": "Medium", "area": "Technical", "action": "specific action" },
    { "priority": "Low", "area": "SEO", "action": "specific action" }
  ]
}`
}

function buildScrapedSection(s: ScrapedPage): string {
  return `--- REAL PAGE DATA ---
Title: ${s.title || 'MISSING'}
Meta description: ${s.metaDescription || 'MISSING'}
H1: ${s.h1.join(' | ') || 'NONE FOUND — critical issue'}
H2s: ${s.h2.slice(0, 6).join(' | ') || 'none'}
Word count: ${s.wordCount}
Paragraphs: ${s.paragraphCount}
Internal links: ${s.internalLinks} | External: ${s.externalLinks} | Nav items: ${s.navLinksCount}
Images: ${s.images} (${s.imagesMissingAlt} missing alt text)
Forms: ${s.hasForms ? `YES — ${s.formCount} form(s), ~${s.formFields} input fields` : 'NO FORMS ON THIS PAGE'}
CTA elements: ${s.ctaButtonCount}
Phone: ${s.phoneNumbers.join(', ') || 'none'}
Email: ${s.emailAddresses.join(', ') || 'none'}
HTTPS: ${s.hasHttps ? 'yes' : 'NO'}
Response: ${s.responseTimeMs}ms
Canonical: ${s.canonicalUrl || 'missing'}
Language: ${s.language || 'not set'}
Viewport: ${s.hasViewport ? 'yes' : 'MISSING'}
Schema: ${s.hasSchema ? s.schemaTypes.join(', ') : 'none'}
Analytics: ${s.hasGoogleAnalytics || s.hasGTM ? 'yes' : 'not detected'}
Open Graph: ${s.hasOpenGraph ? 'yes' : 'missing'}
--- END REAL DATA ---`
}

// Keep buildPrompt export for backwards compat
export function buildPrompt(req: AuditRequest): string {
  return buildPromptPart1(req)
}
