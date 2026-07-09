// Storage + types for the Ads & Analytics Report tool.
// Kept in its own file (rather than storage.ts) so this feature can't
// touch/break the existing storage module.

export interface AdsReportRecommendation {
  id: string
  title: string
  description: string
  priority: 'quick' | 'strategic'
}

export interface AdsReportKpis {
  spend: number
  prevSpend: number | null
  clicks: number
  prevClicks: number | null
  conversions: number
  ctr: number
  convRate: number
  optimizationScore: number | null
  avgCpc: number
  prevAvgCpc: number | null
  costPerConv: number
}

export interface AdsReportDaily {
  date: string
  clicks: number
  impressions: number
  conversions: number
  ctr: number
}

export interface AdsReportDeviceRow {
  device: string
  cost: number
  clicks: number
  conversions: number
}

export interface AdsReportSplitRow {
  label: string
  impressions: number
  pct: number
}

export interface AdsReportDayRow {
  day: string
  clicks: number
  impressions: number
  conversions: number
  ctr: number
}

export interface AdsReportHourRow {
  hour: string
  impressions: number
}

export interface AdsReportKeywordRow {
  keyword: string
  cost: number
  clicks: number
  ctr: number
}

export interface AdsReportSearchTermRow {
  term: string
  cost: number
  clicks: number
  impressions: number
  conversions: number
}

export interface AdsReportChannelRow {
  channel: string
  sessions: number
  pct: number
  keyEvents: number
  convRate: number | null
}

export interface AdsReportPageRow {
  page: string
  views: number
  users: number
  keyEvents: number
}

export interface AdsReportAttributionRow {
  path: string
  keyEvents: number
  avgDays: number
  touchpoints: number
}

export interface AdsReportData {
  kpis: AdsReportKpis
  daily: AdsReportDaily[]
  device: AdsReportDeviceRow[]
  gender: AdsReportSplitRow[]
  age: AdsReportSplitRow[]
  dayOfWeek: AdsReportDayRow[]
  hourOfDay: AdsReportHourRow[]
  topKeywords: AdsReportKeywordRow[]
  searchTerms: AdsReportSearchTermRow[]
  // raw candidate pool — context for the AI recommendations call, not for direct rendering
  longTailCandidates: AdsReportSearchTermRow[]
  gaChannels: AdsReportChannelRow[]
  gaPages: AdsReportPageRow[]
  attributionPaths: AdsReportAttributionRow[]
  warnings: string[]
}

export interface AdsReportKeywordSuggestion {
  term: string
  note: string
}

export interface AdsReportNegativeSuggestion {
  term: string
  reason: string
  cost: number
}

export interface AdsReport {
  id: string
  clientName: string
  periodLabel: string
  createdAt: string
  data: AdsReportData
  // AI-drafted, then reviewed/edited by BEAL before export:
  recommendations: AdsReportRecommendation[]
  approvedLongTail: AdsReportKeywordSuggestion[]
  approvedNegative: AdsReportNegativeSuggestion[]
  status: 'draft' | 'approved'
}

const KEY = 'auditiq_ads_reports'

function load(): AdsReport[] {
  if (typeof window === 'undefined') return []
  try {
    const v = localStorage.getItem(KEY)
    return v ? (JSON.parse(v) as AdsReport[]) : []
  } catch {
    return []
  }
}

function store(reports: AdsReport[]) {
  localStorage.setItem(KEY, JSON.stringify(reports))
}

export function getAdsReports(): AdsReport[] { return load() }
export function saveAdsReports(r: AdsReport[]) { store(r) }
export function addAdsReport(r: AdsReport) { store([r, ...getAdsReports()].slice(0, 49)) }
export function updateAdsReport(updated: AdsReport) {
  store(getAdsReports().map(r => (r.id === updated.id ? updated : r)))
}
export function deleteAdsReport(id: string) { store(getAdsReports().filter(r => r.id !== id)) }
export function getAdsReportById(id: string): AdsReport | undefined {
  return getAdsReports().find(r => r.id === id)
}
