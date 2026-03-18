import { Project, Audit, LpWeights, SavedCompetitorReport } from './types'

const KEYS = {
  projects: 'auditiq_projects',
  audits: 'auditiq_audits',
  weights: 'auditiq_weights',
  competitorReports: 'auditiq_competitor_reports',
  leadSearches: 'auditiq_lead_searches',
  gbpAudits: 'auditiq_gbp_audits',
}

export const DEFAULT_WEIGHTS: LpWeights = {
  messageClarity: 30,
  trustSocialProof: 25,
  ctaForms: 20,
  technicalPerformance: 15,
  visualUX: 10,
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch { return fallback }
}

function store(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getProjects(): Project[] { return load<Project[]>(KEYS.projects, []) }
export function saveProjects(p: Project[]) { store(KEYS.projects, p) }
export function addProject(p: Project) { saveProjects([...getProjects(), p]) }
export function updateProject(updated: Project) {
  saveProjects(getProjects().map(p => p.id === updated.id ? updated : p))
}
export function deleteProject(id: string) {
  saveProjects(getProjects().filter(p => p.id !== id))
  saveAudits(getAudits().filter(a => a.projectId !== id))
}

export function getAudits(): Audit[] { return load<Audit[]>(KEYS.audits, []) }
export function saveAudits(a: Audit[]) { store(KEYS.audits, a) }
export function addAudit(a: Audit) { saveAudits([...getAudits(), a]) }
export function deleteAudit(id: string) { saveAudits(getAudits().filter(a => a.id !== id)) }
export function getAuditById(id: string) { return getAudits().find(a => a.id === id) }
export function getAuditsByProject(projectId: string) { return getAudits().filter(a => a.projectId === projectId) }

export function getLpWeights(): LpWeights { return load<LpWeights>(KEYS.weights, DEFAULT_WEIGHTS) }
export function saveLpWeights(w: LpWeights) { store(KEYS.weights, w) }

export function getCompetitorReports(): SavedCompetitorReport[] {
  return load<SavedCompetitorReport[]>(KEYS.competitorReports, [])
}
export function saveCompetitorReports(r: SavedCompetitorReport[]) { store(KEYS.competitorReports, r) }
export function addCompetitorReport(r: SavedCompetitorReport) {
  saveCompetitorReports([...getCompetitorReports(), r])
}
export function deleteCompetitorReport(id: string) {
  saveCompetitorReports(getCompetitorReports().filter(r => r.id !== id))
}
export function getCompetitorReportById(id: string) {
  return getCompetitorReports().find(r => r.id === id)
}

// Brand logo — stored as base64 data URL
const LOGO_KEY = 'auditiq_brand_logo'
export function getBrandLogo(): string { return load<string>(LOGO_KEY, '') }
export function saveBrandLogo(dataUrl: string) { store(LOGO_KEY, dataUrl) }
export function clearBrandLogo() { localStorage.removeItem(LOGO_KEY) }

export interface LeadSearch {
  id: string
  industry: string
  postcode: string
  suburb: string
  searchedAt: string
  prospects: Array<{
    businessName: string; website: string; overallScore: number;
    categories: { seo: number; ux: number; conversion: number; mobile: number; content: number; brand: number };
    criticalIssues: number; opportunityScore: number; pitchHook: string;
    issues: string[]; opportunities: string[];
  }>
}

export function getLeadSearches(): LeadSearch[] { return load<LeadSearch[]>(KEYS.leadSearches, []) }
export function saveLeadSearch(s: LeadSearch): void { store(KEYS.leadSearches, [s, ...getLeadSearches().slice(0, 49)]) }
export function deleteLeadSearch(id: string): void { store(KEYS.leadSearches, getLeadSearches().filter(s => s.id !== id)) }

export interface GbpAuditData {
  businessName: string; address: string; suburb: string; phone: string | null; website: string | null;
  category: string; secondaryCategories: string[]; rating: number | null; reviewCount: number | null;
  hasRecentReviews: boolean; unansweredReviews: number; ownerRespondsToReviews: boolean;
  hoursSet: boolean; allDaysSet: boolean; holidayHoursSet: boolean;
  hasDescription: boolean; descriptionUsesKeywords: boolean; descriptionMentionsServiceArea: boolean;
  hasLogo: boolean; hasCoverPhoto: boolean; photoCount: number | null; hasRecentPhotos: boolean;
  hasRecentPosts: boolean; lastPostDaysAgo: number | null;
  hasQandA: boolean; unansweredQuestions: number; ownerQandA: boolean;
  appointmentLink: boolean; servicesListed: boolean; serviceAreaSet: boolean; attributesSet: boolean;
  issues: string[]; wins: string[]; pitchSummary: string; notFound: boolean;
}

export interface GbpAudit {
  id: string; businessName: string; suburb: string; auditedAt: string; data: GbpAuditData
}

export function getGbpAudits(): GbpAudit[] { return load<GbpAudit[]>(KEYS.gbpAudits, []) }
export function saveGbpAudit(a: GbpAudit): void { store(KEYS.gbpAudits, [a, ...getGbpAudits().slice(0, 49)]) }
export function deleteGbpAudit(id: string): void { store(KEYS.gbpAudits, getGbpAudits().filter(a => a.id !== id)) }
export function getGbpAuditById(id: string): GbpAudit | undefined { return getGbpAudits().find(a => a.id === id) }

