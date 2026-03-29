export interface Competitor {
  name: string
  url: string
}

export interface Project {
  id: string
  name: string
  url: string
  competitors: Competitor[]
  created: string
}

export interface AeoScore {
  total: number
  grade: string
  faqScore: number | null       // out of 10 â null if N/A page type
  faqMax: number | null         // applicable max (10 or null)
  aeoReadiness: number          // out of 30
  breakdown: {
    // FAQ sub-score (10pts total)
    faqSchemaPairs: number | null
    faqAnswerPairs: number | null
    questionHeadings: number | null
    // AEO Readiness sub-score (30pts total)
    schemaPresent: number
    schemaRelevance: number
    structuredLists: number
    metaAsAnswer: number
    entitySignals: number
    contentDepth: number
    openGraph: number
    httpsCanonical: number
  }
}
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface AuditScores {
  seo: number
  lp: number
  overall: number
  grade: Grade
}

export type CheckStatus = 'pass' | 'warn' | 'fail'
export type Criticality = 'critical' | 'important' | 'somewhat' | 'nice'

export interface SeoCheck {
  label: string
  status: CheckStatus
  detail: string
  criticality: Criticality
}

export interface SeoCategory {
  score: number
  checks: SeoCheck[]
}

export interface SeoCategories {
  metaInformation: SeoCategory
  pageQuality: SeoCategory
  pageStructure: SeoCategory
  linkStructure: SeoCategory
  serverTechnical: SeoCategory
  externalFactors: SeoCategory
}

export interface LpSubScore {
  label: string
  score: number
  max: number
  note: string
}

export interface LpCategory {
  score: number
  maxScore: number
  percentage: number
  assessment: string
  subScores: LpSubScore[]
}

export interface LpScoring {
  messageClarity: LpCategory
  trustSocialProof: LpCategory
  ctaForms: LpCategory
  technicalPerformance: LpCategory
  visualUX: LpCategory
}

export interface ProjectedScores {
  messageClarity: number
  trustSocialProof: number
  ctaForms: number
  technicalPerformance: number
  visualUX: number
  total: number
  grade: string
}

export interface WhiteSpaceItem {
  opportunity: string
  rationale: string
  owner: string
}

export interface BuyerAnxiety {
  anxiety: string
  addressed: boolean
  note: string
}

export interface CompetitorGap {
  area: string
  status: 'Ahead' | 'Behind' | 'Similar'
  detail: string
}

export interface CompetitorAnalysis {
  hookType: string
  hookAnalysis: string
  tableStakes: string[]
  whiteSpace: WhiteSpaceItem[]
  buyerAnxieties: BuyerAnxiety[]
  positioningStrength: 'Strong' | 'Moderate' | 'Weak'
  positioningNote: string
  gaps: CompetitorGap[]
}

export interface PriorityFix {
  rank: number
  title: string
  problem: string
  fix: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  uplift: string
  timeline: string
}

export interface GapAnalysis {
  executiveSummary: string
  criticalIssues: { issue: string; impact: string; fix: string; effort: 'Easy' | 'Medium' | 'Hard' }[]
  quickWins: { win: string; action: string; timeEstimate: string }[]
  positioningGap: string
  topRecommendation: string
  beforeScore: number
  afterScore: number
  beforeGrade: string
  afterGrade: string
}

export interface AuditReport {
  overview: {
    url: string
    title: string
    description: string
    pageType: string
    wordCount: number
    responseTime: string
    fileSize: string
    internalLinks: number
    externalLinks: number
    mediaFiles: number
    summary: string
  }
  scores: AuditScores
  aeoScore?: AeoScore
  seoCategories: SeoCategories
  lpScoring: LpScoring
  projectedScoreAfterFixes: ProjectedScores
  gapAnalysis: GapAnalysis
  competitorAnalysis: CompetitorAnalysis
  priorityFixes: PriorityFix[]
  strengthsWeaknesses: {
    strengths: string[]
    weaknesses: string[]
    missedOpportunities: string[]
  }
  recommendations: {
    priority: 'High' | 'Medium' | 'Low'
    area: string
    action: string
  }[]
  scraped?: import('./scraper').ScrapedPage
}

export interface Audit {
  id: string
  url: string
  label: string
  projectId: string
  assignedTo: string
  scores: AuditScores
  report: AuditReport
  date: string
  industry?: string
  location?: string
}

export interface LpWeights {
  messageClarity: number
  trustSocialProof: number
  ctaForms: number
  technicalPerformance: number
  visualUX: number
}

export interface AuditRequest {
  url: string
  label?: string
  projectId?: string
  assignedTo?: string
  project?: Project | null
  competitors?: Competitor[]
  existingAuditsCount?: number
  lpWeights?: LpWeights
  clientHtml?: string
}

export interface AuditResponse {
  success: boolean
  report?: AuditReport
  error?: string
}

// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ Competitor Intelligence Report Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
export interface CompetitorProfile {
  name: string
  url: string
  tier: 'Client' | 'Premium' | 'Mid' | 'Budget'
  positioning: string
  whatTheyDoWell: string
  hookType: string
  hookHeadline: string
  hookEffectiveness: string
  primaryAnxiety: string
  outcomePromised: string
  howTheyProve: string
  actionTrigger: string
  seoScore?: number
  seoBreakdown?: Record<string, number>
}

export interface ClaimsMatrixRow {
  claimType: string
  [key: string]: string
}

export interface HeadlineFinding {
  number: number
  title: string
  detail: string
}

export interface StrategicImplication {
  number: number
  title: string
  detail: string
}

export interface QuickWin {
  action: string
  why: string
  effort: 'Easy' | 'Medium' | 'Hard'
}

export interface CompetitorIntelligenceReport {
  businessName: string
  businessUrl: string
  date: string
  market: string
  headlineFindings: HeadlineFinding[]
  profiles: CompetitorProfile[]
  claimsMatrix: {
    claimTypes: string[]
    rows: { claimType: string; values: Record<string, string> }[]
  }
  tableStakes: string[]
  whiteSpace: { opportunity: string; rationale: string; owner: string }[]
  noiseToAvoid: string[]
  buyerAnxieties: { concern: string; addressedBy: string; ignoredBy: string }[]
  strategicImplications: StrategicImplication[]
  quickWins: QuickWin[]
  summary: string
}

export interface SavedCompetitorReport {
  id: string
  businessName: string
  businessUrl: string
  projectId?: string
  report: CompetitorIntelligenceReport
  date: string
}
