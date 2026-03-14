'use client'

import { useState, useEffect, useCallback } from 'react'
import { Project, Audit, AuditReport, LpWeights, SeoCategories, LpScoring, ComparisonResult } from '@/lib/types'
import {
  getProjects, addProject, updateProject, deleteProject,
  getAudits, addAudit, deleteAudit, getAuditById, getAuditsByProject,
  getLpWeights, saveLpWeights, DEFAULT_WEIGHTS,
} from '@/lib/storage'

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

// ─── helpers ──────────────────────────────────────────────────────────────────
function sc(n: number) { return n >= 70 ? 'var(--green)' : n >= 40 ? 'var(--amber)' : 'var(--red)' }
function stag(n: number | null | undefined) { if (!n) return 'purple'; if (n >= 70) return 'green'; if (n >= 40) return 'amber'; return 'red' }
function gcol(g: string) { return g === 'A' || g === 'B' ? 'var(--green)' : g === 'C' || g === 'D' ? 'var(--amber)' : 'var(--red)' }

// ─── primitives ───────────────────────────────────────────────────────────────
function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  const m: Record<string, string> = { green: 'bg-emerald-400/10 text-emerald-400', amber: 'bg-yellow-400/10 text-yellow-400', red: 'bg-red-400/10 text-red-400', purple: 'bg-violet-400/10 text-violet-400', blue: 'bg-blue-400/10 text-blue-400' }
  return <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded ${m[color] ?? m.purple}`}>{children}</span>
}

function Btn({ children, onClick, primary = false, danger = false, sm = false, disabled = false, cls = '' }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean; danger?: boolean; sm?: boolean; disabled?: boolean; cls?: string
}) {
  const size = sm ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-2 text-[13px]'
  const style = primary ? 'bg-[var(--accent)] border-[var(--accent)] text-white hover:opacity-90'
    : danger ? 'bg-transparent border-[var(--border)] text-[var(--red)] hover:bg-red-400/10'
    : 'bg-[var(--bg3)] border-[var(--border2)] text-[var(--t1)] hover:bg-[var(--bg4)]'
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 font-medium border rounded-lg transition-all ${size} ${style} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${cls}`}>
      {children}
    </button>
  )
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
  return (
    <div className="text-center py-12 px-6" style={{ color: 'var(--t3)' }}>
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-base font-semibold mb-1" style={{ color: 'var(--t2)' }}>{title}</div>
      <div className="text-[13px]">{sub}</div>
    </div>
  )
}
function TopBar({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div><div className="text-base font-semibold">{title}</div><div className="text-[12px]" style={{ color: 'var(--t3)' }}>{sub}</div></div>
      {children}
    </div>
  )
}
function THead({ cols }: { cols: string[] }) {
  return <thead><tr>{cols.map(c => <th key={c} className="text-left text-[11px] font-semibold uppercase tracking-wider" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>{c}</th>)}</tr></thead>
}
function TD({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={mono ? 'font-mono text-[11px]' : ''} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--t2)' }}>{children}</td>
}
function Bar({ pct }: { pct: number }) {
  const col = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  return <div className="h-1.5 rounded overflow-hidden flex-1" style={{ background: 'var(--bg4)' }}><div className={`h-full rounded ${col}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
}
function Dot({ color }: { color: 'green' | 'red' | 'blue' | 'amber' }) {
  const m = { green: 'bg-emerald-400', red: 'bg-red-400', blue: 'bg-blue-400', amber: 'bg-yellow-400' }
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${m[color]}`} />
}
function Insight({ color, text }: { color: 'green' | 'red' | 'blue' | 'amber'; text: string }) {
  return <div className="flex gap-2.5 items-start text-[13px] leading-relaxed"><Dot color={color} /><span style={{ color: 'var(--t2)' }}>{text}</span></div>
}
function Spinner() {
  return <div className="w-9 h-9 rounded-full border-2 spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
}

// ─── main app ─────────────────────────────────────────────────────────────────
type View = 'dashboard' | 'projects' | 'audit' | 'competitor' | 'reports' | 'settings'
const LP_LABELS: Record<keyof LpScoring, string> = { messageClarity: 'Message & Value Clarity', trustSocialProof: 'Trust & Social Proof', ctaForms: 'CTA & Forms', technicalPerformance: 'Technical Performance', visualUX: 'Visual Design & UX' }
const SEO_LABELS: Record<keyof SeoCategories, string> = { metaInformation: 'Meta Information', pageQuality: 'Page Quality', pageStructure: 'Page Structure', linkStructure: 'Link Structure', serverTechnical: 'Server & Technical', externalFactors: 'External Factors' }
const STEPS = ['Fetching page signals', 'Analysing SEO — 6 categories', 'Scoring landing page', 'Evaluating messaging & trust', 'Competitor gap analysis', 'Classifying positioning', 'Building gap analysis']
const NAV_ICONS: Record<string, string> = {
  dashboard: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
  projects: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  audit: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  competitor: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  reports: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
}

export default function Home() {
  const [view, setView] = useState<View>('dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [weights, setWeights] = useState<LpWeights>(DEFAULT_WEIGHTS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setProjects(getProjects()); setAudits(getAudits()); setWeights(getLpWeights()); setReady(true)
  }, [])

  const refresh = useCallback(() => { setProjects(getProjects()); setAudits(getAudits()) }, [])

  if (!ready) return null

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', section: 'Main' },
    { id: 'projects', label: 'Projects', section: 'Main', badge: projects.length },
    { id: 'audit', label: 'Page Audit', section: 'Tools' },
    { id: 'competitor', label: 'Competitor Analysis', section: 'Tools' },
    { id: 'reports', label: 'Reports', section: 'Tools' },
    { id: 'settings', label: 'Settings', section: 'Config' },
  ] as const

  return (
    <div className="flex overflow-hidden" style={{ height: '100vh', background: 'var(--bg)' }}>
      <aside className="flex flex-col border-r" style={{ width: 230, minWidth: 230, background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <div className="p-5 pb-4 border-b flex items-center gap-2.5" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: 'var(--accent)' }}>A</div>
          <div><div className="text-sm font-semibold">AuditIQ</div><div className="text-[10px] font-mono" style={{ color: 'var(--t3)' }}>SEO Dashboard</div></div>
        </div>
        <nav className="p-2.5 flex-1 overflow-y-auto">
          {(['Main', 'Tools', 'Config'] as const).map(section => (
            <div key={section}>
              <div className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-2" style={{ color: 'var(--t3)' }}>{section}</div>
              {navItems.filter(n => n.section === section).map(item => (
                <button key={item.id} onClick={() => setView(item.id as View)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] mb-0.5 transition-all border"
                  style={{ color: view === item.id ? 'var(--accent2)' : 'var(--t2)', background: view === item.id ? 'rgba(124,106,247,0.1)' : 'transparent', borderColor: view === item.id ? 'rgba(124,106,247,0.3)' : 'transparent' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={NAV_ICONS[item.id]} />
                  </svg>
                  <span className="flex-1 text-left">{item.label}</span>
                  {'badge' in item && (item.badge as number) > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(124,106,247,0.15)', color: 'var(--accent2)' }}>{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {view === 'dashboard' && <Dashboard projects={projects} audits={audits} onNew={() => setView('projects')} onAudit={() => setView('audit')} />}
        {view === 'projects' && <Projects projects={projects} audits={audits} onRefresh={refresh} onAudit={() => setView('audit')} />}
        {view === 'audit' && <AuditPage projects={projects} weights={weights} onRefresh={refresh} />}
        {view === 'competitor' && <CompetitorPage projects={projects} audits={audits} />}
        {view === 'reports' && <Reports audits={audits} projects={projects} onRefresh={refresh} />}
        {view === 'settings' && <Settings weights={weights} onSave={w => { setWeights(w); saveLpWeights(w) }} />}
      </main>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ projects, audits, onNew, onAudit }: { projects: Project[]; audits: Audit[]; onNew: () => void; onAudit: () => void }) {
  const seoA = audits.map(a => a.scores.seo), lpA = audits.map(a => a.scores.lp)
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const recent = [...audits].reverse().slice(0, 10)
  return (
    <>
      <TopBar title="Dashboard" sub="Overview of all projects and audits">
        <div className="flex gap-2"><Btn onClick={onAudit}>⟳ Quick Audit</Btn><Btn primary onClick={onNew}>+ New Project</Btn></div>
      </TopBar>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[['Projects', projects.length, 'var(--accent2)'], ['Pages Audited', audits.length, 'var(--t1)'], ['Avg SEO', avg(seoA) ?? '—', 'var(--green)'], ['Avg LP Score', avg(lpA) ?? '—', 'var(--amber)']].map(([l, v, c]) => (
            <div key={String(l)} className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>{l}</div>
              <div className="text-3xl font-semibold leading-none" style={{ color: String(c) }}>{String(v)}</div>
            </div>
          ))}
        </div>
        <Card>
          <CTitle>Recent Audits</CTitle>
          {!recent.length ? <Empty icon="⊙" title="No audits yet" sub="Run your first page audit to get started." /> : (
            <table className="w-full text-[13px]">
              <THead cols={['URL', 'Label', 'Project', 'SEO', 'LP', 'Grade', 'Date']} />
              <tbody>{recent.map(a => {
                const proj = projects.find(p => p.id === a.projectId)
                return (
                  <tr key={a.id} className="hover:bg-[var(--bg3)] transition-colors">
                    <TD mono><a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>{a.url}</a></TD>
                    <TD>{a.label || '—'}</TD>
                    <TD>{proj?.name ?? <span style={{ color: 'var(--t3)' }}>Unassigned</span>}</TD>
                    <TD><Tag color={stag(a.scores.seo)}>{a.scores.seo}</Tag></TD>
                    <TD><Tag color={stag(a.scores.lp)}>{a.scores.lp}</Tag></TD>
                    <TD><Tag color="purple">{a.scores.grade}</Tag></TD>
                    <TD>{new Date(a.date).toLocaleDateString()}</TD>
                  </tr>
                )
              })}</tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  )
}

// ─── Projects ─────────────────────────────────────────────────────────────────
function Projects({ projects, audits, onRefresh, onAudit }: { projects: Project[]; audits: Audit[]; onRefresh: () => void; onAudit: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [name, setName] = useState(''), [url, setUrl] = useState('')
  const [comps, setComps] = useState([{ name: '', url: '' }, { name: '', url: '' }, { name: '', url: '' }, { name: '', url: '' }])

  const openNew = () => { setEditing(null); setName(''); setUrl(''); setComps([{ name: '', url: '' }, { name: '', url: '' }, { name: '', url: '' }, { name: '', url: '' }]); setShowForm(true) }
  const openEdit = (p: Project) => {
    setEditing(p); setName(p.name); setUrl(p.url)
    const c = [...p.competitors, { name: '', url: '' }, { name: '', url: '' }, { name: '', url: '' }, { name: '', url: '' }].slice(0, 4)
    setComps(c); setShowForm(true)
  }

  const save = () => {
    if (!name || !url) { alert('Name and URL required'); return }
    const competitors = comps.filter(c => c.name.trim())
    if (editing) {
      updateProject({ ...editing, name, url, competitors })
    } else {
      addProject({ id: uid(), name, url, competitors, created: new Date().toISOString() })
    }
    onRefresh(); setShowForm(false)
  }

  return (
    <>
      <TopBar title="Projects" sub="Manage businesses and competitors"><Btn primary onClick={openNew}>+ New Project</Btn></TopBar>
      <div className="flex-1 overflow-y-auto p-6">
        {showForm && (
          <Card>
            <CTitle>{editing ? `Edit — ${editing.name}` : 'Create New Project'}</CTitle>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><Lbl>Business Name *</Lbl><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp" /></div>
              <div><Lbl>Website URL *</Lbl><input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="https://acmecorp.com" /></div>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-widest border-b pb-2 mb-3" style={{ color: 'var(--t3)', borderColor: 'var(--border)' }}>Competitors (optional)</div>
            {comps.map((c, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 mb-2.5">
                <div><Lbl>Competitor {i + 1} Name</Lbl><input value={c.name} onChange={e => setComps(comps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></div>
                <div><Lbl>Competitor {i + 1} URL</Lbl><input value={c.url} onChange={e => setComps(comps.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} type="url" /></div>
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-4"><Btn onClick={() => setShowForm(false)}>Cancel</Btn><Btn primary onClick={save}>{editing ? 'Save Changes' : 'Save Project'}</Btn></div>
          </Card>
        )}
        {!projects.length && !showForm ? <Empty icon="◫" title="No projects yet" sub="Create your first project to start tracking competitors." /> : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {projects.map(p => {
              const pa = audits.filter(a => a.projectId === p.id)
              const avgS = pa.length ? Math.round(pa.reduce((s, a) => s + a.scores.seo, 0) / pa.length) : null
              const avgL = pa.length ? Math.round(pa.reduce((s, a) => s + a.scores.lp, 0) / pa.length) : null
              return (
                <div key={p.id} className="rounded-xl p-[18px] border hover:border-violet-400/30 transition-colors" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                  <div className="text-[15px] font-semibold mb-1">{p.name}</div>
                  <div className="font-mono text-[12px] mb-3" style={{ color: 'var(--accent2)' }}>{p.url}</div>
                  <div className="flex gap-4 mb-3">
                    {[['Pages', pa.length, 'var(--t1)'], ['SEO Avg', avgS ?? '—', 'var(--accent2)'], ['LP Avg', avgL ?? '—', 'var(--amber)'], ['Comps', p.competitors.length, 'var(--t1)']].map(([l, v, c]) => (
                      <div key={String(l)}><div className="text-[10px]" style={{ color: 'var(--t3)' }}>{l}</div><div className="text-[14px] font-semibold" style={{ color: String(c) }}>{String(v)}</div></div>
                    ))}
                  </div>
                  {p.competitors.length > 0 && (
                    <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      {p.competitors.map(c => (
                        <div key={c.name} className="flex gap-1.5 text-[12px] mb-1" style={{ color: 'var(--t2)' }}>
                          <span style={{ color: 'var(--t3)' }}>↳</span>{c.name}
                          <span className="font-mono text-[10px]" style={{ color: 'var(--accent2)' }}>{c.url}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Btn sm onClick={onAudit}>+ Audit Page</Btn>
                    <Btn sm onClick={() => openEdit(p)}>Edit</Btn>
                    <Btn sm danger cls="ml-auto" onClick={() => { if (confirm('Delete project and all its audits?')) { deleteProject(p.id); onRefresh() } }}>Delete</Btn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Audit Page ───────────────────────────────────────────────────────────────
function AuditPage({ projects, weights, onRefresh }: { projects: Project[]; weights: LpWeights; onRefresh: () => void }) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [projectId, setProjectId] = useState('')
  const [assignedTo, setAssignedTo] = useState('unassigned')
  const [loading, setLoading] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [result, setResult] = useState<AuditReport | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('gap')
  const [savedId, setSavedId] = useState('')

  const selectedProject = projects.find(p => p.id === projectId) ?? null

  const run = async () => {
    if (!url) { alert('Please enter a URL'); return }
    setLoading(true); setError(''); setResult(null); setStepIdx(0)
    const existing = projectId ? getAuditsByProject(projectId).length : 0
    const timer = setInterval(() => setStepIdx(s => s < STEPS.length - 1 ? s + 1 : s), 1600)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, label, projectId, assignedTo, project: selectedProject, competitors: selectedProject?.competitors ?? [], existingAuditsCount: existing, lpWeights: weights }),
      })
      const data = await res.json() as { success: boolean; report?: AuditReport; error?: string }
      clearInterval(timer)
      if (!data.success || !data.report) { setError(data.error ?? 'Audit failed'); return }
      const id = uid()
      addAudit({ id, url, label, projectId, assignedTo, scores: data.report.scores, report: data.report, date: new Date().toISOString() })
      setSavedId(id); onRefresh(); setResult(data.report); setTab('gap')
    } catch (e) {
      clearInterval(timer)
      setError(e instanceof Error ? e.message : 'Network error — please try again')
    } finally { setLoading(false) }
  }

  const TABS = [
    { id: 'gap', label: '⚡ Gap Analysis' },
    { id: 'seo', label: 'SEO Analysis' },
    { id: 'lp', label: 'LP Scoring' },
    { id: 'fixes', label: 'Priority Fixes' },
    { id: 'comp', label: 'Competitor' },
    { id: 'sw', label: 'Strengths & Gaps' },
    { id: 'recs', label: 'Recommendations' },
  ]

  return (
    <>
      <TopBar title="Page Audit" sub="Standalone audit tool — assign to a project or save unassigned" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CTitle>Audit any URL</CTitle>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Lbl>Page URL *</Lbl><input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="https://example.com/any-page" /></div>
            <div><Lbl>Page Label (optional)</Lbl><input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Homepage, Pricing, About" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Lbl>Assign to Project (optional)</Lbl>
              <select value={projectId} onChange={e => { setProjectId(e.target.value); setAssignedTo('unassigned') }}>
                <option value="">— Save as standalone audit —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {projectId && selectedProject && (
              <div>
                <Lbl>Assign this URL to</Lbl>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="unassigned">— Not assigned —</option>
                  <option value="business">Main Business ({selectedProject.name})</option>
                  {selectedProject.competitors.map((c, i) => <option key={i} value={`competitor${i + 1}`}>Competitor {i + 1} ({c.name})</option>)}
                </select>
              </div>
            )}
          </div>
          <Btn primary onClick={run} disabled={loading}>{loading ? '⟳ Analysing...' : '⟳ Analyse Page'}</Btn>
        </Card>

        {loading && (
          <Card>
            <div className="flex flex-col items-center py-6 gap-4">
              <Spinner />
              <div className="text-[13px]" style={{ color: 'var(--t2)' }}>{STEPS[stepIdx]}...</div>
              <div className="flex flex-col gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-[12px]" style={{ color: i <= stepIdx ? 'var(--t2)' : 'var(--t3)' }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-violet-400 pulse' : ''}`} style={i > stepIdx ? { background: 'var(--border2)' } : {}} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {error && <Card><div className="font-semibold mb-1" style={{ color: 'var(--red)' }}>Audit Failed</div><div style={{ color: 'var(--t3)' }}>{error}</div></Card>}

        {result && (
          <>
            <Card>
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <div className="text-base font-semibold mb-1">{label || result.overview.pageType}</div>
                  <div className="font-mono text-[12px] mb-2" style={{ color: 'var(--accent2)' }}>{url}</div>
                  <div className="text-[13px] leading-relaxed" style={{ color: 'var(--t3)', maxWidth: 560 }}>{result.overview.summary}</div>
                </div>
                <ExportBtn auditId={savedId} />
              </div>
              <div className="flex gap-2.5 flex-wrap">
                {([['SEO Score', result.scores.seo], ['LP Score', result.scores.lp], ['Overall', result.scores.overall]] as [string, number][]).map(([l, v]) => (
                  <div key={l} className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>{l}</div>
                    <div className="text-[22px] font-bold" style={{ color: sc(v) }}>{v}</div>
                  </div>
                ))}
                <div className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Grade</div>
                  <div className="text-[22px] font-bold" style={{ color: gcol(result.scores.grade) }}>{result.scores.grade}</div>
                </div>
                <div className="rounded-xl px-4 py-2.5 border flex-1 min-w-[200px]" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                  <div className="flex gap-4 flex-wrap">
                    {([['Type', result.overview.pageType], ['Words', result.overview.wordCount], ['Int. Links', result.overview.internalLinks], ['Response', result.overview.responseTime]] as [string, string | number][]).map(([k, v]) => (
                      <div key={k}><div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>{k}</div><div className="text-[13px] font-semibold">{v}</div></div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex gap-1 border-b mb-5 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap"
                  style={{ color: tab === t.id ? 'var(--accent2)' : 'var(--t3)', borderColor: tab === t.id ? 'var(--accent)' : 'transparent' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'gap' && <GapTab r={result} />}
            {tab === 'seo' && <SeoTab r={result} />}
            {tab === 'lp' && <LpTab r={result} />}
            {tab === 'fixes' && <FixesTab r={result} />}
            {tab === 'comp' && <CompTab r={result} />}
            {tab === 'sw' && <SwTab r={result} />}
            {tab === 'recs' && <RecsTab r={result} />}
          </>
        )}
      </div>
    </>
  )
}

function ExportBtn({ auditId }: { auditId: string }) {
  const go = async () => {
    if (!auditId) return
    const audit = getAuditById(auditId)
    if (!audit) return
    const { exportPDF } = await import('@/lib/pdfExport')
    exportPDF(audit)
  }
  return <Btn sm onClick={go}>↓ Export PDF</Btn>
}

// ─── Gap Analysis Tab ─────────────────────────────────────────────────────────
function GapTab({ r }: { r: AuditReport }) {
  const g = r.gapAnalysis
  const scoreDiff = g.afterScore - g.beforeScore
  if (!g) return <Card><div style={{ color: 'var(--t3)' }}>Gap analysis not available for this report.</div></Card>
  return (
    <div>
      {/* Header bar */}
      <Card>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Current Score</div>
            <div className="text-3xl font-bold" style={{ color: sc(g.beforeScore) }}>{g.beforeScore}<span className="text-base font-normal" style={{ color: 'var(--t3)' }}>/100</span></div>
            <Tag color={stag(g.beforeScore)}>{g.beforeGrade}</Tag>
          </div>
          <div className="text-2xl" style={{ color: 'var(--t3)' }}>→</div>
          <div>
            <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>After Fixes</div>
            <div className="text-3xl font-bold" style={{ color: 'var(--green)' }}>{g.afterScore}<span className="text-base font-normal" style={{ color: 'var(--t3)' }}>/100</span></div>
            <Tag color="green">{g.afterGrade}</Tag>
          </div>
          <div className="rounded-xl px-5 py-3 border ml-2" style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.2)' }}>
            <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--green)' }}>Potential Uplift</div>
            <div className="text-2xl font-bold" style={{ color: 'var(--green)' }}>+{scoreDiff} pts</div>
          </div>
          <div className="flex-1 min-w-[200px]" style={{ color: 'var(--t2)', fontSize: 13, lineHeight: 1.6 }}>{g.executiveSummary}</div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Critical issues */}
        <Card>
          <CTitle>🔴 Critical Issues</CTitle>
          {g.criticalIssues.map((item, i) => (
            <div key={i} className="mb-4 pb-4 border-b last:border-0 last:mb-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-2 mb-1">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--red)' }}>{i + 1}</div>
                <div className="text-[13px] font-semibold">{item.issue}</div>
              </div>
              <div className="text-[12px] mb-1.5 pl-7" style={{ color: 'var(--t3)' }}><strong style={{ color: 'var(--t2)' }}>Impact:</strong> {item.impact}</div>
              <div className="text-[12px] pl-7 mb-2" style={{ color: 'var(--t2)' }}><strong>Fix:</strong> {item.fix}</div>
              <div className="pl-7"><Tag color={item.effort === 'Easy' ? 'green' : item.effort === 'Medium' ? 'amber' : 'red'}>{item.effort} fix</Tag></div>
            </div>
          ))}
        </Card>

        {/* Quick wins */}
        <div>
          <Card>
            <CTitle>⚡ Quick Wins</CTitle>
            {g.quickWins.map((item, i) => (
              <div key={i} className="flex gap-3 mb-3 pb-3 border-b last:border-0 last:mb-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--green)' }}>{i + 1}</div>
                <div>
                  <div className="text-[13px] font-semibold mb-0.5">{item.win}</div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--t3)' }}>{item.action}</div>
                  <Tag color="blue">{item.timeEstimate}</Tag>
                </div>
              </div>
            ))}
          </Card>

          {/* Positioning gap */}
          <Card>
            <CTitle>📍 Positioning Gap</CTitle>
            <div className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--t2)' }}>{g.positioningGap}</div>
          </Card>

          {/* Top recommendation */}
          <div className="rounded-xl p-5 border" style={{ background: 'rgba(124,106,247,0.06)', borderColor: 'rgba(124,106,247,0.25)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent2)' }}>★ Top Recommendation</div>
            <div className="text-[14px] font-semibold leading-relaxed" style={{ color: 'var(--t1)' }}>{g.topRecommendation}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SEO Tab ──────────────────────────────────────────────────────────────────
function SeoTab({ r }: { r: AuditReport }) {
  const cats = Object.keys(r.seoCategories) as (keyof SeoCategories)[]
  return (
    <div>
      <Card>
        <CTitle>SEO Category Overview</CTitle>
        {cats.map(k => (
          <div key={k} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[13px] min-w-[140px]" style={{ color: 'var(--t2)' }}>{SEO_LABELS[k]}</div>
            <Bar pct={r.seoCategories[k].score} />
            <div className="min-w-[40px] text-right font-mono text-[13px] font-semibold" style={{ color: sc(r.seoCategories[k].score) }}>{r.seoCategories[k].score}%</div>
          </div>
        ))}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {cats.map(k => {
          const cat = r.seoCategories[k]
          return (
            <Card key={k}>
              <CTitle>{SEO_LABELS[k]} — {cat.score}%</CTitle>
              {cat.checks.map((c, i) => {
                const critCls = c.criticality === 'critical' ? 'bg-red-400/10 text-red-400' : c.criticality === 'important' ? 'bg-yellow-400/10 text-yellow-400' : c.criticality === 'somewhat' ? 'bg-blue-400/10 text-blue-400' : 'text-[var(--t3)]'
                const critLbl = c.criticality === 'critical' ? 'Critical' : c.criticality === 'important' ? 'Important' : c.criticality === 'somewhat' ? 'Somewhat' : 'Nice to have'
                const dotCol = c.status === 'pass' ? 'var(--green)' : c.status === 'fail' ? 'var(--red)' : 'var(--amber)'
                return (
                  <div key={i} className="flex gap-2.5 py-1.5 border-b last:border-0 items-start" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-[10px] mt-0.5 flex-shrink-0" style={{ color: dotCol }}>{c.status === 'pass' ? '●' : c.status === 'fail' ? '✕' : '—'}</span>
                    <div className="flex-1 min-w-0"><div className="text-[12px] font-semibold mb-0.5">{c.label}</div><div className="text-[11px]" style={{ color: 'var(--t3)' }}>{c.detail}</div></div>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${critCls}`}>{critLbl}</span>
                  </div>
                )
              })}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── LP Tab ───────────────────────────────────────────────────────────────────
function LpTab({ r }: { r: AuditReport }) {
  const cats = Object.keys(r.lpScoring) as (keyof LpScoring)[]
  const gc = gcol(r.scores.grade)
  return (
    <div>
      <Card>
        <CTitle>Landing Page Score Breakdown</CTitle>
        <div className="flex items-center gap-5 mb-5 flex-wrap">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-extrabold border-2" style={{ color: gc, borderColor: gc }}>{r.scores.grade}</div>
          <div><div className="text-2xl font-bold">{r.scores.lp}<span className="text-sm font-normal" style={{ color: 'var(--t3)' }}>/100</span></div></div>
          <div className="ml-4">
            <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>After fixes</div>
            <div className="text-xl font-bold" style={{ color: 'var(--green)' }}>{r.projectedScoreAfterFixes.total}<span className="text-sm font-normal" style={{ color: 'var(--t3)' }}>/100 ({r.projectedScoreAfterFixes.grade})</span></div>
          </div>
        </div>
        {cats.map(k => {
          const c = r.lpScoring[k]
          return (
            <div key={k} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[13px] min-w-[180px]" style={{ color: 'var(--t2)' }}>{LP_LABELS[k]}</div>
              <Bar pct={c.percentage} />
              <div className="font-mono text-[13px] font-semibold min-w-[60px] text-right" style={{ color: sc(c.percentage) }}>{c.score}/{c.maxScore}</div>
              <div className="text-[12px] min-w-[160px] pl-4" style={{ color: 'var(--t3)' }}>{c.assessment}</div>
            </div>
          )
        })}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {cats.map(k => {
          const c = r.lpScoring[k]
          return (
            <Card key={k}>
              <CTitle>{LP_LABELS[k]} — {c.score}/{c.maxScore}</CTitle>
              {c.subScores.map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between py-1.5 border-b text-[12px]" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--t2)' }}>{s.label}</span>
                    <span className="font-mono font-semibold" style={{ color: s.score >= 2 ? 'var(--green)' : s.score >= 1 ? 'var(--amber)' : 'var(--red)' }}>{s.score}/{s.max}</span>
                  </div>
                  <div className="text-[11px] pb-2 pl-2" style={{ color: 'var(--t3)' }}>{s.note}</div>
                </div>
              ))}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Fixes Tab ────────────────────────────────────────────────────────────────
function FixesTab({ r }: { r: AuditReport }) {
  return (
    <Card>
      <CTitle>Priority Fixes — Ranked by Impact</CTitle>
      {r.priorityFixes.map(f => (
        <div key={f.rank} className="flex gap-3.5 py-3.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: 'rgba(124,106,247,0.15)', color: 'var(--accent2)' }}>{f.rank}</div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold mb-1">{f.title}</div>
            <div className="text-[12px] mb-1" style={{ color: 'var(--t3)' }}><strong style={{ color: 'var(--t2)' }}>Problem:</strong> {f.problem}</div>
            <div className="text-[12px] mb-2" style={{ color: 'var(--t2)' }}><strong>Fix:</strong> {f.fix}</div>
            <div className="flex gap-2 flex-wrap">
              <Tag color={f.difficulty === 'Easy' ? 'green' : f.difficulty === 'Medium' ? 'amber' : 'red'}>{f.difficulty} fix</Tag>
              <Tag color="blue">Est. {f.uplift}</Tag>
              <Tag color="purple">{f.timeline}</Tag>
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}

// ─── Competitor Tab ───────────────────────────────────────────────────────────
function CompTab({ r }: { r: AuditReport }) {
  const c = r.competitorAnalysis
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card>
          <CTitle>Hook Type & Positioning</CTitle>
          <div className="mb-3"><div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--t3)' }}>Hook type</div><Tag color="amber">{c.hookType}</Tag></div>
          <div className="text-[13px] mb-3 leading-relaxed" style={{ color: 'var(--t2)' }}>{c.hookAnalysis}</div>
          <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--t3)' }}>Positioning strength</div>
          <Tag color={c.positioningStrength === 'Strong' ? 'green' : c.positioningStrength === 'Moderate' ? 'amber' : 'red'}>{c.positioningStrength}</Tag>
          <div className="text-[12px] mt-2" style={{ color: 'var(--t3)' }}>{c.positioningNote}</div>
        </Card>
        <Card>
          <CTitle>Buyer Anxieties</CTitle>
          {c.buyerAnxieties.map((b, i) => (
            <div key={i} className="flex gap-2.5 py-1.5 border-b last:border-0 items-start" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[12px] mt-0.5 flex-shrink-0" style={{ color: b.addressed ? 'var(--green)' : 'var(--red)' }}>{b.addressed ? '✓' : '✕'}</span>
              <div><div className="text-[12px] font-semibold">{b.anxiety}</div><div className="text-[11px]" style={{ color: 'var(--t3)' }}>{b.note}</div></div>
            </div>
          ))}
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CTitle>Table Stakes — Everyone Claims This</CTitle>
          <div className="flex flex-col gap-1.5">{c.tableStakes.map((t, i) => <Insight key={i} color="amber" text={t} />)}</div>
        </Card>
        <Card>
          <CTitle>White Space — Unclaimed Opportunities</CTitle>
          {c.whiteSpace.map((w, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[13px] font-semibold mb-1">{w.opportunity}</div>
              <div className="text-[12px] mb-1.5" style={{ color: 'var(--t3)' }}>{w.rationale}</div>
              <Tag color="green">{w.owner}</Tag>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─── SW Tab ───────────────────────────────────────────────────────────────────
function SwTab({ r }: { r: AuditReport }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {([
        { icon: '✓', title: 'Strengths', items: r.strengthsWeaknesses.strengths, color: 'green' as const, bg: 'rgba(52,211,153,0.1)', tc: 'var(--green)' },
        { icon: '✕', title: 'Weaknesses', items: r.strengthsWeaknesses.weaknesses, color: 'red' as const, bg: 'rgba(248,113,113,0.1)', tc: 'var(--red)' },
        { icon: '◎', title: 'Missed Opportunities', items: r.strengthsWeaknesses.missedOpportunities, color: 'blue' as const, bg: 'rgba(96,165,250,0.1)', tc: 'var(--blue)' },
      ]).map(s => (
        <Card key={s.title}>
          <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: s.bg, color: s.tc }}>{s.icon}</div><div className="text-[14px] font-semibold">{s.title}</div></div>
          <div className="flex flex-col gap-1.5">{s.items.map((item, i) => <Insight key={i} color={s.color} text={item} />)}</div>
        </Card>
      ))}
    </div>
  )
}

// ─── Recs Tab ─────────────────────────────────────────────────────────────────
function RecsTab({ r }: { r: AuditReport }) {
  return (
    <Card>
      <CTitle>Prioritised Recommendations</CTitle>
      <table className="w-full text-[13px]">
        <THead cols={['Priority', 'Area', 'Action']} />
        <tbody>{r.recommendations.map((rec, i) => (
          <tr key={i} className="hover:bg-[var(--bg3)] transition-colors">
            <TD><Tag color={rec.priority === 'High' ? 'red' : rec.priority === 'Medium' ? 'amber' : 'blue'}>{rec.priority}</Tag></TD>
            <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{rec.area}</td>
            <TD>{rec.action}</TD>
          </tr>
        ))}</tbody>
      </table>
    </Card>
  )
}

// ─── Competitor Analysis Page ─────────────────────────────────────────────────
function CompetitorPage({ projects, audits }: { projects: Project[]; audits: Audit[] }) {
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [pageInsights, setPageInsights] = useState<{ url: string; vsLeader: string; keyAdvantage: string; keyVulnerability: string; priorityAction: string }[]>([])
  const [error, setError] = useState('')

  const projectAudits = projectId ? audits.filter(a => a.projectId === projectId) : []
  const selectedProject = projects.find(p => p.id === projectId)

  const run = async () => {
    if (!projectId) { alert('Please select a project'); return }
    if (projectAudits.length < 1) { alert('This project has no audited pages yet. Run some page audits first.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/competitor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audits: projectAudits, projectName: selectedProject?.name ?? '', businessUrl: selectedProject?.url ?? '' }),
      })
      const data = await res.json() as { success: boolean; result?: ComparisonResult; pageInsights?: typeof pageInsights; error?: string }
      if (!data.success || !data.result) { setError(data.error ?? 'Analysis failed'); return }
      setResult(data.result)
      setPageInsights(data.pageInsights ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setLoading(false) }
  }

  return (
    <>
      <TopBar title="Competitor Analysis" sub="Compare all audited pages within a project side-by-side" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CTitle>Select Project to Analyse</CTitle>
          <div className="flex gap-3 items-end flex-wrap">
            <div style={{ minWidth: 280 }}>
              <Lbl>Project</Lbl>
              <select value={projectId} onChange={e => { setProjectId(e.target.value); setResult(null) }}>
                <option value="">— Select a project —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({audits.filter(a => a.projectId === p.id).length} pages audited)</option>)}
              </select>
            </div>
            <Btn primary onClick={run} disabled={loading || !projectId}>
              {loading ? '⟳ Analysing...' : '⟳ Run Competitor Analysis'}
            </Btn>
          </div>
          {projectId && projectAudits.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {projectAudits.map(a => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px]" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--t3)' }}>{a.assignedTo === 'business' ? '🏢' : '🔍'}</span>
                  <span style={{ color: 'var(--t2)' }}>{a.label || a.url}</span>
                  <Tag color={stag(a.scores.overall)}>{a.scores.overall}</Tag>
                </div>
              ))}
            </div>
          )}
          {projectId && !projectAudits.length && (
            <div className="mt-3 text-[13px]" style={{ color: 'var(--t3)' }}>No pages audited for this project yet. Go to Page Audit and audit some URLs, assigning them to this project.</div>
          )}
        </Card>

        {loading && (
          <Card>
            <div className="flex flex-col items-center py-6 gap-3">
              <Spinner />
              <div className="text-[13px]" style={{ color: 'var(--t2)' }}>Comparing {projectAudits.length} pages with AI analysis...</div>
            </div>
          </Card>
        )}

        {error && <Card><div className="font-semibold mb-1" style={{ color: 'var(--red)' }}>Analysis Failed</div><div style={{ color: 'var(--t3)' }}>{error}</div></Card>}

        {result && (
          <>
            {/* Insights summary */}
            <Card>
              <CTitle>Competitive Intelligence Summary</CTitle>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg p-4 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                  <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Market Leader</div>
                  <div className="text-[15px] font-semibold" style={{ color: 'var(--green)' }}>{result.insights.leader}</div>
                  <div className="text-[12px] font-mono" style={{ color: 'var(--t3)' }}>{result.insights.leaderUrl}</div>
                </div>
                <div className="rounded-lg p-4 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                  <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Biggest Gap</div>
                  <div className="text-[13px]" style={{ color: 'var(--t2)' }}>{result.insights.biggestGap}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Shared Weaknesses</div>
                  <div className="flex flex-col gap-1.5">{result.insights.sharedWeaknesses.map((w, i) => <Insight key={i} color="red" text={w} />)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Key Differentiators</div>
                  <div className="flex flex-col gap-1.5">{result.insights.differentiators.map((d, i) => <Insight key={i} color="green" text={d} />)}</div>
                </div>
              </div>
              <div className="rounded-xl p-4 border" style={{ background: 'rgba(124,106,247,0.06)', borderColor: 'rgba(124,106,247,0.25)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--accent2)' }}>★ Key Recommendation</div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>{result.insights.recommendation}</div>
              </div>
            </Card>

            {/* Side-by-side score cards */}
            <div className="mb-4">
              <div className="text-[13px] font-semibold mb-3" style={{ color: 'var(--t2)' }}>Score Comparison</div>
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(result.pages.length, 4)}, 1fr)` }}>
                {result.pages.map(page => {
                  const pi = pageInsights.find(p => p.url === page.url)
                  const isLeader = page.url === result.insights.leaderUrl
                  return (
                    <div key={page.id} className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: isLeader ? 'rgba(52,211,153,0.4)' : 'var(--border)' }}>
                      {isLeader && <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--green)' }}>★ Market Leader</div>}
                      <div className="text-[12px] font-semibold mb-0.5 truncate">{page.label || page.assignedTo}</div>
                      <div className="font-mono text-[10px] mb-3 truncate" style={{ color: 'var(--accent2)' }}>{page.url}</div>
                      <div className="grid grid-cols-3 gap-1 mb-3">
                        {[['SEO', page.scores.seo], ['LP', page.scores.lp], ['Overall', page.scores.overall]].map(([l, v]) => (
                          <div key={l} className="text-center rounded-lg py-1.5" style={{ background: 'var(--bg3)' }}>
                            <div className="text-[9px] uppercase" style={{ color: 'var(--t3)' }}>{l}</div>
                            <div className="text-[15px] font-bold" style={{ color: sc(v as number) }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mb-2"><Tag color="purple">{page.scores.grade}</Tag> <span className="text-[11px] ml-1" style={{ color: 'var(--t3)' }}>{page.hookType}</span></div>
                      {pi && (
                        <>
                          <div className="text-[11px] mb-1" style={{ color: 'var(--t3)' }}><strong style={{ color: 'var(--green)' }}>↑</strong> {pi.keyAdvantage}</div>
                          <div className="text-[11px] mb-2" style={{ color: 'var(--t3)' }}><strong style={{ color: 'var(--red)' }}>↓</strong> {pi.keyVulnerability}</div>
                          <div className="text-[11px] rounded-lg p-2 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--t2)' }}>
                            <strong style={{ color: 'var(--accent2)' }}>Action:</strong> {pi.priorityAction}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Detailed comparison table */}
            <Card>
              <CTitle>Detailed Score Comparison</CTitle>
              <div style={{ overflowX: 'auto' }}>
                <table className="w-full text-[13px]" style={{ minWidth: 600 }}>
                  <THead cols={['Page', 'Assigned To', 'SEO', 'LP', 'Overall', 'Grade', 'Hook', 'Positioning']} />
                  <tbody>{result.pages.map(page => (
                    <tr key={page.id} className="hover:bg-[var(--bg3)] transition-colors">
                      <TD mono><a href={page.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>{page.label || page.url}</a></TD>
                      <TD>{page.assignedTo}</TD>
                      <TD><Tag color={stag(page.scores.seo)}>{page.scores.seo}</Tag></TD>
                      <TD><Tag color={stag(page.scores.lp)}>{page.scores.lp}</Tag></TD>
                      <TD><Tag color={stag(page.scores.overall)}>{page.scores.overall}</Tag></TD>
                      <TD><Tag color="purple">{page.scores.grade}</Tag></TD>
                      <TD>{page.hookType}</TD>
                      <TD><Tag color={page.positioningStrength === 'Strong' ? 'green' : page.positioningStrength === 'Moderate' ? 'amber' : 'red'}>{page.positioningStrength}</Tag></TD>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function Reports({ audits, projects, onRefresh }: { audits: Audit[]; projects: Project[]; onRefresh: () => void }) {
  const sorted = [...audits].reverse()
  const exportOne = async (id: string) => {
    const audit = getAuditById(id)
    if (!audit) return
    const { exportPDF } = await import('@/lib/pdfExport')
    exportPDF(audit)
  }
  return (
    <>
      <TopBar title="Reports" sub={`${audits.length} saved reports`} />
      <div className="flex-1 overflow-y-auto p-6">
        {!sorted.length ? <Empty icon="≡" title="No reports yet" sub="Run page audits to generate reports." /> : (
          <Card>
            <CTitle>All Reports</CTitle>
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-[13px]">
                <THead cols={['URL', 'Label', 'Project', 'Assigned To', 'SEO', 'LP', 'Grade', 'Date', '']} />
                <tbody>{sorted.map(a => {
                  const proj = projects.find(p => p.id === a.projectId)
                  return (
                    <tr key={a.id} className="hover:bg-[var(--bg3)] transition-colors">
                      <TD mono><a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>{a.url}</a></TD>
                      <TD>{a.label || '—'}</TD>
                      <TD>{proj?.name ?? <span style={{ color: 'var(--t3)' }}>—</span>}</TD>
                      <TD>{a.assignedTo || '—'}</TD>
                      <TD><Tag color={stag(a.scores.seo)}>{a.scores.seo}</Tag></TD>
                      <TD><Tag color={stag(a.scores.lp)}>{a.scores.lp}</Tag></TD>
                      <TD><Tag color="purple">{a.scores.grade}</Tag></TD>
                      <TD>{new Date(a.date).toLocaleDateString()}</TD>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex gap-1.5">
                          <Btn sm onClick={() => exportOne(a.id)}>↓ PDF</Btn>
                          <Btn sm danger onClick={() => { deleteAudit(a.id); onRefresh() }}>Delete</Btn>
                        </div>
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function Settings({ weights, onSave }: { weights: LpWeights; onSave: (w: LpWeights) => void }) {
  const [w, setW] = useState(weights)
  const total = Object.values(w).reduce((a, b) => a + b, 0)
  const labels: Record<keyof LpWeights, string> = { messageClarity: 'Message & Value Clarity', trustSocialProof: 'Trust & Social Proof', ctaForms: 'CTA & Forms', technicalPerformance: 'Technical Performance', visualUX: 'Visual Design & UX' }
  return (
    <>
      <TopBar title="Settings" sub="Configure scoring weights and API keys" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CTitle>LP Scoring Weights</CTitle>
          <p className="text-[12px] mb-4" style={{ color: 'var(--t3)' }}>Weights should total 100. Current: <strong style={{ color: total === 100 ? 'var(--green)' : 'var(--red)' }}>{total}</strong></p>
          {(Object.keys(w) as (keyof LpWeights)[]).map(k => (
            <div key={k} className="flex items-center gap-3 mb-3">
              <span className="text-[13px] min-w-[200px]" style={{ color: 'var(--t2)' }}>{labels[k]}</span>
              <input type="range" min="0" max="40" step="1" value={w[k]} onChange={e => setW({ ...w, [k]: parseInt(e.target.value) })} style={{ flex: 1, padding: 0, height: 4 }} />
              <span className="font-mono text-[12px] min-w-[28px]" style={{ color: 'var(--accent2)' }}>{w[k]}</span>
            </div>
          ))}
          <Btn primary cls="mt-2" onClick={() => { onSave(w); alert('Weights saved.') }}>Save Weights</Btn>
        </Card>
        <Card>
          <CTitle>Environment Variables</CTitle>
          <p className="text-[12px] mb-4 leading-relaxed" style={{ color: 'var(--t3)' }}>
            Set these in <code className="font-mono rounded px-1" style={{ background: 'var(--bg3)' }}>.env.local</code> locally, or in <strong>Vercel → Settings → Environment Variables</strong>.
          </p>
          {[
            { key: 'ANTHROPIC_API_KEY', desc: 'Claude API key (recommended)', href: 'https://console.anthropic.com' },
            { key: 'OPENAI_API_KEY', desc: 'OpenAI API key (alternative)', href: 'https://platform.openai.com' },
            { key: 'AI_PROVIDER', desc: "Set to 'anthropic' or 'openai'" },
            { key: 'PAGESPEED_API_KEY', desc: 'Google PageSpeed (optional)', href: 'https://console.cloud.google.com' },
          ].map(v => (
            <div key={v.key} className="flex items-center gap-3 mb-2 flex-wrap">
              <code className="font-mono text-[11px] rounded px-1.5 py-0.5 min-w-[180px]" style={{ background: 'var(--bg4)', color: 'var(--accent2)' }}>{v.key}</code>
              <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{v.desc}</span>
              {'href' in v && <a href={v.href} target="_blank" rel="noreferrer" className="text-[12px] ml-auto" style={{ color: 'var(--accent2)' }}>→ Get key</a>}
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
