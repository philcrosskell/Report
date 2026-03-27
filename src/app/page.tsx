'use client'

import { useState, useEffect, useCallback } from 'react'
import { Project, Audit, AuditReport, LpWeights, SeoCategories, LpScoring, CompetitorIntelligenceReport, SavedCompetitorReport, Competitor } from '@/lib/types'
import {
  getProjects, addProject, updateProject, deleteProject,
  getAudits, addAudit, deleteAudit, getAuditById, getAuditsByProject,
  getLpWeights, saveLpWeights, DEFAULT_WEIGHTS,
  getCompetitorReports, addCompetitorReport, deleteCompetitorReport,
  getLeadSearches, saveLeadSearch, deleteLeadSearch, LeadSearch,
  getGbpAudits, saveGbpAudit, deleteGbpAudit, GbpAudit, GbpAuditData,
  getGreatsSearches, saveGreatsSearch, deleteGreatsSearch, GreatsSearch, Great,
  getBrandLogo, saveBrandLogo, clearBrandLogo,
} from '@/lib/storage'
import { exportHTML } from '@/lib/htmlExport'

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

//  helpers 
function sc(n: number) { return n >= 70 ? 'var(--green)' : n >= 40 ? 'var(--amber)' : 'var(--red)' }
function scSeo(n: number) { return n >= 56 ? 'var(--green)' : n >= 45 ? 'var(--amber)' : 'var(--red)' }
function stag(n: number | null | undefined) { if (!n) return 'purple'; if (n >= 70) return 'green'; if (n >= 40) return 'amber'; return 'red' }
function gcol(g: string) { return g === 'A' || g === 'B' ? 'var(--green)' : g === 'C' || g === 'D' ? 'var(--amber)' : 'var(--red)' }

//  primitives 
function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  const m: Record<string, string> = { green: 'bg-emerald-400/10 text-emerald-400', amber: 'bg-yellow-400/10 text-yellow-400', red: 'bg-red-400/10 text-red-400', purple: 'bg-yellow-400/10 text-yellow-400', blue: 'bg-blue-400/10 text-blue-400', grey: 'bg-zinc-400/10 text-zinc-400' }
  return <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded ${m[color] ?? m.purple}`}>{children}</span>
}
function Btn({ children, onClick, primary = false, danger = false, sm = false, disabled = false, cls = '' }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean; sm?: boolean; disabled?: boolean; cls?: string }) {
  const size = sm ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-2 text-[13px]'
  const style = primary ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] font-bold hover:opacity-90'
    : danger ? 'bg-transparent border-[var(--border)] text-[var(--red)] hover:bg-red-400/10'
    : 'bg-[var(--bg3)] border-[var(--border2)] text-[var(--t1)] hover:bg-[var(--bg4)]'
  return <button onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1.5 font-medium border rounded-lg transition-all ${size} ${style} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${cls}`}>{children}</button>
}
function Card({ children, cls = '' }: { children: React.ReactNode; cls?: string }) {
  return <div className={`rounded-xl p-5 mb-4 border ${cls}`} style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>{children}</div>
}
function CTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] font-semibold mb-3 tracking-wide" style={{ color: 'var(--t2)' }}>{children}</div>
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--t2)' }}>{children}</label>
}
function Empty({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return <div className="text-center py-12 px-6" style={{ color: 'var(--t3)' }}><div className="text-4xl mb-3">{icon}</div><div className="text-base font-semibold mb-1" style={{ color: 'var(--t2)' }}>{title}</div><div className="text-[13px]">{sub}</div></div>
}
function TopBar({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}><div><div className="text-base font-semibold">{title}</div><div className="text-[12px]" style={{ color: 'var(--t3)' }}>{sub}</div></div>{children}</div>
}
function THead({ cols }: { cols: string[] }) {
  return <thead><tr>{cols.map(c => <th key={c} className="text-left text-[11px] font-semibold uppercase tracking-wider" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>{c}</th>)}</tr></thead>
}
function TD({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={mono ? 'font-mono text-[11px]' : ''} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--t2)' }}>{children}</td>
}
function Bar({ pct }: { pct: number }) {
  const col = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  return <div className="h-2 rounded overflow-hidden flex-1" style={{ background: 'var(--bg4)' }}><div className={`h-full rounded transition-all ${col}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
}
function Insight({ color, text }: { color: 'green' | 'red' | 'blue' | 'amber'; text: string }) {
  const m = { green: 'bg-emerald-400', red: 'bg-red-400', blue: 'bg-blue-400', amber: 'bg-yellow-400' }
  return <div className="flex gap-2.5 items-start text-[13px] leading-relaxed"><span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${m[color]}`} /><span style={{ color: 'var(--t2)' }}>{text}</span></div>
}
function Spinner() {
  return <div className="w-9 h-9 rounded-full border-2 spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
}
function SectionDivider({ label }: { label: string }) {
  return <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px" style={{ background: 'var(--border)' }} /><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>{label}</span><div className="flex-1 h-px" style={{ background: 'var(--border)' }} /></div>
}

// SmartText: any text >30 words is split into sentences rendered as separate paragraphs
// Also detects numbered lists (1. 2. 3.) and renders them as proper list items
function SmartText({ text, className = '', color = 'var(--t2)' }: { text: string; className?: string; color?: string }) {
  if (!text) return null

  // Detect numbered list pattern: "1. thing 2. thing 3. thing"
  const numberedListPattern = /(?:^|\s)(\d+)\.\s/g
  const matches = [...text.matchAll(numberedListPattern)]

  if (matches.length >= 2) {
    // Split into numbered items
    const items: string[] = []
    const positions = matches.map(m => ({ index: m.index ?? 0, num: m[1] }))
    for (let i = 0; i < positions.length; i++) {
      const start = (positions[i].index ?? 0) + positions[i].num.length + 2 // skip "N. "
      const end = i + 1 < positions.length ? positions[i + 1].index : text.length
      const item = text.slice(start, end).trim().replace(/\s+/g, ' ')
      if (item) items.push(item)
    }
    if (items.length >= 2) {
      return (
        <ol className={`flex flex-col gap-1.5 ${className}`} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start text-[13px] leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
                style={{ background: 'rgba(255,229,0,0.12)', color: 'var(--accent)', minWidth: 20 }}>
                {i + 1}
              </span>
              <span style={{ color }}>{item}</span>
            </li>
          ))}
        </ol>
      )
    }
  }

  // Detect bullet list pattern: "• thing • thing" or "- thing - thing"
  const bulletPattern = /(?:^|[\n])\s*[•\--]\s/g
  const bulletMatches = [...text.matchAll(bulletPattern)]
  if (bulletMatches.length >= 2) {
    const items = text.split(/\n?\s*[•\--]\s+/).map(s => s.trim()).filter(Boolean)
    if (items.length >= 2) {
      return (
        <ul className={`flex flex-col gap-1.5 ${className}`} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start text-[13px] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--accent)' }} />
              <span style={{ color }}>{item}</span>
            </li>
          ))}
        </ul>
      )
    }
  }

  const wordCount = text.trim().split(/\s+/).length
  if (wordCount <= 30) {
    return <p className={`text-[13px] leading-relaxed ${className}`} style={{ color }}>{text}</p>
  }
  // Protect common abbreviations before splitting on sentence boundaries
  const protected_ = text
    .replace(/\be\.g\./gi, 'EGABBR')
    .replace(/\bi\.e\./gi, 'IEABBR')
    .replace(/\betc\./gi, 'ETCABBR')
    .replace(/\bvs\./gi, 'VSABBR')
    .replace(/\bDr\./gi, 'DRABBR')
    .replace(/\bMr\./gi, 'MRABBR')
    .replace(/\bMrs\./gi, 'MRSABBR')
    .replace(/\bMs\./gi, 'MSABBR')
    .replace(/\bSt\./gi, 'STABBR')
    .replace(/\bNo\./gi, 'NOABBR')
    .replace(/\bFig\./gi, 'FIGABBR')
  const sentences = protected_.match(/[^.!?]+[.!?]+[\s]*/g) ?? [protected_]
  const cleaned = sentences
    .map(s => s
      .replace(/EGABBR/g, 'e.g.')
      .replace(/IEABBR/g, 'i.e.')
      .replace(/ETCABBR/g, 'etc.')
      .replace(/VSABBR/g, 'vs.')
      .replace(/DRABBR/g, 'Dr.')
      .replace(/MRABBR/g, 'Mr.')
      .replace(/MRSABBR/g, 'Mrs.')
      .replace(/MSABBR/g, 'Ms.')
      .replace(/STABBR/g, 'St.')
      .replace(/NOABBR/g, 'No.')
      .replace(/FIGABBR/g, 'Fig.')
      .trim()
    )
    .filter(Boolean)
  if (cleaned.length <= 1) {
    const words = text.split(/\s+/)
    const chunks: string[] = []
    for (let i = 0; i < words.length; i += 30) {
      chunks.push(words.slice(i, i + 30).join(' '))
    }
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {chunks.map((c, i) => <p key={i} className="text-[13px] leading-relaxed" style={{ color }}>{c}</p>)}
      </div>
    )
  }
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {cleaned.map((s, i) => <p key={i} className="text-[13px] leading-relaxed" style={{ color }}>{s}</p>)}
    </div>
  )
}

//  app 
type View = 'dashboard' | 'projects' | 'audit' | 'competitor' | 'reports' | 'settings' | 'lead' | 'gbp' | 'greats'
const LP_LABELS: Record<keyof LpScoring, string> = { messageClarity: 'Message & Value Clarity', trustSocialProof: 'Trust & Social Proof', ctaForms: 'CTA & Forms', technicalPerformance: 'Technical Performance', visualUX: 'Visual Design & UX' }
const SEO_LABELS: Record<keyof SeoCategories, string> = { metaInformation: 'Meta Information', pageQuality: 'Page Quality', pageStructure: 'Page Structure', linkStructure: 'Link Structure', serverTechnical: 'Server & Technical', externalFactors: 'External Factors' }
const STEPS = ['Fetching page signals', 'Analysing SEO — 6 categories', 'Scoring landing page', 'Evaluating messaging & trust', 'Competitor gap analysis', 'Classifying positioning', 'Building gap analysis']
const NAV_ICONS: Record<string, string> = {
  dashboard: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  projects: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  audit: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  competitor: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  reports: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  gbp: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  greats: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
}

export default function Home() {
  const [view, setView] = useState<View>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [compReports, setCompReports] = useState<SavedCompetitorReport[]>([])
  const [gbpAudits, setGbpAudits] = useState<GbpAudit[]>(() => getGbpAudits())
  const [weights, setWeights] = useState<LpWeights>(DEFAULT_WEIGHTS)
  const [brandLogo, setBrandLogo] = useState<string>('')
  const [ready, setReady] = useState(false)
  const [viewingAudit, setViewingAudit] = useState<Audit | null>(null)

  useEffect(() => {
    setProjects(getProjects()); setAudits(getAudits()); setWeights(getLpWeights())
    setCompReports(getCompetitorReports()); setBrandLogo(getBrandLogo()); setReady(true)
  }, [])

  const refresh = useCallback(() => {
    setProjects(getProjects()); setAudits(getAudits()); setCompReports(getCompetitorReports())
  }, [])

  if (!ready) return null

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', section: 'Main' },
    { id: 'projects', label: 'Projects', section: 'Main', badge: projects.length },
  { id: 'reports', label: 'Reports', section: 'Main', badge: audits.length + compReports.length + gbpAudits.length },
    { id: 'audit', label: 'Page Audit', section: 'Tools' },
    { id: 'gbp', label: 'GBP Audit', section: 'Tools' },
    { id: 'competitor', label: 'Competitor Analysis', section: 'Tools' },
    { id: 'lead', label: 'Lead Machine', section: 'Tools' },
    { id: 'greats', label: 'The Greats', section: 'Tools' },
    { id: 'settings', label: 'Settings', section: 'Config' },
  ] as const

  // If viewing a specific audit, show it full-screen
  if (viewingAudit) {
    return (
      <div className="flex overflow-hidden" style={{ height: '100vh', background: 'var(--bg)' }}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-3" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <Btn onClick={() => setViewingAudit(null)}>Back to Reports</Btn>
            <div className="flex-1">
              <div className="text-base font-semibold">{viewingAudit.label || viewingAudit.url}</div>
              <div className="text-[12px] font-mono" style={{ color: 'var(--accent2)' }}>{viewingAudit.url}</div>
            </div>
            <ExportAuditBtn auditId={viewingAudit.id} />
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <AuditResultView report={viewingAudit.report} url={viewingAudit.url} label={viewingAudit.label} auditId={viewingAudit.id} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden" style={{ height: '100vh', background: 'var(--bg)' }}>
      <aside className="flex flex-col border-r" style={{ width: 230, minWidth: 230, background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        {/* Yellow top bar */}
        <div style={{ height: 4, background: 'var(--accent)', flexShrink: 0 }} />
        {/* Logo area  —  BEAL wordmark */}
        <div className="px-4 py-3.5 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--border)' }}>
          <svg width="18" height="40" viewBox="0 0 28 123" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 13.8432C0 6.19778 6.19354 0 13.8336 0C21.4738 0 27.6673 6.1978 27.6673 13.8432V109.157C27.6673 116.802 21.4738 123 13.8336 123C6.19354 123 0 116.802 0 109.157V13.8432Z" fill="#FFE500"/>
          </svg>
          <div>
            <div className="text-[13px] font-bold tracking-wide leading-tight" style={{ color: 'var(--t1)' }}>Audit Machine</div>
            <div className="text-[10px] leading-tight" style={{ color: 'var(--t3)' }}>by BEAL Creative</div>
          </div>
        </div>
        <nav className="p-2.5 flex-1 overflow-y-auto">
          {(['Main', 'Tools', 'Config'] as const).map(section => (
            <div key={section}>
              <div className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-2" style={{ color: 'var(--t3)' }}>{section}</div>
              {navItems.filter(n => n.section === section).map(item => (
                <button key={item.id} onClick={() => setView(item.id as View)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] mb-0.5 transition-all"
                  style={{
                    color: view === item.id ? '#0f0f11' : 'var(--t2)',
                    background: view === item.id ? 'var(--accent)' : 'transparent',
                    fontWeight: view === item.id ? 700 : 400,
                  }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{item.id === 'lead' ? (<g><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></g>) : (<path d={NAV_ICONS[item.id]} />)}</svg>
                  <span className="flex-1 text-left">{item.label}</span>
                  {'badge' in item && (item.badge as number) > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: view === item.id ? 'rgba(0,0,0,0.2)' : 'rgba(255,229,0,0.15)',
                        color: view === item.id ? '#0f0f11' : 'var(--accent)',
                      }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {view === 'dashboard' && <Dashboard projects={projects} audits={audits} gbpAudits={gbpAudits} compReports={compReports} onNew={() => setView('projects')} onAudit={() => setView('audit')} onView={setViewingAudit} />}
        {view === 'projects' && <Projects projects={projects} audits={audits} onRefresh={refresh} onAudit={() => setView('audit')} />}
        {view === 'audit' && <AuditPage projects={projects} weights={weights} onRefresh={refresh} />}
        {view === 'competitor' && <CompetitorPage projects={projects} onRefresh={refresh} brandLogo={brandLogo} onLogoChange={(l) => { setBrandLogo(l); if (l) saveBrandLogo(l); else clearBrandLogo() }} />}
        {view === 'reports' && <Reports audits={audits} compReports={compReports} projects={projects} onRefresh={refresh} onView={setViewingAudit} />}
        {view === 'gbp' && <GbpAuditPage onSave={() => setGbpAudits(getGbpAudits())} />}
        {view === 'greats' && <TheGreatsPage projects={projects} onRefresh={refresh} />}
        {view === 'lead' && <LeadMachinePage onAudit={(url, label, industry) => { setView('audit'); setTimeout(() => { (window as { auditProspect?: (d: { name?: string; website?: string; industry?: string }) => void }).auditProspect?.({ website: url, name: label, industry }) }, 100) }} />}
          {view === 'settings' && <Settings weights={weights} onSave={w => { setWeights(w); saveLpWeights(w) }} />}
      </main>
    </div>
  )
}