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
  seoCategories: SeoCategories
  lpScoring: LpScoring
  projectedScoreAfterFixes: ProjectedScores
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
}

export interface Audit {
  id: string
  url: string
  label: string
  projectId: string
  scores: AuditScores
  report: AuditReport
  date: string
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
  project?: Project | null
  competitors?: Competitor[]
  existingAuditsCount?: number
  lpWeights?: LpWeights
}

export interface AuditResponse {
  success: boolean
  report?: AuditReport
  error?: string
}
