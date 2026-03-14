import { AuditRequest } from './types'

export function buildPrompt(req: AuditRequest): string {
  const { url, label, project, competitors = [], existingAuditsCount = 0, lpWeights } = req
  const w = lpWeights ?? { messageClarity: 30, trustSocialProof: 25, ctaForms: 20, technicalPerformance: 15, visualUX: 10 }

  return `You are a senior SEO and landing page auditor. Analyse this URL and return a JSON report.

URL: ${url}
Label: ${label ?? 'Not specified'}
${project ? `Business: ${project.name} (${project.url})` : ''}
${competitors.length ? `Competitors: ${competitors.map(c => `${c.name} (${c.url})`).join(', ')}` : ''}
${existingAuditsCount > 0 ? `Other audited pages in project: ${existingAuditsCount}` : ''}

You cannot fetch the live URL. Use the domain, path, TLD, and context to make an accurate professional assessment.

SCORING:

1. SEO (0-100) — 6 Seobility-style categories:
   metaInformation, pageQuality, pageStructure, linkStructure, serverTechnical, externalFactors

2. Landing Page (0-100) — weighted model:
   messageClarity (max ${w.messageClarity}), trustSocialProof (max ${w.trustSocialProof}), ctaForms (max ${w.ctaForms}), technicalPerformance (max ${w.technicalPerformance}), visualUX (max ${w.visualUX})
   Each category has 5 sub-criteria scored 0, 1, or 2.

3. Grade: A=90-100, B=70-89, C=50-69, D=30-49, F=0-29

Respond ONLY with valid JSON. No markdown, no explanation. Start with { and end with }.

{
  "overview": {
    "url": "${url}",
    "title": "inferred page title",
    "description": "inferred meta description",
    "pageType": "Homepage",
    "wordCount": 650,
    "responseTime": "1.1s",
    "fileSize": "148 kB",
    "internalLinks": 42,
    "externalLinks": 2,
    "mediaFiles": 14,
    "summary": "2-3 sentence executive summary of the page strengths and weaknesses"
  },
  "scores": { "seo": 74, "lp": 58, "overall": 66, "grade": "C" },
  "seoCategories": {
    "metaInformation": {
      "score": 92,
      "checks": [
        { "label": "Title tag", "status": "pass", "detail": "Present, within 580px limit", "criticality": "critical" },
        { "label": "Meta description", "status": "pass", "detail": "Present, within 1000px limit", "criticality": "critical" },
        { "label": "Crawlability", "status": "pass", "detail": "No access restrictions detected", "criticality": "critical" },
        { "label": "Canonical URL", "status": "pass", "detail": "Valid canonical tag expected", "criticality": "important" },
        { "label": "Language declaration", "status": "pass", "detail": "en-au defined in HTML", "criticality": "somewhat" },
        { "label": "Charset encoding", "status": "pass", "detail": "UTF-8 set correctly", "criticality": "somewhat" },
        { "label": "Favicon", "status": "pass", "detail": "Favicon linked correctly", "criticality": "nice" }
      ]
    },
    "pageQuality": {
      "score": 75,
      "checks": [
        { "label": "Word count", "status": "warn", "detail": "Estimated ~650 words — target 800+", "criticality": "critical" },
        { "label": "Title-content alignment", "status": "pass", "detail": "Title keywords reflected in body content", "criticality": "critical" },
        { "label": "Image alt text", "status": "fail", "detail": "Estimated 6-8 images missing alt attributes", "criticality": "somewhat" },
        { "label": "Mobile optimisation", "status": "pass", "detail": "Viewport meta tag present", "criticality": "somewhat" },
        { "label": "Social markup", "status": "warn", "detail": "Open Graph tags status unknown", "criticality": "nice" },
        { "label": "Schema markup", "status": "fail", "detail": "No structured data detected", "criticality": "nice" }
      ]
    },
    "pageStructure": {
      "score": 86,
      "checks": [
        { "label": "H1 heading", "status": "pass", "detail": "H1 present and adequate length", "criticality": "critical" },
        { "label": "Heading hierarchy", "status": "warn", "detail": "Verify H2/H3 structure and no duplicates", "criticality": "important" },
        { "label": "Paragraph count", "status": "pass", "detail": "Adequate paragraph count", "criticality": "critical" }
      ]
    },
    "linkStructure": {
      "score": 62,
      "checks": [
        { "label": "Internal links", "status": "pass", "detail": "~40 internal links — adequate", "criticality": "important" },
        { "label": "Anchor text diversity", "status": "fail", "detail": "Navigation creates duplicate anchor texts", "criticality": "important" },
        { "label": "External links", "status": "pass", "detail": "2-3 external links present", "criticality": "nice" },
        { "label": "Dynamic parameters", "status": "pass", "detail": "No dynamic URL parameters", "criticality": "important" }
      ]
    },
    "serverTechnical": {
      "score": 86,
      "checks": [
        { "label": "HTTPS", "status": "pass", "detail": "Secure connection in use", "criticality": "somewhat" },
        { "label": "HTTP compression", "status": "pass", "detail": "Gzip compression expected", "criticality": "important" },
        { "label": "Response time", "status": "fail", "detail": "Estimated >0.4s — target sub-0.4s", "criticality": "somewhat" },
        { "label": "www redirect", "status": "pass", "detail": "Redirect configured correctly", "criticality": "critical" }
      ]
    },
    "externalFactors": {
      "score": 35,
      "checks": [
        { "label": "Backlink profile", "status": "warn", "detail": "Cannot assess without live data — recommend Ahrefs/Semrush audit", "criticality": "critical" }
      ]
    }
  },
  "lpScoring": {
    "messageClarity": {
      "score": 16, "maxScore": ${w.messageClarity}, "percentage": 53, "assessment": "Generic — not buyer-outcome focused",
      "subScores": [
        { "label": "Headline effectiveness", "score": 1, "max": 2, "note": "Describes what the business does, not what the buyer gets" },
        { "label": "Value proposition clarity", "score": 1, "max": 2, "note": "Product-focused rather than buyer-outcome focused" },
        { "label": "Copy scannability", "score": 1, "max": 2, "note": "Sections exist but visual separation could be stronger" },
        { "label": "Outcome-focused language", "score": 1, "max": 2, "note": "No specific business outcome language for the buyer" },
        { "label": "Ad-to-page message match", "score": 1, "max": 2, "note": "Neutral — no ad data provided for comparison" }
      ]
    },
    "trustSocialProof": {
      "score": 5, "maxScore": ${w.trustSocialProof}, "percentage": 20, "assessment": "Critical gap — zero visible social proof",
      "subScores": [
        { "label": "Customer testimonials / reviews", "score": 0, "max": 2, "note": "No testimonials visible on the page" },
        { "label": "Trust badges / accreditations", "score": 0, "max": 2, "note": "No certifications or trust badges" },
        { "label": "Client logos / social proof", "score": 0, "max": 2, "note": "No partner logos or industry associations" },
        { "label": "Contact info accessibility", "score": 1, "max": 2, "note": "Contact exists but not visible in header" },
        { "label": "Professional appearance", "score": 1, "max": 2, "note": "Design appears clean and on-brand" }
      ]
    },
    "ctaForms": {
      "score": 7, "maxScore": ${w.ctaForms}, "percentage": 35, "assessment": "Weak CTA hierarchy — no embedded form",
      "subScores": [
        { "label": "CTA clarity and dominance", "score": 1, "max": 2, "note": "CTA present but lacks visual dominance" },
        { "label": "Form presence and friction", "score": 0, "max": 2, "note": "No embedded enquiry form on the page" },
        { "label": "Above-fold conversion path", "score": 1, "max": 2, "note": "CTA above fold but not prominent enough" },
        { "label": "Urgency and incentive", "score": 0, "max": 2, "note": "No urgency, scarcity, or incentive signals" },
        { "label": "CTA-page intent alignment", "score": 1, "max": 2, "note": "Partial alignment between CTA and page intent" }
      ]
    },
    "technicalPerformance": {
      "score": 9, "maxScore": ${w.technicalPerformance}, "percentage": 60, "assessment": "Mobile solid — speed needs improvement",
      "subScores": [
        { "label": "Page load speed", "score": 1, "max": 2, "note": "Estimated slow — run PageSpeed Insights to confirm" },
        { "label": "Core Web Vitals", "score": 1, "max": 2, "note": "Cannot confirm without live PageSpeed data" },
        { "label": "Mobile responsiveness", "score": 2, "max": 2, "note": "Mobile layout appears strong" },
        { "label": "Tracking implementation", "score": 1, "max": 2, "note": "Conversion tracking status unconfirmed" },
        { "label": "Technical errors", "score": 1, "max": 2, "note": "No obvious technical issues detected" }
      ]
    },
    "visualUX": {
      "score": 6, "maxScore": ${w.visualUX}, "percentage": 60, "assessment": "Good visuals — navigation creates exit points",
      "subScores": [
        { "label": "Visual hierarchy", "score": 1, "max": 2, "note": "No single dominant CTA after headline" },
        { "label": "White space and readability", "score": 2, "max": 2, "note": "Generous spacing and clean layout" },
        { "label": "Image quality and relevance", "score": 2, "max": 2, "note": "Authentic photography expected" },
        { "label": "Navigation simplicity", "score": 0, "max": 2, "note": "Full navigation creates multiple exit points" },
        { "label": "Colour and brand consistency", "score": 1, "max": 2, "note": "On-brand but CTA colour hierarchy weak" }
      ]
    }
  },
  "projectedScoreAfterFixes": {
    "messageClarity": 22, "trustSocialProof": 18, "ctaForms": 14, "technicalPerformance": 12, "visualUX": 8,
    "total": 74, "grade": "B"
  },
  "competitorAnalysis": {
    "hookType": "Services List",
    "hookAnalysis": "The page leads with what the business does rather than what the customer gets. This is the dominant pattern in most markets — switching to an outcome hook creates immediate differentiation.",
    "tableStakes": ["Professional services claim", "Results-driven language", "Free consultation offer", "Local or regional focus", "Mobile-friendly website"],
    "whiteSpace": [
      { "opportunity": "Timeline-backed proof", "rationale": "Specific result timelines are rare. Speed claims with evidence convert significantly better.", "owner": "Available to claim now" },
      { "opportunity": "Outcome + proof headline", "rationale": "Most competitors use services-list headlines. A transformation narrative is largely unclaimed.", "owner": "Available to claim now" },
      { "opportunity": "Embedded enquiry form", "rationale": "Most service pages navigate away to contact pages. An embedded form removes friction.", "owner": "Available to claim now" }
    ],
    "buyerAnxieties": [
      { "anxiety": "Will this actually work for my business?", "addressed": false, "note": "No proof visible above the fold" },
      { "anxiety": "How long until I see results?", "addressed": false, "note": "No timeline claims on the page" },
      { "anxiety": "Can I trust this business?", "addressed": false, "note": "No visible social proof or reviews" },
      { "anxiety": "What does it cost?", "addressed": false, "note": "No pricing or value framing present" }
    ],
    "positioningStrength": "Moderate",
    "positioningNote": "Competent presentation but no memorable differentiator. Risk of being selected on price rather than clear value.",
    "gaps": []
  },
  "priorityFixes": [
    { "rank": 1, "title": "Add a dominant CTA with embedded enquiry form", "problem": "No clear single conversion path — visitors face multiple equal choices.", "fix": "Make one CTA visually dominant. Embed a 4-field form: Name, Business, Enquiry type, Phone/Email.", "difficulty": "Medium", "uplift": "+40-60% enquiry conversion", "timeline": "2-4 weeks" },
    { "rank": 2, "title": "Add customer testimonials and social proof", "problem": "Zero trust signals. High-consideration buyers need peer validation.", "fix": "Add 2-3 testimonials with name, location, and a specific outcome. Add a star rating badge.", "difficulty": "Easy", "uplift": "+25-35% conversion", "timeline": "1 week" },
    { "rank": 3, "title": "Rewrite headline as outcome + proof", "problem": "Headline describes the service, not the buyer outcome.", "fix": "Lead with what the customer gets. Include a specific result or timeline.", "difficulty": "Easy", "uplift": "+15-25% engagement", "timeline": "1-2 days" },
    { "rank": 4, "title": "Fix missing image alt attributes", "problem": "Estimated 6-8 images missing alt text — impacts SEO and accessibility.", "fix": "Add descriptive alt text to every image. Include target keywords where natural.", "difficulty": "Easy", "uplift": "+5-10 SEO points", "timeline": "1-2 hours" },
    { "rank": 5, "title": "Implement structured data schema", "problem": "No schema markup — missing rich snippet eligibility.", "fix": "Add JSON-LD schema: Organisation, LocalBusiness, FAQ. Validate with Google Rich Results Test.", "difficulty": "Medium", "uplift": "+10-15 SEO points", "timeline": "2-4 hours" }
  ],
  "strengthsWeaknesses": {
    "strengths": ["Clean professional design", "HTTPS implemented correctly", "Mobile responsive layout", "Adequate internal link count", "Real photography"],
    "weaknesses": ["No social proof or testimonials", "No embedded enquiry form", "Missing image alt attributes", "Response time above 0.4s", "Duplicate anchor texts in navigation"],
    "missedOpportunities": ["Schema markup not implemented", "Outcome-focused headline unused", "Timeline-backed proof not surfaced", "Phone number not in header", "No urgency messaging"]
  },
  "recommendations": [
    { "priority": "High", "area": "Conversion", "action": "Add dominant CTA and embedded enquiry form" },
    { "priority": "High", "area": "Trust", "action": "Add customer testimonials with specific outcomes" },
    { "priority": "High", "area": "Messaging", "action": "Rewrite headline as outcome + proof hook" },
    { "priority": "Medium", "area": "SEO", "action": "Fix all missing image alt attributes" },
    { "priority": "Medium", "area": "Technical", "action": "Implement schema markup — Organisation, LocalBusiness, FAQ" },
    { "priority": "Low", "area": "SEO", "action": "Diversify internal link anchor texts" }
  ]
}`
}
