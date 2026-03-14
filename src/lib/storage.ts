import { Project, Audit, LpWeights, SavedCompetitorReport } from './types'

const KEYS = {
  projects: 'auditiq_projects',
  audits: 'auditiq_audits',
  weights: 'auditiq_weights',
  competitorReports: 'auditiq_competitor_reports',
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
