// CSV parsing + compute engine for the Ads & Analytics Report tool.
// Accepts the fixed set of 13 Google Ads / GA4 export CSVs and turns
// them into the AdsReportData shape consumed by the report UI + HTML export.

import type {
  AdsReportData, AdsReportKpis, AdsReportDaily, AdsReportDeviceRow,
  AdsReportSplitRow, AdsReportDayRow, AdsReportHourRow, AdsReportKeywordRow,
  AdsReportSearchTermRow, AdsReportChannelRow, AdsReportPageRow, AdsReportAttributionRow,
} from './adsReportStorage'

export type AdsFileKind =
  | 'dailyPerformance'
  | 'campaignComparison'
  | 'campaignConversions'
  | 'optimizationScore'
  | 'device'
  | 'gender'
  | 'age'
  | 'hourOfDay'
  | 'keywords'
  | 'searchTerms'
  | 'gaTraffic'
  | 'gaPages'
  | 'gaAttribution'

export const FILE_KIND_LABELS: Record<AdsFileKind, string> = {
  dailyPerformance: 'Google Ads — Daily performance (Date, Clicks, Impressions, Conversions, CTR)',
  campaignComparison: 'Google Ads — Campaign vs. comparison period (Cost/Clicks + Comparison columns)',
  campaignConversions: 'Google Ads — Campaign conversions (Cost, Conversions, Cost/conv.)',
  optimizationScore: 'Google Ads — Optimization Score',
  device: 'Google Ads — Device performance',
  gender: 'Google Ads — Gender (Impressions)',
  age: 'Google Ads — Age range (Impressions)',
  hourOfDay: 'Google Ads — Impressions by hour of day',
  keywords: 'Google Ads — Keywords report',
  searchTerms: 'Google Ads — Search terms report',
  gaTraffic: 'GA4 — Traffic acquisition (channel group)',
  gaPages: 'GA4 — Pages and screens',
  gaAttribution: 'GA4 — Key event attribution paths',
}

export interface ParsedFile {
  kind: AdsFileKind
  fileName: string
  rows: string[][]
  header: string[]
}

// ---------- CSV tokenizer (handles quoted fields with embedded commas) ----------
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') { inQuotes = true; continue }
    if (c === ',') { row.push(field); field = ''; continue }
    if (c === '\r') { continue }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    field += c
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

// Strips GA4's leading "# ..." comment block and returns the header + data rows,
// plus the comment block text (used to identify which GA4 report this is).
function splitGa4Comment(rows: string[][]): { commentText: string; header: string[]; dataRows: string[][] } {
  let i = 0
  const commentLines: string[] = []
  while (i < rows.length && rows[i][0] && rows[i][0].startsWith('#')) {
    commentLines.push(rows[i].join(','))
    i++
  }
  // skip blank rows between comment block and header
  while (i < rows.length && (rows[i].length === 0 || rows[i].every(c => c.trim() === ''))) i++
  const header = rows[i] ?? []
  const dataRows = rows.slice(i + 1).filter(r => r.length > 0 && r.some(c => c.trim() !== ''))
  return { commentText: commentLines.join('\n'), header, dataRows }
}

export function detectFileKind(text: string): AdsFileKind | 'ignored' | null {
  const rows = parseCsvLines(text.trim())
  if (rows.length === 0) return null

  if (rows[0][0] && rows[0][0].startsWith('#')) {
    const { commentText } = splitGa4Comment(rows)
    if (/traffic acquisition/i.test(commentText)) return 'gaTraffic'
    if (/pages and screens/i.test(commentText)) return 'gaPages'
    if (/key event attribution/i.test(commentText)) return 'gaAttribution'
    return null
  }

  const header = rows[0].map(h => h.trim())
  const h0 = header[0] || ''
  const joined = header.join('|')

  if (h0 === 'Date' && joined.includes('CTR')) return 'dailyPerformance'
  if (joined.includes('Cost (Comparison)')) return 'campaignComparison'
  if (joined.includes('Cost / conv.')) return 'campaignConversions'
  if (h0 === 'Optimization Score') return 'optimizationScore'
  if (h0 === 'Device') return 'device'
  if (h0 === 'Search Keyword') return 'keywords'
  if (h0 === 'Search' && joined.includes('Impressions')) return 'searchTerms'
  if (h0 === 'Gender' && joined.includes('Age Range')) return 'ignored' // combined gender+age breakdown — not used, day/device/gender/age files cover this
  if (h0 === 'Gender' && header.length <= 3) return 'gender'
  if (h0 === 'Age Range' && header.length <= 3) return 'age'
  if (h0 === 'Start Hour' && header.length === 2) return 'hourOfDay'
  if (h0 === 'Word' && joined.includes('Top Containing Queries')) return 'ignored' // search-term word report — not used
  if (h0 === 'Day' && joined.includes('Start Hour')) return 'ignored' // day+hour matrix — not used
  if (h0 === 'Day' && header.length === 2) return 'ignored' // day-of-week impressions — derived from daily performance instead
  return null
}

export function parseFile(fileName: string, text: string): ParsedFile | null {
  const kind = detectFileKind(text)
  if (!kind || kind === 'ignored') return null
  const rows = parseCsvLines(text.trim())
  if (kind === 'gaTraffic' || kind === 'gaPages' || kind === 'gaAttribution') {
    const { header, dataRows } = splitGa4Comment(rows)
    return { kind, fileName, rows: dataRows, header }
  }
  return { kind, fileName, rows: rows.slice(1).filter(r => r.some(c => c.trim() !== '')), header: rows[0] }
}

// ---------- helpers ----------
function money(v: string | undefined): number {
  if (!v) return 0
  return parseFloat(v.replace(/[^0-9.-]/g, '')) || 0
}
function num(v: string | undefined): number {
  if (!v) return 0
  return parseFloat(v.replace(/[^0-9.-]/g, '')) || 0
}
function pct(v: string | undefined): number {
  if (!v) return 0
  return parseFloat(v.replace('%', '')) || 0
}
function col(header: string[], name: string): number {
  return header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase())
}
function cell(row: string[], idx: number): string {
  return idx >= 0 && idx < row.length ? row[idx] : ''
}
const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WEEKDAY_ABBR: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

export function computeAdsReport(files: ParsedFile[]): AdsReportData {
  const warnings: string[] = []
  const byKind = new Map<AdsFileKind, ParsedFile>()
  files.forEach(f => byKind.set(f.kind, f))

  const required: AdsFileKind[] = [
    'dailyPerformance', 'campaignComparison', 'campaignConversions', 'optimizationScore',
    'device', 'gender', 'age', 'hourOfDay', 'keywords', 'searchTerms', 'gaTraffic', 'gaPages', 'gaAttribution',
  ]
  required.forEach(k => { if (!byKind.has(k)) warnings.push(`Missing file: ${FILE_KIND_LABELS[k]}`) })

  // ---- daily performance ----
  const dailyFile = byKind.get('dailyPerformance')
  const daily: AdsReportDaily[] = []
  const dayAgg = new Map<string, { clicks: number; impressions: number; conversions: number }>()
  if (dailyFile) {
    const iDate = col(dailyFile.header, 'Date')
    const iClicks = col(dailyFile.header, 'Clicks')
    const iImpr = col(dailyFile.header, 'Impressions')
    const iConv = col(dailyFile.header, 'Conversions')
    const iCtr = col(dailyFile.header, 'CTR')
    dailyFile.rows.forEach(r => {
      const dateStr = cell(r, iDate)
      const abbr = dateStr.slice(0, 3)
      const weekday = WEEKDAY_ABBR[abbr] || ''
      const clicks = num(cell(r, iClicks))
      const impressions = num(cell(r, iImpr))
      const conversions = num(cell(r, iConv))
      daily.push({ date: dateStr, clicks, impressions, conversions, ctr: pct(cell(r, iCtr)) })
      if (weekday) {
        const existing = dayAgg.get(weekday) || { clicks: 0, impressions: 0, conversions: 0 }
        existing.clicks += clicks
        existing.impressions += impressions
        existing.conversions += conversions
        dayAgg.set(weekday, existing)
      }
    })
  }
  const dayOfWeek: AdsReportDayRow[] = WEEKDAY_ORDER
    .filter(d => dayAgg.has(d))
    .map(d => {
      const a = dayAgg.get(d)!
      return { day: d, clicks: a.clicks, impressions: a.impressions, conversions: a.conversions, ctr: a.impressions ? (a.clicks / a.impressions) * 100 : 0 }
    })

  // ---- campaign comparison (spend/clicks vs. prior period) ----
  const compFile = byKind.get('campaignComparison')
  let spend = 0, prevSpend: number | null = null, clicks = 0, prevClicks: number | null = null
  if (compFile && compFile.rows.length) {
    const r = compFile.rows[0]
    const h = compFile.header
    spend = money(cell(r, col(h, 'Cost')))
    prevSpend = money(cell(r, col(h, 'Cost (Comparison)')))
    clicks = num(cell(r, col(h, 'Clicks')))
    prevClicks = num(cell(r, col(h, 'Clicks (Comparison)')))
  } else if (dailyFile) {
    spend = 0
    clicks = daily.reduce((s, d) => s + d.clicks, 0)
  }

  // ---- campaign conversions ----
  const convFile = byKind.get('campaignConversions')
  let conversions = 0, costPerConv = 0
  if (convFile && convFile.rows.length) {
    const r = convFile.rows[0]
    const h = convFile.header
    conversions = num(cell(r, col(h, 'Conversions')))
    costPerConv = money(cell(r, col(h, 'Cost / conv.')))
    if (!spend) spend = money(cell(r, col(h, 'Cost')))
  } else {
    conversions = daily.reduce((s, d) => s + d.conversions, 0)
  }
  if (!costPerConv && conversions) costPerConv = spend / conversions

  // ---- optimization score ----
  const optFile = byKind.get('optimizationScore')
  let optimizationScore: number | null = null
  if (optFile && optFile.rows.length) {
    optimizationScore = pct(cell(optFile.rows[0], col(optFile.header, 'Optimization Score')))
  }

  const impressionsTotal = daily.reduce((s, d) => s + d.impressions, 0)
  const kpis: AdsReportKpis = {
    spend,
    prevSpend,
    clicks,
    prevClicks,
    conversions,
    ctr: impressionsTotal ? (clicks / impressionsTotal) * 100 : 0,
    convRate: clicks ? (conversions / clicks) * 100 : 0,
    optimizationScore,
    avgCpc: clicks ? spend / clicks : 0,
    prevAvgCpc: prevClicks ? (prevSpend ?? 0) / prevClicks : null,
    costPerConv,
  }

  // ---- device ----
  const deviceFile = byKind.get('device')
  const device: AdsReportDeviceRow[] = deviceFile ? deviceFile.rows.map(r => {
    const h = deviceFile.header
    return {
      device: cell(r, col(h, 'Device')),
      cost: money(cell(r, col(h, 'Cost'))),
      clicks: num(cell(r, col(h, 'Clicks'))),
      conversions: num(cell(r, col(h, 'Conversions'))),
    }
  }) : []

  // ---- gender / age ----
  function splitRows(f: ParsedFile | undefined, labelCol: string): AdsReportSplitRow[] {
    if (!f) return []
    const iLabel = col(f.header, labelCol)
    const iImpr = col(f.header, 'Impressions')
    const iPct = col(f.header, 'Percent of known total')
    return f.rows.map(r => ({
      label: cell(r, iLabel),
      impressions: num(cell(r, iImpr)),
      pct: pct(cell(r, iPct)),
    }))
  }
  const gender = splitRows(byKind.get('gender'), 'Gender')
  const age = splitRows(byKind.get('age'), 'Age Range')

  // ---- hour of day ----
  const hourFile = byKind.get('hourOfDay')
  const hourOfDay: AdsReportHourRow[] = hourFile ? hourFile.rows.map(r => ({
    hour: cell(r, col(hourFile.header, 'Start Hour')),
    impressions: num(cell(r, col(hourFile.header, 'Impressions'))),
  })) : []

  // ---- keywords (already-targeted) ----
  const kwFile = byKind.get('keywords')
  const topKeywords: AdsReportKeywordRow[] = kwFile ? kwFile.rows
    .map(r => {
      const h = kwFile.header
      return {
        keyword: cell(r, col(h, 'Search Keyword')),
        cost: money(cell(r, col(h, 'Cost'))),
        clicks: num(cell(r, col(h, 'Clicks'))),
        ctr: pct(cell(r, col(h, 'CTR'))),
      }
    })
    .filter(k => k.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10) : []
  const existingKeywordSet = new Set((kwFile ? kwFile.rows.map(r => cell(r, col(kwFile.header, 'Search Keyword')).toLowerCase().trim()) : []))

  // ---- search terms ----
  const stFile = byKind.get('searchTerms')
  const searchTerms: AdsReportSearchTermRow[] = stFile ? stFile.rows.map(r => {
    const h = stFile.header
    return {
      term: cell(r, col(h, 'Search')),
      cost: money(cell(r, col(h, 'Cost'))),
      clicks: num(cell(r, col(h, 'Clicks'))),
      impressions: num(cell(r, col(h, 'Impressions'))),
      conversions: num(cell(r, col(h, 'Conversions'))),
    }
  }).sort((a, b) => b.impressions - a.impressions) : []

  const longTailCandidates = searchTerms
    .filter(t => t.term.split(' ').length >= 3 && !existingKeywordSet.has(t.term.toLowerCase().trim()))
    .slice(0, 40)

  // ---- GA4 traffic ----
  const trafficFile = byKind.get('gaTraffic')
  const gaChannels: AdsReportChannelRow[] = trafficFile ? trafficFile.rows.map(r => {
    const h = trafficFile.header
    const iChannel = col(h, 'Session primary channel group (Default Channel Group)')
    const sessions = num(cell(r, col(h, 'Sessions')))
    const keyEvents = num(cell(r, col(h, 'Key events')))
    return {
      channel: cell(r, iChannel >= 0 ? iChannel : 0),
      sessions,
      pct: 0,
      keyEvents,
      convRate: sessions ? (keyEvents / sessions) * 100 : null,
    }
  }) : []
  const sessionsTotal = gaChannels.reduce((s, c) => s + c.sessions, 0)
  gaChannels.forEach(c => { c.pct = sessionsTotal ? (c.sessions / sessionsTotal) * 100 : 0 })
  gaChannels.sort((a, b) => b.sessions - a.sessions)

  // ---- GA4 pages ----
  const pagesFile = byKind.get('gaPages')
  const gaPages: AdsReportPageRow[] = pagesFile ? pagesFile.rows.map(r => {
    const h = pagesFile.header
    const iPage = col(h, 'Page path and screen class')
    return {
      page: cell(r, iPage >= 0 ? iPage : 0),
      views: num(cell(r, col(h, 'Views'))),
      users: num(cell(r, col(h, 'Active users'))),
      keyEvents: num(cell(r, col(h, 'Key events'))),
    }
  }).sort((a, b) => b.views - a.views).slice(0, 12) : []

  // ---- GA4 attribution paths ----
  const attrFile = byKind.get('gaAttribution')
  const attributionPaths: AdsReportAttributionRow[] = attrFile ? attrFile.rows.map(r => {
    const h = attrFile.header
    const iPath = col(h, 'Primary channel group path')
    const rawPath = cell(r, iPath >= 0 ? iPath : 0)
    const cleanPath = rawPath.replace(/[[\]"]/g, '').split(',').map(s => s.trim()).filter(Boolean).join(' → ')
    return {
      path: cleanPath || rawPath,
      keyEvents: num(cell(r, col(h, 'Key events'))),
      avgDays: num(cell(r, col(h, 'Days to key event'))),
      touchpoints: num(cell(r, col(h, 'Touchpoints to key event'))),
    }
  }).sort((a, b) => b.keyEvents - a.keyEvents) : []

  return {
    kpis, daily, device, gender, age, dayOfWeek, hourOfDay, topKeywords, searchTerms,
    longTailCandidates,
    gaChannels, gaPages, attributionPaths, warnings,
  }
}

// Plain-text digest of the computed data, fed to the AI recommendations call.
export function buildAiSummary(data: AdsReportData): string {
  const k = data.kpis
  const lines: string[] = []
  lines.push(`KPIs: spend=${k.spend.toFixed(2)} (prior=${k.prevSpend ?? 'n/a'}), clicks=${k.clicks} (prior=${k.prevClicks ?? 'n/a'}), conversions=${k.conversions}, ctr=${k.ctr.toFixed(1)}%, convRate=${k.convRate.toFixed(1)}%, avgCpc=${k.avgCpc.toFixed(2)}, costPerConv=${k.costPerConv.toFixed(2)}, optimizationScore=${k.optimizationScore ?? 'n/a'}`)
  lines.push(`Device split: ${data.device.map(d => `${d.device}=${d.clicks}clicks/${d.conversions}conv/$${d.cost.toFixed(2)}`).join(', ')}`)
  lines.push(`Day of week (clicks/ctr/conv): ${data.dayOfWeek.map(d => `${d.day}=${d.clicks}clicks/${d.ctr.toFixed(1)}%/${d.conversions}conv`).join(', ')}`)
  lines.push(`Top keywords already targeted: ${data.topKeywords.map(k2 => `"${k2.keyword}" $${k2.cost.toFixed(2)}/${k2.clicks}clicks/${k2.ctr.toFixed(1)}%CTR`).join('; ')}`)
  lines.push(`Search terms NOT yet keywords (candidates for add/exclude decisions), top 40 by impressions: ${data.longTailCandidates.map(t => `"${t.term}" impr=${t.impressions} clicks=${t.clicks} cost=$${t.cost.toFixed(2)} conv=${t.conversions}`).join('; ')}`)
  lines.push(`GA4 traffic channels: ${data.gaChannels.map(c => `${c.channel}=${c.sessions}sessions(${c.pct.toFixed(1)}%)/${c.keyEvents}keyEvents/${c.convRate !== null ? c.convRate.toFixed(1) + '%' : 'n/a'}convRate`).join(', ')}`)
  lines.push(`GA4 top pages: ${data.gaPages.slice(0, 8).map(p => `${p.page}=${p.views}views/${p.keyEvents}keyEvents`).join(', ')}`)
  if (data.attributionPaths.length) {
    lines.push(`GA4 attribution paths: ${data.attributionPaths.map(a => `${a.path}=${a.keyEvents}keyEvents/${a.avgDays.toFixed(1)}avgDays/${a.touchpoints}touchpoints`).join('; ')}`)
  }
  if (data.warnings.length) lines.push(`Note: some expected files were missing — ${data.warnings.join('; ')}`)
  return lines.join('\n')
}
