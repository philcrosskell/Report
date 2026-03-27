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
  getBrandLogo, saveBrandLogo, clearBrandLogo, getSeoChecks, addSeoCheck, deleteSeoCheck, SeoCheckResult,
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
type View = 'dashboard' | 'projects' | 'audit' | 'competitor' | 'reports' | 'settings' | 'lead' | 'gbp' | 'greats' | 'seocheck'
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
,
  seocheck: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-7-3v6m-3-3h6'}

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
    { id: 'seocheck', label: 'SEO Check', section: 'Tools' },
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


function SeoCheckSection() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(function() { return getSeoChecks(); });
  const [expandedId, setExpandedId] = useState(null);

  const SEO_MAX = { title:10, metaDescription:8, h1:8, wordCount:8, https:6, viewport:5, imageAlt:5, titleH1Alignment:5, schema:4, canonical:3, responseTime:3 };
  const SEO_LABELS = { title:'Title Tag', metaDescription:'Meta Description', h1:'H1 Tag', wordCount:'Word Count', https:'HTTPS', viewport:'Mobile Viewport', imageAlt:'Image Alt Text', titleH1Alignment:'Title / H1 Alignment', schema:'Schema Markup', canonical:'Canonical Tag', responseTime:'Response Time' };
  const KEYS = ['title','metaDescription','h1','wordCount','https','viewport','imageAlt','titleH1Alignment','schema','canonical','responseTime'];

  function sCol(v, mx) { var p = v/mx; return p===1?'#10B981':p>=0.5?'#F59E0B':'#EF4444'; }
  function tCol(s) { return s>=56?'#10B981':s>=45?'#F59E0B':'#EF4444'; }
  function getHint(key, m) {
    if (key==='title') return (m.titleLength||0)+' chars — ideal 30-65';
    if (key==='metaDescription') return (m.metaDescriptionLength||0)+' chars — ideal 80-165';
    if (key==='h1') return m.h1Count+' H1 — ideal: exactly 1';
    if (key==='wordCount') return m.wordCount+' words — 800+ for full marks';
    if (key==='https') return m.hasHttps?'HTTPS enabled':'No HTTPS — critical';
    if (key==='viewport') return m.hasViewport?'Viewport present':'Missing viewport';
    if (key==='imageAlt') return m.imagesWithAlt+'/'+m.images+' images have alt';
    if (key==='schema') return m.hasSchema?'Schema: '+(m.schemaTypes||[]).slice(0,3).join(', '):'No schema';
    if (key==='canonical') return m.hasCanonical?'Canonical present':'No canonical';
    if (key==='responseTime') return m.responseTimeMs+'ms';
    return '';
  }

  function renderBreakdown(check) {
    var rows = KEYS.map(function(key, ridx) {
      var max = SEO_MAX[key];
      var val = (check.breakdown[key] || 0);
      var col = sCol(val, max);
      return (
        <tr key={key} style={{ borderBottom:'1px solid var(--border)', background:ridx%2===1?'var(--surface)':'transparent' }}>
          <td style={{ padding:'8px 10px', color:'var(--t2)', fontWeight:500 }}>{SEO_LABELS[key]}</td>
          <td style={{ padding:'8px 10px', textAlign:'center' }}>
            <span style={{ fontWeight:700, color:col }}>{val}</span>
            <span style={{ color:'var(--t3)' }}>/{max}</span>
          </td>
          <td style={{ padding:'8px 10px', color:'var(--t3)', fontSize:12 }}>{getHint(key, check.meta)}</td>
        </tr>
      );
    });
    return (
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginTop:16 }}>
        <thead><tr style={{ borderBottom:'1px solid var(--border)' }}>
          <th style={{ textAlign:'left', padding:'6px 10px', color:'var(--t3)', fontSize:11, fontWeight:700, letterSpacing:'.06em' }}>CHECK</th>
          <th style={{ textAlign:'center', padding:'6px 10px', color:'var(--t3)', fontSize:11, fontWeight:700, letterSpacing:'.06em' }}>SCORE</th>
          <th style={{ textAlign:'left', padding:'6px 10px', color:'var(--t3)', fontSize:11, fontWeight:700, letterSpacing:'.06em' }}>DETAIL</th>
        </tr></thead>
        <tbody>
          {rows}
          <tr style={{ borderTop:'2px solid var(--border)', background:'var(--surface)' }}>
            <td style={{ padding:'10px', fontWeight:700, color:'var(--t1)' }}>Total</td>
            <td style={{ padding:'10px', textAlign:'center' }}>
              <span style={{ fontWeight:700, color:tCol(check.score) }}>{check.score}</span>
              <span style={{ color:'var(--t3)' }}>/65</span>
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    );
  }

  function renderBars(check) {
    return KEYS.map(function(key) {
      var max = SEO_MAX[key];
      var val = (check.breakdown[key] || 0);
      var col = sCol(val, max);
      var pct = Math.round((val/max)*100);
      return (
        <div key={key}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontSize:11, color:'var(--t3)' }}>{SEO_LABELS[key]}</span>
            <span style={{ fontSize:11, fontWeight:700, color:col }}>{val}/{max}</span>
          </div>
          <div style={{ height:4, background:'var(--border)', borderRadius:2 }}>
            <div style={{ height:4, borderRadius:2, background:col, width:pct+'%' }} />
          </div>
        </div>
      );
    });
  }

  async function run() {
    if (!url.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      var res = await fetch('/api/seo-check', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ url:url.trim() }) });
      var data = await res.json();
      if (!data.success) { setError(data.error||'Failed'); return; }
      var check = { id:uid(), url:data.url, date:new Date().toISOString(), score:data.score, breakdown:data.breakdown, meta:data.meta };
      setResult(check); addSeoCheck(check); setHistory(getSeoChecks()); setExpandedId(check.id);
    } catch(e) { setError('Network error'); } finally { setLoading(false); }
  }

  function del(id) {
    deleteSeoCheck(id); setHistory(getSeoChecks());
    if (expandedId===id) setExpandedId(null);
    if (result && result.id===id) setResult(null);
  }

  return (
    <>
      <TopBar title="SEO Check" sub="Instant technical SEO score — no AI, run repeatedly to track improvement." />
      <div className="flex-1 overflow-y-auto" style={{ padding:'28px 32px', maxWidth:860 }}>
        <Card style={{ marginBottom:24 }}>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <input
              style={{ flex:1, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--t1)', fontSize:14, outline:'none' }}
              placeholder="https://example.com/page"
              value={url}
              onChange={function(e) { setUrl(e.target.value); }}
              onKeyDown={function(e) { if(e.key==='Enter') run(); }}
              disabled={loading}
            />
            <Btn onClick={function() { run(); }} disabled={loading} style={{ whiteSpace:'nowrap', minWidth:120 }}>
              {loading ? 'Checking…' : 'Run Check'}
            </Btn>
          </div>
          {error && <div style={{ marginTop:10, color:'#EF4444', fontSize:13 }}>{error}</div>}
        </Card>

        {result && (
          <Card style={{ marginBottom:24 }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, color:'var(--t3)', marginBottom:4 }}>{result.url}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                <span style={{ fontSize:48, fontWeight:700, color:tCol(result.score), lineHeight:1 }}>{result.score}</span>
                <span style={{ fontSize:18, color:'var(--t3)' }}>/65</span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', marginBottom:8 }}>
              {renderBars(result)}
            </div>
            {renderBreakdown(result)}
          </Card>
        )}

        {history.length > 0 && (
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', color:'var(--t3)', marginBottom:12 }}>HISTORY</div>
            {history.map(function(h) {
              return (
                <div key={h.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, marginBottom:8, overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer' }}
                    onClick={function() { setExpandedId(expandedId===h.id?null:h.id); }}>
                    <span style={{ fontSize:20, fontWeight:700, color:tCol(h.score), minWidth:42 }}>{h.score}</span>
                    <span style={{ fontSize:10, color:'var(--t3)', minWidth:24 }}>/65</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:'var(--t1)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.url}</div>
                      <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{new Date(h.date).toLocaleString('en-AU')}</div>
                    </div>
                    <div style={{ width:80, height:6, background:'var(--border)', borderRadius:3, flexShrink:0 }}>
                      <div style={{ height:6, borderRadius:3, background:tCol(h.score), width:Math.round(h.score/65*100)+'%' }} />
                    </div>
                    <Btn sm danger onClick={function(e) { e.stopPropagation(); del(h.id); }}>Delete</Btn>
                    <span style={{ color:'var(--t3)', fontSize:12 }}>{expandedId===h.id?'▲':'▼'}</span>
                  </div>
                  {expandedId===h.id && (
                    <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border)' }}>
                      {renderBreakdown(h)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
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
        {view === 'seocheck' && <SeoCheckSection />}
          {view === 'settings' && <Settings weights={weights} onSave={w => { setWeights(w); saveLpWeights(w) }} />}
      </main>
    </div>
  )
}

//  Dashboard 

function LeadMachinePage({ onAudit }: { onAudit: (url: string, label: string, industry: string) => void }) {
  const [industry, setIndustry] = useState('')
  const [postcode, setPostcode] = useState('')
  const [suburb, setSuburb] = useState('')
  const [count, setCount] = useState('5')
  const [loading, setLoading] = useState(false)
  const [prospects, setProspects] = useState<Array<{
    businessName: string; website: string; industry: string; overallScore: number;
    categories: { seo: number; ux: number; conversion: number; mobile: number; content: number; brand: number };
    criticalIssues: number; opportunityScore: number; pitchHook: string;
    issues: string[]; opportunities: string[];
  }>>([])
  const [error, setError] = useState('')
  const [stepIdx, setStepIdx] = useState(0)
  const [savedSearches, setSavedSearches] = useState<LeadSearch[]>(() => getLeadSearches())
  const STEPS = ['Searching for local businesses...', 'Discovering websites...', 'Analysing SEO signals...', 'Checking conversion readiness...', 'Scoring branding & UX...', 'Ranking by opportunity...']

  const run = async () => {
    if (!industry || !postcode) { alert('Please enter both an industry and a postcode'); return }
    setLoading(true); setError(''); setProspects([]); setStepIdx(0)
    const timer = setInterval(() => setStepIdx(s => s < STEPS.length - 1 ? s + 1 : s), 2800)
    try {
      const resp = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry, postcode, suburb, count })
      })
      const data = await resp.json()
      clearInterval(timer)
      if (!data.success) throw new Error(data.error || 'Search failed')
      const search: LeadSearch = { id: Date.now().toString(), industry, postcode, suburb: suburb || '', searchedAt: new Date().toISOString(), prospects: data.prospects || [] }
      saveLeadSearch(search)
      setSavedSearches(getLeadSearches())
      setProspects((data.prospects || []).map((p: Record<string,unknown>) => ({ ...p, categories: (p.categories as Record<string,number>) || { seo:0, ux:0, conversion:0, mobile:0, content:0, brand:0 }, issues: (p.issues as string[]) || [], opportunities: (p.opportunities as string[]) || [] })))
    } catch(e) {
      clearInterval(timer)
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  const scoreCol = (n: number) => n < 40 ? 'var(--red)' : n < 60 ? 'var(--accent)' : 'var(--green)'

  return (
    <>
      <TopBar title="Lead Machine" sub="Search a keyword to find local prospects with weak online presence" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CTitle>Find prospects</CTitle>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Lbl>Keyword *</Lbl><input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. web design, plumber, dentist" className="inp w-full" /></div>
            <div><Lbl>Postcode *</Lbl><input value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="e.g. 3000" maxLength={4} className="inp w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><Lbl>Suburb (optional)</Lbl><input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="e.g. Albury, New South Wales" className="inp w-full" /></div>
            <div><Lbl>Results</Lbl><select value={count} onChange={e => setCount(e.target.value)} className="inp w-full"><option value="3">3 prospects</option><option value="5">5 prospects</option><option value="8">8 prospects</option></select></div>
          </div>
          <Btn primary onClick={run} disabled={loading}>{loading ? ' Searching...' : ' Find prospects'}</Btn>
        </Card>

        {savedSearches.length > 0 && prospects.length === 0 && !loading && (
          <Card>
            <CTitle>Previous searches</CTitle>
            <div className="flex flex-col gap-2 mt-2">
              {savedSearches.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{s.industry} Â· {s.postcode}{s.suburb ? ' Â· ' + s.suburb : ''}</div>
                    <div className="text-[11px]" style={{ color: 'var(--t3)' }}>{s.prospects.length} prospects Â· {new Date(s.searchedAt).toLocaleDateString('en-AU')}</div>
                  </div>
                  <Btn sm onClick={() => setProspects(s.prospects as never)}>Load</Btn>
                  <Btn sm danger onClick={() => { deleteLeadSearch(s.id); setSavedSearches(getLeadSearches()) }}></Btn>
                </div>
              ))}
            </div>
          </Card>
        )}
        {loading && (
          <Card>
            <div className="flex flex-col items-center py-6 gap-4">
              <Spinner />
              <div className="text-[13px]" style={{ color: 'var(--t2)' }}>{STEPS[stepIdx]}...</div>
              <div className="flex flex-col gap-1.5">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-2 text-[12px]" style={{ color: i <= stepIdx ? 'var(--t2)' : 'var(--t3)' }}>
                    <span className={'w-1.5 h-1.5 rounded-full ' + (i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-yellow-400' : 'bg-zinc-700')} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {error && <Card><p className="text-[13px]" style={{ color: 'var(--red)' }}>{error}</p></Card>}

        {prospects.length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            {prospects.map((p, i) => (
              <Card key={i}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                    style={{ background: i < 2 ? '#fee2e2' : '#fef3c7', color: i < 2 ? '#991b1b' : '#92400e' }}>{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>{p.businessName}</div>
                    <div className="text-[11px]" style={{ color: 'var(--t3)' }}>{p.website}</div>
                  </div>
                  <div className="text-[24px] font-bold" style={{ color: scoreCol(p.overallScore) }}>{p.overallScore}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['seo','ux','conversion','mobile','content','brand'] as const).map(k => (
                    <div key={k}>
                      <div className="text-[10px] mb-1" style={{ color: 'var(--t3)' }}>{k.charAt(0).toUpperCase()+k.slice(1)}</div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full" style={{ width: ((p.categories?.[k]) || 0) + '%', background: scoreCol((p.categories?.[k]) || 0) }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 text-[11px] mb-3">
                  <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}>{p.criticalIssues} critical issues</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,229,0,0.1)', color: 'var(--accent)' }}>opp score {p.opportunityScore}/10</span>
                </div>
                <p className="text-[12px] mb-3 pl-3" style={{ color: 'var(--t2)', borderLeft: '2px solid var(--border)' }}>{p.pitchHook}</p>
                {p.issues?.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Issues</div>
                    {p.issues.map((iss, j) => <div key={j} className="text-[12px] py-0.5" style={{ color: 'var(--t2)' }}>Fail {iss}</div>)}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Btn sm primary onClick={() => onAudit(p.website, p.businessName, p.industry || industry)}>Audit this prospect</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}


function scoreGbp(d: GbpAuditData): { overall: number; completeness: number; reviews: number; photos: number; activity: number; localSeo: number } {
  const pct = (val: boolean | null) => val ? 100 : 0
  const completeness = Math.round((
    pct(!!d.phone) + pct(!!d.website) + pct(!!d.address) + pct(d.hasDescription) +
    pct(d.descriptionUsesKeywords) + pct(d.hoursSet) + pct(d.allDaysSet) +
    pct(d.servicesListed) + pct(!!d.category) + pct(d.secondaryCategories?.length > 0)
  ) / 10)
  const reviews = Math.round((
    (d.rating ? Math.min(d.rating / 5 * 100, 100) : 0) +
    (d.reviewCount ? Math.min(d.reviewCount / 50 * 100, 100) : 0) +
    pct(d.hasRecentReviews) + pct(d.ownerRespondsToReviews) +
    (d.unansweredReviews === 0 ? 100 : d.unansweredReviews < 3 ? 50 : 0)
  ) / 5)
  const photos = Math.round((
    pct(d.hasLogo) + pct(d.hasCoverPhoto) + pct(d.hasRecentPhotos) +
    (d.photoCount ? Math.min(d.photoCount / 20 * 100, 100) : 0)
  ) / 4)
  const activity = Math.round((
    pct(d.hasRecentPosts) +
    (d.lastPostDaysAgo !== null ? (d.lastPostDaysAgo < 14 ? 100 : d.lastPostDaysAgo < 30 ? 75 : d.lastPostDaysAgo < 60 ? 40 : d.lastPostDaysAgo < 90 ? 20 : 0) : 0)
  ) / 2)
  const localSeo = Math.round((
    pct(d.serviceAreaSet) + pct(d.attributesSet) + pct(d.appointmentLink) +
    pct(d.holidayHoursSet)
  ) / 4)
  const overall = Math.round((completeness * 0.3 + reviews * 0.3 + photos * 0.15 + activity * 0.15 + localSeo * 0.1))
  return { overall, completeness, reviews, photos, activity, localSeo }
}

function GbpScoreBar({ label, score }: { label: string; score: number }) {
  const col = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--accent)' : 'var(--red)'
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="text-[12px]" style={{ color: 'var(--t2)' }}>{label}</span>
        <span className="text-[12px] font-semibold" style={{ color: col }}>{score}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: score + '%', background: col }} />
      </div>
    </div>
  )
}

function GbpCheckItem({ label, pass, warn }: { label: string; pass: boolean | null; warn?: boolean }) {
  const col = pass === null ? 'var(--t3)' : pass ? 'var(--green)' : warn ? 'var(--accent)' : 'var(--red)'
  const icon = pass === null ? '-' : pass ? '' : 'Fail'
  return (
    <div className="flex items-start gap-2 py-1.5 border-b last:border-0 text-[12px]" style={{ borderColor: 'var(--border)' }}>
      <span className="font-bold flex-shrink-0 mt-0.5" style={{ color: col }}>{icon}</span>
      <span style={{ color: 'var(--t2)' }}>{label}</span>
    </div>
  )
}

function GbpReport({ audit, onDelete }: { audit: GbpAudit; onDelete: () => void }) {
  const d = audit.data
  const scores = scoreGbp(d)
  const [copied, setCopied] = useState(false)

  const copyPitch = () => {
    navigator.clipboard.writeText(d.pitchSummary || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[22px] font-semibold" style={{ color: 'var(--t1)' }}>{d.businessName}</div>
          <div className="text-[13px]" style={{ color: 'var(--t3)' }}>{d.address}</div>
          <div className="flex gap-3 mt-2 text-[12px]" style={{ color: 'var(--t3)' }}>
            {d.rating && <span> {d.rating} ({d.reviewCount} reviews)</span>}
            {d.category && <span>{d.category}</span>}
            {d.phone && <span>{d.phone}</span>}
          </div>
        </div>
        <div className="text-center flex-shrink-0">
          <div className="text-[42px] font-bold leading-none" style={{ color: scores.overall >= 70 ? 'var(--green)' : scores.overall >= 40 ? 'var(--accent)' : 'var(--red)' }}>{scores.overall}</div>
          <div className="text-[11px]" style={{ color: 'var(--t3)' }}>GBP score</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CTitle>Score breakdown</CTitle>
          <GbpScoreBar label="Profile completeness" score={scores.completeness} />
          <GbpScoreBar label="Reviews" score={scores.reviews} />
          <GbpScoreBar label="Photos" score={scores.photos} />
          <GbpScoreBar label="Posts & activity" score={scores.activity} />
          <GbpScoreBar label="Local SEO signals" score={scores.localSeo} />
        </Card>
        <Card>
          <CTitle>Issues to fix</CTitle>
          {d.issues?.length ? d.issues.map((iss, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b last:border-0 text-[12px]" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--red)' }} className="flex-shrink-0 mt-0.5">Fail</span>
              <span style={{ color: 'var(--t2)' }}>{iss}</span>
            </div>
          )) : <p className="text-[12px]" style={{ color: 'var(--t3)' }}>No major issues found</p>}
          {d.wins?.length > 0 && <>
            <div className="text-[10px] font-semibold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--t3)' }}>What they do well</div>
            {d.wins.map((w, i) => (
              <div key={i} className="flex items-start gap-2 py-1 text-[12px]">
                <span style={{ color: 'var(--green)' }} className="flex-shrink-0"></span>
                <span style={{ color: 'var(--t2)' }}>{w}</span>
              </div>
            ))}
          </>}
        </Card>
      </div>

      <Card>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Profile completeness</div>
            <GbpCheckItem label="Phone number" pass={!!d.phone} />
            <GbpCheckItem label="Website linked" pass={!!d.website} />
            <GbpCheckItem label="Description added" pass={d.hasDescription} />
            <GbpCheckItem label="Description uses keywords" pass={d.descriptionUsesKeywords} warn />
            <GbpCheckItem label="Mentions service area" pass={d.descriptionMentionsServiceArea} warn />
            <GbpCheckItem label="Hours set (all days)" pass={d.allDaysSet} />
            <GbpCheckItem label="Holiday hours set" pass={d.holidayHoursSet} warn />
            <GbpCheckItem label="Services listed" pass={d.servicesListed} warn />
            <GbpCheckItem label="Appointment link" pass={d.appointmentLink} warn />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Reviews & photos</div>
            <GbpCheckItem label="Has reviews" pass={(d.reviewCount || 0) > 0} />
            <GbpCheckItem label="Recent reviews (90 days)" pass={d.hasRecentReviews} warn />
            <GbpCheckItem label="Owner responds to reviews" pass={d.ownerRespondsToReviews} />
            <GbpCheckItem label={d.unansweredReviews === 0 ? 'No unanswered reviews' : `${d.unansweredReviews} unanswered reviews`} pass={d.unansweredReviews === 0} />
            <GbpCheckItem label="Logo uploaded" pass={d.hasLogo} />
            <GbpCheckItem label="Cover photo uploaded" pass={d.hasCoverPhoto} />
            <GbpCheckItem label="10+ photos" pass={(d.photoCount || 0) >= 10} warn />
            <GbpCheckItem label="Recent photos added" pass={d.hasRecentPhotos} warn />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Activity & local SEO</div>
            <GbpCheckItem label={d.lastPostDaysAgo !== null ? `Last post ${d.lastPostDaysAgo} days ago` : 'No posts found'} pass={d.hasRecentPosts} warn />
            <GbpCheckItem label="Service area set" pass={d.serviceAreaSet} warn />
            <GbpCheckItem label="Attributes set" pass={d.attributesSet} warn />
          </div>
        </div>
      </Card>

      <div className="flex gap-6 px-1 mb-2 text-[11px]" style={{ color: 'var(--t3)' }}>
        <span className="flex items-center gap-1.5"><span style={{ color: 'var(--green)', fontWeight: 700 }}></span> Pass  —  in good shape</span>
        <span className="flex items-center gap-1.5"><span style={{ color: 'var(--red)', fontWeight: 700 }}>Fail</span> Fail  —  needs fixing</span>
        <span className="flex items-center gap-1.5"><span style={{ color: 'var(--accent)', fontWeight: 700 }}>Fail</span> Warning  —  could be better</span>
        <span className="flex items-center gap-1.5"><span style={{ fontWeight: 700 }}>-</span> Unknown  —  not publicly visible</span>
      </div>

      {d.pitchSummary && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CTitle>Pitch summary</CTitle>
              <p className="text-[13px] leading-relaxed mt-1" style={{ color: 'var(--t2)' }}>{d.pitchSummary}</p>
            </div>
            <Btn sm onClick={copyPitch} cls="flex-shrink-0">{copied ? ' Copied' : 'Copy'}</Btn>
          </div>
        </Card>
      )}

      <div className="mt-4 flex gap-2">
        <Btn sm danger onClick={onDelete}>Delete audit</Btn>
      </div>
    </div>
  )
}

function GbpAuditPage({ onSave }: { onSave: () => void }) {
  const [bizName, setBizName] = useState('')
  const [suburb, setSuburb] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<GbpAudit | null>(null)
  const [savedAudits, setSavedAudits] = useState<GbpAudit[]>(() => getGbpAudits())

  const run = async () => {
    if (!bizName || !suburb) { alert('Please enter a business name and suburb'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/gbp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: bizName, suburb })
      })
      const json = await res.json() as { success: boolean; data?: GbpAuditData; error?: string }
      if (!json.success || !json.data) { setError(json.error || 'Audit failed'); return }
      if (json.data.notFound) { setError('Business not found on Google  —  check the name and suburb'); return }
      const audit: GbpAudit = { id: uid(), businessName: bizName, suburb, auditedAt: new Date().toISOString(), data: json.data }
      saveGbpAudit(audit)
      setSavedAudits(getGbpAudits())
      onSave()
      setResult(audit)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally { setLoading(false) }
  }

  if (result) {
    return (
      <>
        <TopBar title="GBP Audit" sub={result.businessName + ' Â· ' + result.suburb}>
          <Btn sm onClick={() => setResult(null)}> New audit</Btn>
        </TopBar>
        <GbpReport audit={result} onDelete={() => { deleteGbpAudit(result.id); setSavedAudits(getGbpAudits()); onSave(); setResult(null) }} />
      </>
    )
  }

  return (
    <>
      <TopBar title="GBP Audit" sub="Audit any Google Business Profile  —  scored and pitch-ready" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CTitle>Audit a Google Business Profile</CTitle>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><Lbl>Business name *</Lbl><input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="e.g. Smith's Plumbing" className="inp w-full" /></div>
            <div><Lbl>Suburb *</Lbl><input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="e.g. Albury NSW" className="inp w-full" /></div>
          </div>
          <Btn primary onClick={run} disabled={loading}>{loading ? ' Searching GBP...' : ' Run GBP Audit'}</Btn>
          {error && <p className="text-[13px] mt-3" style={{ color: 'var(--red)' }}>{error}</p>}
        </Card>

        {savedAudits.length > 0 && (
          <Card>
            <CTitle>Previous GBP audits</CTitle>
            <div className="flex flex-col gap-1 mt-2">
              {savedAudits.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{a.businessName}</div>
                    <div className="text-[11px]" style={{ color: 'var(--t3)' }}>{a.suburb} Â· {new Date(a.auditedAt).toLocaleDateString('en-AU')}</div>
                  </div>
                  <span className="text-[13px] font-bold" style={{ color: 'var(--accent)' }}>{scoreGbp(a.data).overall}</span>
                  <Btn sm onClick={() => setResult(a)}>View</Btn>
                  <Btn sm danger onClick={() => { deleteGbpAudit(a.id); setSavedAudits(getGbpAudits()); onSave() }}></Btn>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

function Dashboard({ projects, audits, gbpAudits, compReports, onNew, onAudit, onView }: { projects: Project[]; audits: Audit[]; gbpAudits: GbpAudit[]; compReports: SavedCompetitorReport[]; onNew: () => void; onAudit: () => void; onView: (a: Audit) => void }) {
  const seoA = audits.map(a => a.scores.seo), lpA = audits.map(a => a.scores.lp)
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const recent = [...audits].reverse().slice(0, 10)
  return (
    <>
      <TopBar title="Dashboard" sub="Overview of all projects and audits">
        <div className="flex gap-2"><Btn onClick={onAudit}>Quick Audit</Btn><Btn primary onClick={onNew}>+ New Project</Btn></div>
      </TopBar>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>Projects</div>
            <div className="text-3xl font-semibold leading-none" style={{ color: 'var(--accent2)' }}>{projects.length}</div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>Pages Audited</div>
            <div className="text-3xl font-semibold leading-none" style={{ color: 'var(--t1)' }}>{audits.length}</div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>GBP Audits</div>
            <div className="text-3xl font-semibold leading-none" style={{ color: 'var(--accent)' }}>{gbpAudits.length}</div>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>Competitor Analysis</div>
            <div className="text-3xl font-semibold leading-none" style={{ color: 'var(--green)' }}>{compReports.length}</div>
          </div>
                </div>
        <Card>
          <CTitle>Recent Audits</CTitle>
          {!recent.length ? <Empty icon="" title="No audits yet" sub="Run your first page audit to get started." /> : (
            <table className="w-full text-[13px]">
              <THead cols={['URL', 'Label', 'Project', 'SEO', 'LP', 'Grade', 'Date', '']} />
              <tbody>{recent.map(a => {
                const proj = projects.find(p => p.id === a.projectId)
                return (
                  <tr key={a.id} className="hover:bg-[var(--bg3)] transition-colors">
                    <TD mono><a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>{a.url}</a></TD>
                    <TD>{a.label || ' — '}</TD>
                    <TD>{proj?.name ?? <span style={{ color: 'var(--t3)' }}> — </span>}</TD>
                    <TD><Tag color={stag(a.scores.seo)}>{a.scores.seo}</Tag></TD>
                    <TD><Tag color={stag(a.scores.lp)}>{a.scores.lp}</Tag></TD>
                    <TD><Tag color="purple">{a.scores.grade}</Tag></TD>
                    <TD>{new Date(a.date).toLocaleDateString()}</TD>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                      <Btn sm onClick={() => onView(a)}>View</Btn>
                    </td>
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

//  Projects 
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
    if (editing) { updateProject({ ...editing, name, url, competitors }) }
    else { addProject({ id: uid(), name, url, competitors, created: new Date().toISOString() }) }
    onRefresh(); setShowForm(false)
  }

  return (
    <>
      <TopBar title="Projects" sub="Manage businesses and competitors"><Btn primary onClick={openNew}>+ New Project</Btn></TopBar>
      <div className="flex-1 overflow-y-auto p-6">
        {showForm && (
          <Card>
            <CTitle>{editing ? `Edit  —  ${editing.name}` : 'Create New Project'}</CTitle>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><Lbl>Business Name *</Lbl><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BEAL Creative" /></div>
              <div><Lbl>Website URL *</Lbl><input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="e.g. bealcreative.com.au" /></div>
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
        {!projects.length && !showForm ? <Empty icon="" title="No projects yet" sub="Create your first project." /> : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {projects.map(p => {
              const pa = audits.filter(a => a.projectId === p.id)
              const avgS = pa.length ? Math.round(pa.reduce((s, a) => s + a.scores.seo, 0) / pa.length) : null
              const avgL = pa.length ? Math.round(pa.reduce((s, a) => s + a.scores.lp, 0) / pa.length) : null
              return (
                <div key={p.id} className="rounded-xl p-[18px] border hover:border-yellow-400/30 transition-colors" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                  <div className="text-[15px] font-semibold mb-1">{p.name}</div>
                  <div className="font-mono text-[12px] mb-3" style={{ color: 'var(--accent2)' }}>{p.url}</div>
                  <div className="flex gap-4 mb-3">
                    {[['Pages', pa.length, 'var(--t1)'], ['SEO Avg', avgS ?? ' — ', 'var(--accent2)'], ['LP Avg', avgL ?? ' — ', 'var(--amber)'], ['Comps', p.competitors.length, 'var(--t1)']].map((lvc) => { const l=lvc[0], v=lvc[1], c=lvc[2]; return (
                      <div key={String(l)}><div className="text-[10px]" style={{ color: 'var(--t3)' }}>{l}</div><div className="text-[14px] font-semibold" style={{ color: String(c) }}>{String(v)}</div></div>
                    }))}
                  </div>
                  {p.competitors.length > 0 && (
                    <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      {p.competitors.map(c => (
                        <div key={c.name} className="flex gap-1.5 text-[12px] mb-1" style={{ color: 'var(--t2)' }}>
                          <span style={{ color: 'var(--t3)' }}></span>{c.name}
                          <span className="font-mono text-[10px]" style={{ color: 'var(--accent2)' }}>{c.url}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Btn sm onClick={onAudit}>+ Audit</Btn>
                    <Btn sm onClick={() => openEdit(p)}>Edit</Btn>
                    <Btn sm danger cls="ml-auto" onClick={() => { if (confirm('Delete project?')) { deleteProject(p.id); onRefresh() } }}>Delete</Btn>
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

//  Audit Page 
function AuditPage({ projects, weights, onRefresh }: { projects: Project[]; weights: LpWeights; onRefresh: () => void }) {
  const [url, setUrl] = useState(''), [label, setLabel] = useState(''), [industry, setIndustry] = useState(''), [location, setLocation] = useState(''), [projectId, setProjectId] = useState(''), [assignedTo, setAssignedTo] = useState('unassigned')
  const [loading, setLoading] = useState(false), [stepIdx, setStepIdx] = useState(0)
  const [result, setResult] = useState<AuditReport | null>(null), [error, setError] = useState(''), [savedId, setSavedId] = useState('')
  const [tab, setTab] = useState('gap')
  const selectedProject = projects.find(p => p.id === projectId) ?? null

  const run = async () => {
    if (!url) { alert('Please enter a URL'); return }
    setLoading(true); setError(''); setResult(null); setStepIdx(0)
    const existing = projectId ? getAuditsByProject(projectId).length : 0
    const timer = setInterval(() => setStepIdx(s => s < STEPS.length - 1 ? s + 1 : s), 1600)
    try {
      const res = await fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, label, industry, location, projectId, assignedTo, project: selectedProject, competitors: selectedProject?.competitors ?? [], existingAuditsCount: existing, lpWeights: weights }) })
      const data = await res.json() as { success: boolean; report?: AuditReport; error?: string }
      clearInterval(timer)
      if (!data.success || !data.report) { setError(data.error ?? 'Audit failed'); return }
      const id = uid()
      addAudit({ id, url, label, industry, location, projectId, assignedTo, scores: data.report.scores, report: data.report, date: new Date().toISOString() })
      setSavedId(id); onRefresh(); setResult(data.report); setTab('gap')
    } catch (e) {
      clearInterval(timer); setError(e instanceof Error ? e.message : 'Network error')
    } finally { setLoading(false) }
  }

  useEffect(() => {
  const p = new URLSearchParams(window.location.search)
  if (p.get('url')) setUrl(p.get('url')!)
  if (p.get('label')) setLabel(p.get('label')!)
  if (p.get('industry')) setIndustry(p.get('industry')!)
  if (p.get('location')) setLocation(p.get('location')!)
  ;(window as { auditProspect?: (d: { name?: string; website?: string; industry?: string; address?: string }) => void }).auditProspect = (d) => {
    if (d.website) setUrl(d.website)
    if (d.name) setLabel(d.name)
    if (d.industry) setIndustry(d.industry)
    if (d.address) setLocation(d.address)
  }
}, [])

const TABS = [{ id: 'gap', label: 'Gap Analysis' }, { id: 'seo', label: 'SEO Analysis' },{ id: 'aeo', label: 'AEO' }, { id: 'lp', label: 'LP Scoring' }, { id: 'fixes', label: 'Priority Fixes' }, { id: 'comp', label: 'Positioning' }, { id: 'sw', label: 'Strengths & Gaps' }, { id: 'recs', label: 'Recommendations' }]

  return (
    <>
      <TopBar title="Page Audit" sub="Standalone audit tool  —  assign to a project or save unassigned" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CTitle>Audit any URL</CTitle>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Lbl>Page URL *</Lbl><input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="https://example.com/any-page" /></div>
            <div><Lbl>Page Label (optional)</Lbl><input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Homepage, Pricing" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Lbl>Industry (optional)</Lbl><input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Digital marketing agency" className="inp w-full" /></div>
            <div><Lbl>Location (optional)</Lbl><input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Melbourne, VIC" className="inp w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Lbl>Assign to Project (optional)</Lbl>
              <select value={projectId} onChange={e => { setProjectId(e.target.value); setAssignedTo('unassigned') }}>
                <option value="">Save as standalone audit</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {projectId && selectedProject && (
              <div>
                <Lbl>Tag this URL as</Lbl>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="unassigned"> —  Not tagged  — </option>
                  <option value="business">Main Business ({selectedProject.name})</option>
                  {selectedProject.competitors.map((c, i) => <option key={i} value={`competitor${i + 1}`}>Competitor {i + 1} ({c.name})</option>)}
                </select>
              </div>
            )}
          </div>
          <Btn primary onClick={run} disabled={loading}>{loading ? 'Analysing...' : 'Analyse Page'}</Btn>
        </Card>

        {loading && (
          <Card>
            <div className="flex flex-col items-center py-6 gap-4">
              <Spinner />
              <div className="text-[13px]" style={{ color: 'var(--t2)' }}>{STEPS[stepIdx]}...</div>
              <div className="flex flex-col gap-1.5">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 text-[12px]" style={{ color: i <= stepIdx ? 'var(--t2)' : 'var(--t3)' }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-yellow-400 pulse' : ''}`} style={i > stepIdx ? { background: 'var(--border2)' } : {}} />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {error && <Card><div className="font-semibold mb-1" style={{ color: 'var(--red)' }}>Audit Failed</div><div style={{ color: 'var(--t3)' }}>{error}</div></Card>}

        {result && (
          <AuditResultView report={result} url={url} label={label} auditId={savedId} tabs={TABS} defaultTab={tab} onTabChange={setTab} />
        )}
      </div>
    </>
  )
}

//  Shared Audit Result View 
function AuditResultView({ report: r, url, label, auditId, tabs, defaultTab, onTabChange }: {
  report: AuditReport; url: string; label: string; auditId: string
  tabs?: { id: string; label: string }[]
  defaultTab?: string
  onTabChange?: (t: string) => void
}) {
  const TABS = tabs ?? [{ id: 'gap', label: 'Gap Analysis' }, { id: 'seo', label: 'SEO Analysis' }, { id: 'lp', label: 'LP Scoring' }, { id: 'fixes', label: 'Priority Fixes' }, { id: 'comp', label: 'Positioning' }, { id: 'sw', label: 'Strengths & Gaps' }, { id: 'recs', label: 'Recommendations' }]
  const [tab, setTab] = useState(defaultTab ?? 'gap')
  const changeTab = (t: string) => { setTab(t); onTabChange?.(t) }

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-base font-semibold">{label || r.overview.pageType}</div>
              {r.scraped && !r.scraped.error
                ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400"> Live data fetched</span>
                : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400"> Estimated  —  page not reachable</span>
              }
            </div>
            <div className="font-mono text-[12px] mb-2" style={{ color: 'var(--accent2)' }}>{url}</div>
            <SmartText text={r.overview.summary} color="var(--t3)" />
          </div>
          <ExportAuditBtn auditId={auditId} />
        </div>
        {/* Search preview */}
        <div className="rounded-lg p-3 mb-4 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
          <div className="text-[11px] mb-0.5" style={{ color: 'var(--t3)' }}>{url}</div>
          <div className="text-[15px] mb-0.5" style={{ color: 'var(--blue)' }}>{r.overview.title}</div>
          <div className="text-[12px]" style={{ color: 'var(--t2)' }}>{r.overview.description}</div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[['Response', r.overview.responseTime], ['File Size', r.overview.fileSize], ['Words', r.overview.wordCount], ['Int. Links', r.overview.internalLinks], ['Media', r.overview.mediaFiles]].map((kv) => { const k=kv[0], v=kv[1]; return (
            <div key={String(k)} className="rounded-lg p-2.5 border text-center" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>{k}</div>
              <div className="text-[14px] font-semibold">{String(v)}</div>
            </div>
          }))}
        </div>
        {/* Score boxes */}
        <div className="flex gap-2.5 flex-wrap">
          {([['SEO Score', r.scores.seo], ['LP Score', r.scores.lp], ['Overall', r.scores.overall]] as [string, number][]).map((lv) => { const l=lv[0], v=lv[1]; return (
            <div key={l} className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>{l}</div>
              <div className="text-[22px] font-bold" style={{ color: sc(v) }}>{v}</div>
            </div>
          }))}
          {r.aeoScore && (
            <div className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>AEO Score</div>
              <div className="text-[22px] font-bold" style={{ color: sc(Math.round((r.aeoScore.total / ((r.aeoScore.faqMax ?? 0) + 30)) * 100)) }}>{r.aeoScore.total}<span className="text-[12px] font-normal" style={{ color: 'var(--t3)' }}>/{(r.aeoScore.faqMax ?? 0) + 30}</span></div>
            </div>
          )}
          <div className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Grade</div>
            <div className="text-[22px] font-bold" style={{ color: gcol(r.scores.grade) }}>{r.scores.grade}</div>
          </div>
          <div className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.2)' }}>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--green)' }}>After Fixes</div>
            <div className="text-[22px] font-bold" style={{ color: 'var(--green)' }}>{r.projectedScoreAfterFixes.total}</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 border-b mt-6 mb-6 flex-wrap" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => changeTab(t.id)}
            className="px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap"
            style={{ color: tab === t.id ? 'var(--accent2)' : 'var(--t3)', borderColor: tab === t.id ? 'var(--accent)' : 'transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'aeo' && (
          <div className="flex flex-col gap-4">
            {r.aeoScore ? (() => {
              const faqLabels: Record<string, string> = { faqSchemaPairs: 'FAQ Schema Q&A Pairs', faqAnswerPairs: 'Q&A with Answer Content', questionHeadings: 'Question Headings' }
              const faqMax: Record<string, number> = { faqSchemaPairs: 4, faqAnswerPairs: 3, questionHeadings: 3 }
              const readinessLabels: Record<string, string> = { schemaPresent: 'Schema Markup', schemaRelevance: 'Schema Relevance', structuredLists: 'Lists & Tables', metaAsAnswer: 'Meta as Answer', entitySignals: 'Entity Signals', contentDepth: 'Content Depth', openGraph: 'Open Graph', httpsCanonical: 'HTTPS + Canonical' }
              const readinessMax: Record<string, number> = { schemaPresent: 8, schemaRelevance: 6, structuredLists: 4, metaAsAnswer: 3, entitySignals: 3, contentDepth: 3, openGraph: 2, httpsCanonical: 1 }
              const faqKeys = ['faqSchemaPairs', 'faqAnswerPairs', 'questionHeadings']
              const readinessKeys = ['schemaPresent', 'schemaRelevance', 'structuredLists', 'metaAsAnswer', 'entitySignals', 'contentDepth', 'openGraph', 'httpsCanonical']
              const bd = r.aeoScore.breakdown as Record<string, number | null>
              const isNaPage = r.aeoScore.faqScore === null
              return (
                <>
                  {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Header card with combined score ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
                  <div className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-[15px] font-semibold" style={{ color: 'var(--t1)' }}>Answer Engine Optimisation</div>
                        <div className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>How well this page is structured for AI tools like ChatGPT, Perplexity and Google AI Overviews</div>
                      </div>
                      <div className="flex gap-3 ml-4">
                        {/* FAQ Score box */}
                        <div className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'var(--bg3)', borderColor: isNaPage ? 'var(--border)' : 'var(--accent)' }}>
                          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: isNaPage ? 'var(--t3)' : 'var(--accent)' }}>FAQ Score</div>
                          {isNaPage
                            ? <div className="text-[22px] font-bold" style={{ color: 'var(--t3)' }}>N/A</div>
                            : <div className="text-[22px] font-bold" style={{ color: sc(Math.round(((r.aeoScore.faqScore ?? 0) / 10) * 100)) }}>{r.aeoScore.faqScore}<span className="text-[12px] font-normal" style={{ color: 'var(--t3)' }}>/10</span></div>
                          }
                        </div>
                        {/* AEO Readiness box */}
                        <div className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>AEO Readiness</div>
                          <div className="text-[22px] font-bold" style={{ color: sc(Math.round((r.aeoScore.aeoReadiness / 30) * 100)) }}>{r.aeoScore.aeoReadiness}<span className="text-[12px] font-normal" style={{ color: 'var(--t3)' }}>/30</span></div>
                        </div>
                        {/* Grade box */}
                        <div className="rounded-xl px-4 py-2.5 text-center border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                          <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Grade</div>
                          <div className="text-[22px] font-bold" style={{ color: gcol(r.aeoScore.grade) }}>{r.aeoScore.grade}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ FAQ Score panel ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
                  <div className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>FAQ Score</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>Real questions + answers — signals Google rich results and AI citation readiness</div>
                      </div>
                      {isNaPage && <div className="text-[11px] px-2 py-1 rounded" style={{ background: 'var(--bg3)', color: 'var(--t3)' }}>N/A for this page type</div>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {faqKeys.map(key => {
                        const pts = bd[key]
                        const max = faqMax[key] || 1
                        const isNA = pts === null
                        const pct = isNA ? 0 : Math.round(((pts as number) / max) * 100)
                        return (
                          <div key={key} className="rounded-lg p-2.5 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)', opacity: isNA ? 0.45 : 1 }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="text-[11px] font-medium" style={{ color: 'var(--t2)' }}>{faqLabels[key]}</div>
                              <div className="text-[11px] font-bold" style={{ color: isNA ? 'var(--t3)' : sc(pct) }}>{isNA ? 'N/A' : `${pts}/${max}`}</div>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: 'var(--bg2)' }}>
                              <div className="h-1.5 rounded-full transition-all" style={{ width: (isNA ? 0 : pct) + '%', background: isNA ? 'var(--t3)' : sc(pct) }}></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ AEO Readiness panel ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
                  <div className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                    <div className="mb-3">
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>AEO Readiness</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--t3)' }}>Structural and technical signals that help AI tools understand, trust and cite your content</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {readinessKeys.map(key => {
                        const pts = bd[key] as number
                        const max = readinessMax[key] || 1
                        const pct = Math.round((pts / max) * 100)
                        return (
                          <div key={key} className="rounded-lg p-2.5 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="text-[11px] font-medium" style={{ color: 'var(--t2)' }}>{readinessLabels[key]}</div>
                              <div className="text-[11px] font-bold" style={{ color: sc(pct) }}>{pts}/{max}</div>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: 'var(--bg2)' }}>
                              <div className="h-1.5 rounded-full transition-all" style={{ width: pct + '%', background: sc(pct) }}></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )
            })() : (
              <div className="rounded-xl p-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                <div className="text-[13px]" style={{ color: 'var(--t3)' }}>AEO score not available — re-run the audit to generate AEO data.</div>
              </div>
            )}
          </div>
        )}
        {tab === 'gap' && <GapTab r={r} />}
      {tab === 'seo' && <SeoTab r={r} />}
      {tab === 'lp' && <LpTab r={r} />}
      {tab === 'fixes' && <FixesTab r={r} />}
      {tab === 'comp' && <CompTab r={r} />}
      {tab === 'sw' && <SwTab r={r} />}
      {tab === 'recs' && <RecsTab r={r} />}
    </>
  )
}

function ExportAuditBtn({ auditId }: { auditId: string }) {
  const go = async () => {
    const audit = getAuditById(auditId)
    if (!audit) return
    const { exportPDF } = await import('@/lib/pdfExport')
    exportPDF(audit)
  }
  return <Btn sm onClick={go}>Export PDF</Btn>
}

//  Gap Tab 
function GapTab({ r }: { r: AuditReport }) {
  const g = r.gapAnalysis
  if (!g) return <Card><div style={{ color: 'var(--t3)' }}>Gap analysis not available.</div></Card>
  const diff = g.afterScore - g.beforeScore
  return (
    <div>
      <Card>
        <div className="flex items-center gap-6 flex-wrap">
          <div><div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Current Score</div><div className="text-3xl font-bold" style={{ color: sc(g.beforeScore) }}>{g.beforeScore}<span className="text-base font-normal" style={{ color: 'var(--t3)' }}>/100</span></div><Tag color={stag(g.beforeScore)}>{g.beforeGrade}</Tag></div>
          <div className="text-2xl" style={{ color: 'var(--t3)' }}>-></div>
          <div><div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>After Fixes</div><div className="text-3xl font-bold" style={{ color: 'var(--green)' }}>{g.afterScore}<span className="text-base font-normal" style={{ color: 'var(--t3)' }}>/100</span></div><Tag color="green">{g.afterGrade}</Tag></div>
          <div className="rounded-xl px-5 py-3 border" style={{ background: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.2)' }}><div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--green)' }}>Potential Uplift</div><div className="text-2xl font-bold" style={{ color: 'var(--green)' }}>+{diff} pts</div></div>
          <div className="flex-1 min-w-[200px]"><SmartText text={g.executiveSummary} /></div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CTitle> Critical Issues</CTitle>
          {g.criticalIssues.map((item, i) => (
            <div key={i} className="mb-4 pb-4 border-b last:border-0 last:mb-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(248,113,113,0.15)', color: 'var(--red)' }}>{i + 1}</div>
                <div className="text-[13px] font-semibold">{item.issue}</div>
              </div>
              <div className="pl-7 mb-1"><span className="text-[12px] font-semibold" style={{ color: 'var(--t2)' }}>Impact: </span><SmartText text={item.impact} color="var(--t3)" /></div>
              <div className="pl-7 mb-2"><span className="text-[12px] font-semibold" style={{ color: 'var(--t2)' }}>Fix: </span><SmartText text={item.fix} color="var(--t2)" /></div>
              <div className="pl-7"><Tag color={item.effort === 'Easy' ? 'green' : item.effort === 'Medium' ? 'amber' : 'red'}>{item.effort} fix</Tag></div>
            </div>
          ))}
        </Card>
        <div>
          <Card>
            <CTitle> Quick Wins</CTitle>
            {g.quickWins.map((item, i) => (
              <div key={i} className="flex gap-3 mb-3 pb-3 border-b last:border-0 last:mb-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--green)' }}>{i + 1}</div>
                <div><div className="text-[13px] font-semibold mb-0.5">{item.win}</div><SmartText text={item.action} color="var(--t3)" /><div className="mt-1"><Tag color="blue">{item.timeEstimate}</Tag></div></div>
              </div>
            ))}
          </Card>
          <Card><CTitle> Positioning Gap</CTitle><SmartText text={g.positioningGap} /></Card>
          <div className="rounded-xl p-5 border" style={{ background: 'rgba(255,229,0,0.05)', borderColor: 'rgba(255,229,0,0.3)' }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent2)' }}> Top Recommendation</div>
            <SmartText text={g.topRecommendation} color="var(--t1)" className="font-semibold" />
          </div>
        </div>
      </div>
    </div>
  )
}

//  SEO Tab  —  Seobility style 
function SeoTab({ r }: { r: AuditReport }) {
  const cats = Object.keys(r.seoCategories) as (keyof SeoCategories)[]
  return (
    <div>
      {/* Category overview bars */}
      <Card>
        <CTitle>SEO Score Overview</CTitle>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {cats.map(k => (
            <div key={k}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px]" style={{ color: 'var(--t2)' }}>{SEO_LABELS[k]}</span>
                <span className="font-mono text-[13px] font-semibold" style={{ color: sc(r.seoCategories[k].score) }}>{r.seoCategories[k].score}%</span>
              </div>
              <Bar pct={r.seoCategories[k].score} />
            </div>
          ))}
        </div>
      </Card>

      {/* Individual check sections */}
      {cats.map(k => {
        const cat = r.seoCategories[k]
        const passCount = cat.checks.filter(c => c.status === 'pass').length
        return (
          <Card key={k}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[14px] font-semibold">{SEO_LABELS[k]}</div>
              <div className="flex items-center gap-2">
                <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{passCount}/{cat.checks.length} passed</span>
                <span className="font-mono text-[13px] font-semibold px-2 py-0.5 rounded" style={{ color: sc(cat.score), background: `${sc(cat.score)}15` }}>{cat.score}%</span>
              </div>
            </div>
            {cat.checks.map((c, i) => {
              const isPass = c.status === 'pass', isFail = c.status === 'fail'
              const dotCol = isPass ? 'var(--green)' : isFail ? 'var(--red)' : 'var(--amber)'
              const critMap = { critical: { label: 'Critically important', cls: 'text-red-400' }, important: { label: 'Important', cls: 'text-yellow-400' }, somewhat: { label: 'Somewhat important', cls: 'text-blue-400' }, nice: { label: 'Nice to have', cls: 'text-zinc-500' } }
              const crit = critMap[c.criticality]
              return (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  {/* Status dot */}
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${dotCol}20` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: dotCol }} />
                  </div>
                  {/* Label + detail */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold mb-0.5">{c.label}</div>
                    <div className="text-[12px]" style={{ color: 'var(--t3)' }}>{c.detail}</div>
                  </div>
                  {/* Criticality badge */}
                  <div className={`text-[10px] font-medium flex-shrink-0 ${crit.cls}`}>{crit.label}</div>
                </div>
              )
            })}
          </Card>
        )
      })}
    </div>
  )
}

//  LP Tab 
function LpTab({ r }: { r: AuditReport }) {
  const cats = Object.keys(r.lpScoring) as (keyof LpScoring)[]
  const gc = gcol(r.scores.grade)
  return (
    <div>
      <Card>
        <div className="flex items-center gap-5 mb-5 flex-wrap">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-extrabold border-2" style={{ color: gc, borderColor: gc }}>{r.scores.grade}</div>
          <div><div className="text-2xl font-bold">{r.scores.lp}<span className="text-sm font-normal" style={{ color: 'var(--t3)' }}>/100</span></div></div>
          <div className="ml-4"><div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>After fixes</div><div className="text-xl font-bold" style={{ color: 'var(--green)' }}>{r.projectedScoreAfterFixes.total}<span className="text-sm font-normal" style={{ color: 'var(--t3)' }}>/100 ({r.projectedScoreAfterFixes.grade})</span></div></div>
        </div>
        {cats.map(k => {
          const c = r.lpScoring[k]
          return (
            <div key={k} className="mb-4 pb-4 border-b last:border-0 last:mb-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[13px] font-semibold min-w-[180px]">{LP_LABELS[k]}</span>
                <Bar pct={c.percentage} />
                <span className="font-mono text-[13px] font-semibold min-w-[55px] text-right" style={{ color: sc(c.percentage) }}>{c.score}/{c.maxScore}</span>
              </div>
              <SmartText text={c.assessment} color="var(--t3)" className="mb-2" />
              <div className="grid grid-cols-5 gap-2">
                {c.subScores.map((s, i) => (
                  <div key={i} className="rounded-lg p-2 border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                    <div className="text-[10px] mb-1" style={{ color: 'var(--t3)' }}>{s.label}</div>
                    <div className="text-[16px] font-bold mb-0.5" style={{ color: s.score >= 2 ? 'var(--green)' : s.score >= 1 ? 'var(--amber)' : 'var(--red)' }}>{s.score}<span className="text-[10px] font-normal" style={{ color: 'var(--t3)' }}>/{s.max}</span></div>
                    <div className="text-[10px]" style={{ color: 'var(--t3)' }}>{s.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

//  Fixes Tab 
function FixesTab({ r }: { r: AuditReport }) {
  return (
    <Card>
      <CTitle>Priority Fixes  —  Ranked by Impact</CTitle>
      {r.priorityFixes.map(f => (
        <div key={f.rank} className="flex gap-3.5 py-3.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0" style={{ background: 'rgba(255,229,0,0.12)', color: 'var(--accent2)' }}>{f.rank}</div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold mb-1">{f.title}</div>
            <div className="mb-1 pl-0"><span className="text-[12px] font-semibold" style={{ color: 'var(--t2)' }}>Problem: </span><SmartText text={f.problem} color="var(--t3)" /></div>
            <div className="mb-2"><span className="text-[12px] font-semibold" style={{ color: 'var(--t2)' }}>Fix: </span><SmartText text={f.fix} color="var(--t2)" /></div>
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

//  Positioning Tab 
function CompTab({ r }: { r: AuditReport }) {
  const c = r.competitorAnalysis
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Card>
          <CTitle>Hook Type & Positioning</CTitle>
          <div className="mb-3"><div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--t3)' }}>Hook type</div><Tag color="amber">{c.hookType}</Tag></div>
          <SmartText text={c.hookAnalysis} className="mb-3" />
          <div className="text-[11px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--t3)' }}>Positioning strength</div>
          <Tag color={c.positioningStrength === 'Strong' ? 'green' : c.positioningStrength === 'Moderate' ? 'amber' : 'red'}>{c.positioningStrength}</Tag>
          <div className="mt-2"><SmartText text={c.positioningNote} color="var(--t3)" /></div>
        </Card>
        <Card>
          <CTitle>Buyer Anxieties Addressed</CTitle>
          {c.buyerAnxieties.map((b, i) => (
            <div key={i} className="flex gap-2.5 py-1.5 border-b last:border-0 items-start" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[12px] mt-0.5 flex-shrink-0" style={{ color: b.addressed ? 'var(--green)' : 'var(--red)' }}>{b.addressed ? '' : ''}</span>
              <div><div className="text-[12px] font-semibold">{b.anxiety}</div><div className="text-[11px]" style={{ color: 'var(--t3)' }}>{b.note}</div></div>
            </div>
          ))}
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card><CTitle>Table Stakes</CTitle><div className="flex flex-col gap-1.5">{c.tableStakes.map((t, i) => <Insight key={i} color="amber" text={t} />)}</div></Card>
        <Card>
          <CTitle>White Space  —  Unclaimed Opportunities</CTitle>
          {c.whiteSpace.map((w, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[13px] font-semibold mb-1">{w.opportunity}</div>
              <SmartText text={w.rationale} color="var(--t3)" className="mb-1.5" />
              <Tag color="green">{w.owner}</Tag>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

//  SW Tab 
function SwTab({ r }: { r: AuditReport }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {([{ icon: '', title: 'Strengths', items: r.strengthsWeaknesses.strengths, color: 'green' as const, bg: 'rgba(52,211,153,0.1)', tc: 'var(--green)' }, { icon: '', title: 'Weaknesses', items: r.strengthsWeaknesses.weaknesses, color: 'red' as const, bg: 'rgba(248,113,113,0.1)', tc: 'var(--red)' }, { icon: '', title: 'Missed Opportunities', items: r.strengthsWeaknesses.missedOpportunities, color: 'blue' as const, bg: 'rgba(96,165,250,0.1)', tc: 'var(--blue)' }]).map(s => (
        <Card key={s.title}>
          <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: s.bg, color: s.tc }}>{s.icon}</div><div className="text-[14px] font-semibold">{s.title}</div></div>
          <div className="flex flex-col gap-1.5">{s.items.map((item, i) => <Insight key={i} color={s.color} text={item} />)}</div>
        </Card>
      ))}
    </div>
  )
}

//  Recs Tab 
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

//  Competitor Analysis Page 
function CompetitorPage({ projects, onRefresh, brandLogo, onLogoChange }: { projects: Project[]; onRefresh: () => void; brandLogo: string; onLogoChange: (l: string) => void }) {
  const [mode, setMode] = useState<'manual' | 'project'>('manual')
  const [bizName, setBizName] = useState(''), [bizUrl, setBizUrl] = useState(''), [market, setMarket] = useState('')
  const [comps, setComps] = useState([{ name: '', url: '' }, { name: '', url: '' }, { name: '', url: '' }, { name: '', url: '' }])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [result, setResult] = useState<CompetitorIntelligenceReport | null>(null)
  const [saved, setSaved] = useState(false)

  const selectedProject = projects.find(p => p.id === projectId)

  const run = async () => {
    let bName = bizName, bUrl = bizUrl, competitors = comps.filter(c => c.name && c.url)
    if (mode === 'project' && selectedProject) {
      bName = selectedProject.name; bUrl = selectedProject.url
      competitors = selectedProject.competitors
    }
    if (!bUrl) { alert('Business URL required'); return }
    if (!competitors.length) { alert('At least one competitor required'); return }
    setLoading(true); setError(''); setResult(null); setSaved(false)
    try {
      const res = await fetch('/api/competitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessName: bName || bUrl, businessUrl: bUrl, competitors, market }) })
      const data = await res.json() as { success: boolean; report?: CompetitorIntelligenceReport; error?: string }
      if (!data.success || !data.report) { setError(data.error ?? 'Analysis failed'); return }
      setResult(data.report)
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error') }
    finally { setLoading(false) }
  }

  const saveReport = () => {
    if (!result) return
    const saved: SavedCompetitorReport = { id: uid(), businessName: result.businessName, businessUrl: result.businessUrl, projectId: mode === 'project' ? projectId : undefined, report: result, date: new Date().toISOString() }
    addCompetitorReport(saved); onRefresh(); setSaved(true)
  }

  const exportPDF = async () => {
    if (!result) return
    const { exportCompetitorPDF } = await import('@/lib/competitorPdf')
    const saved: SavedCompetitorReport = { id: uid(), businessName: result.businessName, businessUrl: result.businessUrl, report: result, date: new Date().toISOString() }
    exportCompetitorPDF(result)
  }
  async function exportHTML() {
    if (!result) return
    const { exportCompetitorHTML } = await import('@/lib/competitorHtmlExport')
    const saved: SavedCompetitorReport = { id: uid(), businessName: result.businessName, businessUrl: result.businessUrl, report: result, date: new Date().toISOString() }
    exportCompetitorHTML(result)
  }

  return (
    <>
      <TopBar title="Competitor Analysis" sub="AI-powered competitive intelligence report" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CTitle>Set Up Analysis</CTitle>
          <div className="flex gap-2 mb-4">
            <Btn onClick={() => setMode('manual')} primary={mode === 'manual'}>Enter manually</Btn>
            <Btn onClick={() => setMode('project')} primary={mode === 'project'}>Use a project</Btn>
          </div>
          {mode === 'manual' ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><Lbl>Your Business Name</Lbl><input value={bizName} onChange={e => setBizName(e.target.value)} placeholder="e.g. BEAL Creative" /></div>
                <div><Lbl>Your Business URL *</Lbl><input value={bizUrl} onChange={e => setBizUrl(e.target.value)} type="url" placeholder="e.g. bealcreative.com.au" /></div>
              </div>
              <div className="mb-3"><Lbl>Market / Industry (optional)</Lbl><input value={market} onChange={e => setMarket(e.target.value)} placeholder="e.g. Digital marketing agencies in regional Australia" /></div>
              <SectionDivider label="Competitors" />
              {comps.map((c, i) => (
                <div key={i} className="grid grid-cols-2 gap-3 mb-2.5">
                  <div><Lbl>Competitor {i + 1} Name</Lbl><input value={c.name} onChange={e => setComps(comps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="e.g. Rival Co" /></div>
                  <div><Lbl>Competitor {i + 1} URL</Lbl><input value={c.url} onChange={e => setComps(comps.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} type="url" placeholder="https://rival.com" /></div>
                </div>
              ))}
            </>
          ) : (
            <div>
              <Lbl>Select Project</Lbl>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ maxWidth: 360 }}>
                <option value=""> —  Select a project  — </option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.competitors.length} competitors)</option>)}
              </select>
              {selectedProject && (
                <div className="mt-3 p-3 rounded-lg border text-[13px]" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
                  <div className="font-semibold mb-1">{selectedProject.name}</div>
                  <div className="font-mono text-[11px] mb-2" style={{ color: 'var(--accent2)' }}>{selectedProject.url}</div>
                  {selectedProject.competitors.length ? selectedProject.competitors.map(c => (
                    <div key={c.name} className="text-[12px]" style={{ color: 'var(--t3)' }}>vs {c.name} ({c.url})</div>
                  )) : <div style={{ color: 'var(--red)' }}>No competitors in this project. Add competitors first.</div>}
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex items-end gap-4 flex-wrap">
            <div>
              <Lbl>Primary Business Logo (optional)</Lbl>
              <div className="flex items-center gap-3">
              {brandLogo
                ? <img src={brandLogo} alt="Logo" className="h-10 rounded object-contain" style={{ maxWidth: 120, background: 'var(--bg4)', padding: 4 }} />
                : <div className="h-10 w-24 rounded border flex items-center justify-center text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--t3)' }}>No logo</div>
              }
                <div className="flex gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium border rounded-lg transition-all bg-[var(--bg3)] border-[var(--border2)] text-[var(--t1)] hover:bg-[var(--bg4)]">
                     Upload
                    <input type="file" accept="image/*,.svg" className="hidden" onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => onLogoChange(ev.target?.result as string)
                      reader.readAsDataURL(file)
                    }} />
                  </label>
                  {brandLogo && <Btn sm onClick={() => onLogoChange('')}>Remove</Btn>}
                </div>
              </div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--t3)' }}>Appears on the report cover. PNG, JPG, or SVG.</div>
            </div>
            <Btn primary onClick={run} disabled={loading}>{loading ? ' Analysing market...' : ' Run Competitor Analysis'}</Btn>
          </div>
        </Card>

        {loading && (
          <Card>
            <div className="flex flex-col items-center py-8 gap-4">
              <Spinner />
              <div className="text-[13px]" style={{ color: 'var(--t2)' }}>Analysing competitive landscape...</div>
              <div className="text-[12px]" style={{ color: 'var(--t3)' }}>This takes 15-25 seconds  —  the AI is researching every player in your market</div>
            </div>
          </Card>
        )}

        {error && <Card><div className="font-semibold mb-1" style={{ color: 'var(--red)' }}>Analysis Failed</div><div style={{ color: 'var(--t3)' }}>{error}</div></Card>}

        {result && (
          <>
            {/* Action bar */}
            <div className="flex items-center gap-3 mb-4 p-4 rounded-xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              {brandLogo && <img src={brandLogo} alt="Logo" className="h-8 rounded object-contain flex-shrink-0" style={{ maxWidth: 100, background: 'var(--bg3)', padding: 3 }} />}
              <div className="flex-1">
                <div className="text-[13px] font-semibold">{result.businessName}  —  Competitor Analysis Report</div>
                <div className="text-[12px]" style={{ color: 'var(--t3)' }}>{result.date} Â· {result.profiles.length} businesses analysed</div>
              </div>
              {!saved ? (
                <>
                  <Btn onClick={saveReport} primary>Save Report</Btn>
                  <Btn onClick={exportPDF}> PDF</Btn>
                  <Btn onClick={exportHTML}> HTML</Btn>
                  <Btn danger onClick={() => setResult(null)}>Discard</Btn>
                </>
              ) : (
                <>
                  <div className="text-[13px]" style={{ color: 'var(--green)' }}>Saved to Reports</div>
                  <Btn onClick={exportPDF}> PDF</Btn>
                  <Btn onClick={exportHTML}> HTML</Btn>
                </>
              )}
            </div>

            <CompIntelReport r={result} brandLogo={brandLogo} />
          </>
        )}
      </div>
    </>
  )
}

//  Competitor Analysis Report View 
function CompIntelReport({ r, brandLogo = '' }: { r: CompetitorIntelligenceReport; brandLogo?: string }) {
  return (
    <div>
      {/* Report header with logo */}
      {brandLogo && (
        <div className="flex items-center gap-4 mb-5 p-4 rounded-xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <img src={brandLogo} alt={r.businessName} className="h-10 object-contain rounded" style={{ maxWidth: 140, background: 'var(--bg3)', padding: 4 }} />
          <div>
            <div className="text-[13px] font-semibold">{r.businessName}</div>
            <div className="text-[11px]" style={{ color: 'var(--t3)' }}>Competitor Analysis Report Â· {r.date}</div>
          </div>
        </div>
      )}
      {/* Headline findings */}
      <div className="mb-4">
        <div className="text-[15px] font-semibold mb-1">The Short Version</div>
        <div className="text-[13px] mb-4" style={{ color: 'var(--t3)' }}>Three findings from analysing {r.profiles.length} businesses in this market.</div>
        {r.headlineFindings.map(f => (
          <div key={f.number} className="flex gap-4 mb-4 p-4 rounded-xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: 'rgba(255,229,0,0.12)', color: 'var(--accent2)' }}>{f.number}</div>
            <div className="flex-1"><div className="text-[14px] font-semibold mb-2">{f.title}</div><SmartText text={f.detail} /></div>
          </div>
        ))}
      </div>

      {/* Who we looked at */}
      <Card>
        <CTitle>Who We Looked At</CTitle>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-[13px]" style={{ minWidth: 600 }}>
            <THead cols={['Business', 'Tier', 'SEO Score', 'Their Positioning', 'What They Do Well']} />
            <tbody>{r.profiles.map(p => (
              <tr key={p.url} className="hover:bg-[var(--bg3)] transition-colors">
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                  <div className="font-semibold">{p.name}</div>
                  <div className="font-mono text-[10px]" style={{ color: 'var(--accent2)' }}>{p.url}</div>
                </td>
                <TD><Tag color={p.tier === 'Client' ? 'purple' : p.tier === 'Premium' ? 'green' : p.tier === 'Mid' ? 'amber' : 'grey'}>{p.tier}</Tag></TD>
                <TD>{p.seoScore != null ? <div className="flex items-center gap-2"><span className="font-bold text-[13px]" style={{ color: scSeo(p.seoScore ?? 0) }}>{p.seoScore}</span><Bar pct={Math.round(((p.seoScore ?? 0)/65)*100)} /></div> : <span style={{ color: 'var(--t3)' }}>—</span>}</TD>
                <TD>{p.positioning}</TD>
                <TD>{p.whatTheyDoWell}</TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      {r.profiles.some(p => p.seoScore != null) && (
        <Card>
          <CTitle>SEO Score Comparison</CTitle>
          <div className="text-[12px] mb-4" style={{ color: 'var(--t3)' }}>Deterministic technical SEO scores — same checks applied to every URL (title, meta, H1, content, HTTPS, schema, speed and more)</div>
          <div className="flex flex-col gap-3">
            {[...r.profiles].filter(p => p.seoScore != null).sort((a, b) => (b.seoScore ?? 0) - (a.seoScore ?? 0)).map(p => (
              <div key={p.url} className="flex items-center gap-3">
                <div className="text-[12px] font-medium" style={{ minWidth: 140, color: p.tier === 'Client' ? 'var(--accent2)' : 'var(--t1)' }}>
                  {p.name}{p.tier === 'Client' && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--accent)' }}>YOU</span>}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(((p.seoScore ?? 0)/65)*100)}%`, background: scSeo(p.seoScore ?? 0) }} />
                  </div>
                  <span className="text-[13px] font-bold w-8 text-right" style={{ color: scSeo(p.seoScore ?? 0) }}>{p.seoScore}</span>
                </div>
              </div>
            ))}
          </div>
          {r.profiles.some(p => p.seoBreakdown) && (
            <div className="mt-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--t3)' }}>Breakdown by Check</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="w-full text-[12px]" style={{ minWidth: 500 }}>
                  <THead cols={['Check', ...r.profiles.filter(p => p.seoBreakdown).map(p => p.name)]} />
                  <tbody>
                    {(() => {
                      const SEO_CHECK_MAX: Record<string, number> = {
            title: 10, metaDescription: 8, h1: 8, wordCount: 8,
            https: 6, viewport: 5, imageAlt: 5, titleH1Alignment: 5,
            schema: 4, canonical: 3, responseTime: 3
          }
                      const totalMax = Object.values(SEO_CHECK_MAX).reduce((a,b) => a+b, 0)
                      const rows = Object.keys(r.profiles.find(p => p.seoBreakdown)?.seoBreakdown ?? {})
                      return <>
                        {rows.map(key => {
                          const max = SEO_CHECK_MAX[key] ?? 10
                          return (
                            <tr key={key} className="hover:bg-[var(--bg3)]">
                              <TD>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</TD>
                              {r.profiles.filter(p => p.seoBreakdown).map(p => {
                                const val = p.seoBreakdown?.[key] ?? 0
                                const pct = Math.round((val / max) * 100)
                                return (
                                  <TD key={p.name}>
                                    <span className="font-medium" style={{ color: sc(pct) }}>
                                      {val}<span style={{ color: 'var(--t3)', fontWeight: 400 }}>/{max}</span>
                                    </span>
                                  </TD>
                                )
                              })}
                            </tr>
                          )
                        })}
                        <tr style={{ borderTop: '2px solid var(--border)' }}>
                          <td className="text-[12px] font-bold" style={{ padding: '10px 12px', color: 'var(--t1)' }}>Total</td>
                          {r.profiles.filter(p => p.seoBreakdown).map(p => {
                            const tot = Object.values(p.seoBreakdown ?? {}).reduce((a,b) => a+(b as number),0)
                            return (
                              <td key={p.name} className="font-bold text-[12px]" style={{ padding: '10px 12px', color: scSeo(tot) }}>
                                {tot}<span style={{ color: 'var(--t3)', fontWeight: 400 }}>/65</span>
                              </td>
                            )
                          })}
                        </tr>
                      </>
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Hook analysis */}
      <Card>
        <CTitle>Opening Hook Analysis  —  The 3-Second Test</CTitle>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-[13px]" style={{ minWidth: 500 }}>
            <THead cols={['Business', 'Hero Headline', 'Hook Type', 'Effectiveness']} />
            <tbody>{r.profiles.map(p => (
              <tr key={p.url} className="hover:bg-[var(--bg3)] transition-colors">
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{p.name}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--t2)', fontStyle: 'italic' }}>{p.hookHeadline}</td>
                <TD><Tag color={p.hookType === 'Outcome' ? 'green' : p.hookType === 'Transformation+Proof' ? 'green' : p.hookType === 'Services List' ? 'amber' : 'blue'}>{p.hookType}</Tag></TD>
                <TD>{p.hookEffectiveness}</TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      {/* Claims matrix */}
      <Card>
        <CTitle>How the Market Talks to Customers</CTitle>
        <div className="text-[12px] mb-3" style={{ color: 'var(--t3)' }}>What each business claims  —  and how specifically.</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="text-[12px]" style={{ minWidth: 600, width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left text-[11px] font-semibold uppercase tracking-wider" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--t3)', minWidth: 140 }}>Claim Type</th>
                {r.profiles.map(p => <th key={p.url} className="text-left text-[11px] font-semibold uppercase tracking-wider" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: p.tier === 'Client' ? 'var(--accent2)' : 'var(--t3)' }}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {r.claimsMatrix.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg3)' : 'transparent' }}>
                  <td className="font-semibold text-[12px]" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--t2)' }}>{row.claimType}</td>
                  {r.profiles.map(p => (
                    <td key={p.url} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: row.values[p.name] === 'Not mentioned' ? 'var(--t3)' : 'var(--t2)', fontStyle: row.values[p.name] === 'Not mentioned' ? 'italic' : 'normal' }}>
                      {row.values[p.name] ?? ' — '}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Table stakes vs white space */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <CTitle>Table Stakes  —  Everyone Claims This</CTitle>
          <div className="text-[12px] mb-3" style={{ color: 'var(--t3)' }}>Expected by prospects  —  not differentiating.</div>
          {r.tableStakes.map((t, i) => <div key={i} className="py-2 border-b last:border-0 text-[13px]" style={{ borderColor: 'var(--border)', color: 'var(--t2)' }}>• {t}</div>)}
        </Card>
        <Card>
          <CTitle>White Space  —  Worth Claiming</CTitle>
          <div className="text-[12px] mb-3" style={{ color: 'var(--t3)' }}>Claims made by 0-1 competitors. Strong differentiation potential.</div>
          {r.whiteSpace.map((w, i) => (
            <div key={i} className="mb-3 pb-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[13px] font-semibold mb-1">{w.opportunity}</div>
              <SmartText text={w.rationale} color="var(--t3)" className="mb-1.5" />
              <Tag color="green">{w.owner}</Tag>
            </div>
          ))}
        </Card>
      </div>

      {/* Buyer anxieties */}
      <Card>
        <CTitle>What Customers Worry About</CTitle>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-[13px]" style={{ minWidth: 500 }}>
            <THead cols={['Common Concern', 'Who Addresses It Well', 'Who Ignores It']} />
            <tbody>{r.buyerAnxieties.map((b, i) => (
              <tr key={i} className="hover:bg-[var(--bg3)] transition-colors">
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{b.concern}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--green)' }}>{b.addressedBy}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', color: 'var(--t3)' }}>{b.ignoredBy}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      {/* Strategic implications */}
      <div className="mb-4">
        <div className="text-[15px] font-semibold mb-4">Strategic Implications</div>
        {r.strategicImplications.map(s => (
          <div key={s.number} className="mb-4 p-5 rounded-xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0" style={{ background: 'rgba(255,229,0,0.12)', color: 'var(--accent2)' }}>{s.number}</div>
              <div className="text-[14px] font-semibold">{s.title}</div>
            </div>
            <SmartText text={s.detail} />
          </div>
        ))}
      </div>

      {/* Quick wins  —  2 columns */}
      <Card>
        <CTitle>Quick Wins  —  30 Days</CTitle>
        <div className="text-[12px] mb-4" style={{ color: 'var(--t3)' }}>Actionable changes executable without a full rebrand.</div>
        <div className="grid grid-cols-2 gap-3">
          {r.quickWins.map((w, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border" style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: w.effort === 'Easy' ? 'rgba(52,211,153,0.2)' : w.effort === 'Medium' ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)', color: w.effort === 'Easy' ? 'var(--green)' : w.effort === 'Medium' ? 'var(--amber)' : 'var(--red)' }}></div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold mb-1 leading-snug">{w.action}</div>
                <SmartText text={w.why} color="var(--t3)" className="mb-1.5" />
                <Tag color={w.effort === 'Easy' ? 'green' : w.effort === 'Medium' ? 'amber' : 'red'}>{w.effort} effort</Tag>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary  —  structured not a wall of text */}
      <div className="p-5 rounded-xl border mb-4" style={{ background: 'rgba(255,229,0,0.04)', borderColor: 'rgba(255,229,0,0.15)' }}>
        <div className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent2)' }}>Summary</div>
        {(() => {
          const sentences = r.summary.match(/[^.!?]+[.!?]+/g) ?? [r.summary]
          const intro = sentences[0]?.trim() ?? ''
          const bullets = sentences.slice(1, -1).map(s => s.trim()).filter(Boolean)
          const closing = sentences.length > 1 ? sentences[sentences.length - 1]?.trim() : ''
          return (
            <>
              {intro && <p className="text-[14px] font-semibold leading-relaxed mb-3" style={{ color: 'var(--t1)' }}>{intro}</p>}
              {bullets.length > 0 && (
                <ul className="mb-3 flex flex-col gap-1.5">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-[13px] leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--accent2)' }} />
                      <span style={{ color: 'var(--t2)' }}>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {closing && (
                <div className="mt-3 p-3 rounded-lg border" style={{ background: 'rgba(255,229,0,0.07)', borderColor: 'rgba(255,229,0,0.35)' }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent2)' }}> Key Recommendation</div>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{closing}</div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

//  Reports 
function Reports({ audits, compReports, projects, onRefresh, onView }: { audits: Audit[]; compReports: SavedCompetitorReport[]; projects: Project[]; onRefresh: () => void; onView: (a: Audit) => void }) {
  const [tab, setTab] = useState<'audits' | 'gbp' | 'competitor'>('audits')
  const [viewingComp, setViewingComp] = useState<SavedCompetitorReport | null>(null)
  const [viewingGbp, setViewingGbp] = useState<GbpAudit | null>(null)
  const [gbpAudits, setGbpAudits] = useState<GbpAudit[]>(() => getGbpAudits())
  const [storedLogo, setStoredLogo] = useState<string>('')
  const sorted = [...audits].reverse()

  useEffect(() => { setStoredLogo(getBrandLogo()) }, [])

  const refreshGbp = () => { setGbpAudits(getGbpAudits()); onRefresh() }

  const exportAudit = async (id: string) => {
    const audit = getAuditById(id); if (!audit) return
    const { exportPDF } = await import('@/lib/pdfExport'); exportPDF(audit)
  }
  const exportAuditHTML = (id: string) => {
    const audit = getAuditById(id); if (!audit) return
    exportHTML(audit)
  }
  const exportComp = async (id: string) => {
    const rep = compReports.find(r => r.id === id); if (!rep) return
    const { exportCompetitorPDF } = await import('@/lib/competitorPdf'); exportCompetitorPDF(rep.report)
  }
  const exportCompHTML = async (id: string) => {
    const rep = compReports.find(r => r.id === id); if (!rep) return
    const { exportCompetitorHTML } = await import('@/lib/competitorHtmlExport'); exportCompetitorHTML(rep.report)
  }
  const exportGbpPdf = async (id: string) => {
    const a = gbpAudits.find(x => x.id === id); if (!a) return
    const { exportGbpPDF } = await import('@/lib/gbpPdfExport'); exportGbpPDF(a)
  }
  const exportGbpHtml = async (id: string) => {
    const a = gbpAudits.find(x => x.id === id); if (!a) return
    const { exportGbpHTML } = await import('@/lib/gbpHtmlExport'); exportGbpHTML(a)
  }

  if (viewingGbp) {
    return (
      <>
        <div className="px-6 py-4 border-b flex items-center gap-3" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <Btn onClick={() => setViewingGbp(null)}>Back to Reports</Btn>
          <div className="flex-1">
            <div className="text-base font-semibold">{viewingGbp.businessName}  —  GBP Audit</div>
            <div className="text-[12px]" style={{ color: 'var(--t3)' }}>{viewingGbp.suburb} Â· {new Date(viewingGbp.auditedAt).toLocaleDateString('en-AU')}</div>
          </div>
          <Btn sm onClick={() => exportGbpPdf(viewingGbp.id)}> PDF</Btn>
          <Btn sm onClick={() => exportGbpHtml(viewingGbp.id)}> HTML</Btn>
        </div>
        <GbpReport audit={viewingGbp} onDelete={() => { deleteGbpAudit(viewingGbp.id); refreshGbp(); setViewingGbp(null) }} />
      </>
    )
  }

  if (viewingComp) {
    return (
      <>
        <div className="px-6 py-4 border-b flex items-center gap-3" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <Btn onClick={() => setViewingComp(null)}>Back to Reports</Btn>
          {storedLogo && <img src={storedLogo} alt="Logo" className="h-7 rounded object-contain" style={{ maxWidth: 90, background: 'var(--bg3)', padding: 3 }} />}
          <div className="flex-1"><div className="text-base font-semibold">{viewingComp.businessName}  —  Competitor Analysis</div><div className="text-[12px]" style={{ color: 'var(--t3)' }}>{viewingComp.date}</div></div>
          <Btn sm onClick={() => exportComp(viewingComp.id)}>Export PDF</Btn>
        </div>
        <div className="flex-1 overflow-y-auto p-6"><CompIntelReport r={viewingComp.report} brandLogo={storedLogo} /></div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Reports" sub={`${audits.length} page audits Â· ${compReports.length} competitor reports`} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-2 mb-5">
          <Btn onClick={() => setTab('audits')} primary={tab === 'audits'}>Page Audits ({audits.length})</Btn>
          <Btn onClick={() => setTab('gbp')} primary={tab === 'gbp'}>GBP Audits ({gbpAudits.length})</Btn>
          <Btn onClick={() => setTab('competitor')} primary={tab === 'competitor'}>Competitor Analysis ({compReports.length})</Btn>
        </div>

        {tab === 'audits' && (
          <>
            {!sorted.length ? <Empty icon="" title="No page audits yet" sub="Run a page audit to generate your first report." /> : (
              <Card>
                <div style={{ overflowX: 'auto' }}>
                  <table className="w-full text-[13px]">
                    <THead cols={['URL', 'Label', 'Project', 'SEO', 'LP', 'Grade', 'Date', '']} />
                    <tbody>{sorted.map(a => {
                      const proj = projects.find(p => p.id === a.projectId)
                      return (
                        <tr key={a.id} className="hover:bg-[var(--bg3)] transition-colors">
                          <TD mono><a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>{a.url}</a></TD>
                          <TD>{a.label || ' — '}</TD>
                          <TD>{proj?.name ?? ' — '}</TD>
                          <TD><Tag color={stag(a.scores.seo)}>{a.scores.seo}</Tag></TD>
                          <TD><Tag color={stag(a.scores.lp)}>{a.scores.lp}</Tag></TD>
                          <TD><Tag color="purple">{a.scores.grade}</Tag></TD>
                          <TD>{new Date(a.date).toLocaleDateString()}</TD>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                            <div className="flex gap-1.5">
                              <Btn sm onClick={() => onView(a)}>View</Btn>
                              <Btn sm onClick={() => exportAudit(a.id)}> PDF</Btn>
                              <Btn sm onClick={() => exportAuditHTML(a.id)}> HTML</Btn>
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
          </>
        )}

        {tab === 'gbp' && (
          <>
            {!gbpAudits.length ? <Empty icon="" title="No GBP audits yet" sub="Run a GBP audit to generate your first Google Business Profile report." /> : (
              <Card>
                <div style={{ overflowX: 'auto' }}>
                  <table className="w-full text-[13px]">
                    <THead cols={['Business', 'Suburb', 'Score', 'Rating', 'Reviews', 'Date', '']} />
                    <tbody>{[...gbpAudits].map(a => {
                      const sc = scoreGbp(a.data)
                      return (
                        <tr key={a.id} className="hover:bg-[var(--bg3)] transition-colors">
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--t1)' }}>{a.businessName}</td>
                          <TD>{a.suburb}</TD>
                          <TD><Tag color={sc.overall >= 70 ? 'green' : sc.overall >= 40 ? 'amber' : 'red'}>{sc.overall}</Tag></TD>
                          <TD>{a.data.rating ? ` ${a.data.rating}` : ' — '}</TD>
                          <TD>{a.data.reviewCount ?? ' — '}</TD>
                          <TD>{new Date(a.auditedAt).toLocaleDateString('en-AU')}</TD>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                            <div className="flex gap-1.5">
                              <Btn sm onClick={() => setViewingGbp(a)}>View</Btn>
                              <Btn sm onClick={() => exportGbpPdf(a.id)}> PDF</Btn>
                              <Btn sm onClick={() => exportGbpHtml(a.id)}> HTML</Btn>
                              <Btn sm danger onClick={() => { deleteGbpAudit(a.id); refreshGbp() }}>Delete</Btn>
                            </div>
                          </td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {tab === 'competitor' && (
          <>
            {!compReports.length ? <Empty icon="" title="No competitor reports yet" sub="Run a competitor analysis to generate your first intelligence report." /> : (
              <Card>
                <table className="w-full text-[13px]">
                  <THead cols={['Business', 'URL', 'Competitors', 'Date', '']} />
                  <tbody>{[...compReports].reverse().map(r => (
                    <tr key={r.id} className="hover:bg-[var(--bg3)] transition-colors">
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{r.businessName}</td>
                      <TD mono>{r.businessUrl}</TD>
                      <TD>{r.report.profiles.length - 1} competitors</TD>
                      <TD>{new Date(r.date).toLocaleDateString()}</TD>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex gap-1.5">
                          <Btn sm onClick={() => setViewingComp(r)}>View</Btn>
                          <Btn sm onClick={() => exportComp(r.id)}> PDF</Btn>
                          <Btn sm onClick={() => exportCompHTML(r.id)}> HTML</Btn>
                          <Btn sm danger onClick={() => { deleteCompetitorReport(r.id); onRefresh() }}>Delete</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  )
}

//  Settings 
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
          <p className="text-[12px] mb-4" style={{ color: 'var(--t3)' }}>Total should equal 100. Current: <strong style={{ color: total === 100 ? 'var(--green)' : 'var(--red)' }}>{total}</strong></p>
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
          <p className="text-[12px] mb-4 leading-relaxed" style={{ color: 'var(--t3)' }}>Set in <code className="font-mono rounded px-1" style={{ background: 'var(--bg3)' }}>.env.local</code> locally, or <strong>Vercel -> Settings -> Environment Variables</strong>.</p>
          {[{ key: 'ANTHROPIC_API_KEY', desc: 'Claude API key (recommended)', href: 'https://console.anthropic.com' }, { key: 'OPENAI_API_KEY', desc: 'OpenAI API key (alternative)', href: 'https://platform.openai.com' }, { key: 'AI_PROVIDER', desc: "Set to 'anthropic' or 'openai'" }, { key: 'PAGESPEED_API_KEY', desc: 'Google PageSpeed (optional)', href: 'https://console.cloud.google.com' }].map(v => (
            <div key={v.key} className="flex items-center gap-3 mb-2 flex-wrap">
              <code className="font-mono text-[11px] rounded px-1.5 py-0.5 min-w-[180px]" style={{ background: 'var(--bg4)', color: 'var(--accent2)' }}>{v.key}</code>
              <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{v.desc}</span>
              {'href' in v && <a href={v.href} target="_blank" rel="noreferrer" className="text-[12px] ml-auto" style={{ color: 'var(--accent2)' }}>-> Get key</a>}
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
function TheGreatsPage({ projects, onRefresh }: { projects: Project[]; onRefresh: () => void }) {
  const [industry, setIndustry] = useState('')
  const [postcode, setPostcode] = useState('')
  const [suburb, setSuburb] = useState('')
  const [count, setCount] = useState('5')
  const [loading, setLoading] = useState(false)
  const [greats, setGreats] = useState<Great[]>([])
  const [error, setError] = useState('')
  const [stepIdx, setStepIdx] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [targetProject, setTargetProject] = useState('')
  const [added, setAdded] = useState(false)
  const [savedSearches, setSavedSearches] = useState<GreatsSearch[]>(() => getGreatsSearches())
  const STEPS = ['Scanning local market...', 'Finding top performers...', 'Checking online presence...', 'Scoring websites...', 'Ranking by strength...']

  const run = async () => {
    if (!industry || !postcode) { alert('Please enter both an industry and a postcode'); return }
    setLoading(true); setError(''); setGreats([]); setSelected([]); setAdded(false); setStepIdx(0)
    const timer = setInterval(() => setStepIdx(s => s < STEPS.length - 1 ? s + 1 : s), 2800)
    try {
      const resp = await fetch('/api/greats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industry, postcode, suburb, count }) })
      const data = await resp.json() as { success: boolean; greats?: Record<string, unknown>[]; error?: string }
      clearInterval(timer)
      if (!data.success) throw new Error(data.error || 'Search failed')
      const results: Great[] = (data.greats || []).map((g: Record<string, unknown>) => ({
        businessName: String(g.businessName || ''),
        website: String(g.website || ''),
        overallScore: Number(g.overallScore || 0),
        categories: (g.categories as Record<string, number>) || { seo: 0, ux: 0, conversion: 0, mobile: 0, content: 0, brand: 0 },
        reviewCount: Number(g.reviewCount || 0),
        reviewRating: Number(g.reviewRating || 0),
        strengthScore: Number(g.strengthScore || 0),
        whyTheyRank: String(g.whyTheyRank || ''),
        strengths: Array.isArray(g.strengths) ? (g.strengths as string[]) : [],
        keyTactics: Array.isArray(g.keyTactics) ? (g.keyTactics as string[]) : [],
      }))
      const search: GreatsSearch = { id: Date.now().toString(), industry, postcode, suburb: suburb || '', searchedAt: new Date().toISOString(), greats: results }
      saveGreatsSearch(search); setSavedSearches(getGreatsSearches()); setGreats(results)
    } catch(e) { clearInterval(timer); setError(e instanceof Error ? e.message : 'Something went wrong') }
    finally { setLoading(false) }
  }

  const toggleSelect = (i: number) => { setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]); setAdded(false) }

  const addToProject = () => {
    if (!targetProject || selected.length === 0) return
    const proj = projects.find(p => p.id === targetProject); if (!proj) return
    const toAdd = selected.map(i => greats[i]).filter((g): g is Great => !!g)
    const newComps: Competitor[] = [...(proj.competitors || [])]
    toAdd.forEach(g => { if (!newComps.find(c => c.url === g.website)) newComps.push({ name: g.businessName, url: g.website }) })
    updateProject({ ...proj, competitors: newComps }); onRefresh(); setAdded(true); setSelected([])
    setTimeout(() => setAdded(false), 3000)
  }

  const scCol = (n: number) => n >= 75 ? 'var(--green)' : n >= 50 ? 'var(--accent)' : 'var(--red)'
  const CAT_KEYS = ['seo', 'ux', 'conversion', 'mobile', 'content', 'brand']



  return (
    <>
      <TopBar title="The Greats" sub="Find the best businesses in any market - steal their playbook" />
      <div className="flex-1 overflow-y-auto p-6" style={{ paddingBottom: selected.length > 0 ? 88 : 24 }}>
        <Card>
          <CTitle>Find top performers</CTitle>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Lbl>Keyword *</Lbl><input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. web design, plumber, dentist" className="inp w-full" /></div>
            <div><Lbl>Postcode *</Lbl><input value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="e.g. 3000" maxLength={4} className="inp w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><Lbl>Suburb (optional)</Lbl><input value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="e.g. Albury, New South Wales" className="inp w-full" /></div>
            <div><Lbl>Results</Lbl><select value={count} onChange={e => setCount(e.target.value)} className="inp w-full"><option value="3">3 businesses</option><option value="5">5 businesses</option><option value="8">8 businesses</option></select></div>
          </div>
          <Btn primary onClick={run} disabled={loading}>{loading ? 'Searching...' : 'Find The Greats'}</Btn>
        </Card>

        {savedSearches.length > 0 && greats.length === 0 && !loading && (
          <Card>
            <CTitle>Previous searches</CTitle>
            <div className="flex flex-col gap-2 mt-2">
              {savedSearches.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{s.industry} / {s.postcode}{s.suburb ? ' / ' + s.suburb : ''}</div>
                    <div className="text-[11px]" style={{ color: 'var(--t3)' }}>{s.greats.length} businesses / {new Date(s.searchedAt).toLocaleDateString('en-AU')}</div>
                  </div>
                  <Btn sm onClick={() => { setGreats(s.greats); setSelected([]) }}>Load</Btn>
                  <Btn sm danger onClick={() => { deleteGreatsSearch(s.id); setSavedSearches(getGreatsSearches()) }}>X</Btn>
                </div>
              ))}
            </div>
          </Card>
        )}

        {loading && (
          <Card>
            <div className="flex flex-col items-center py-6 gap-4">
              <Spinner />
              <div className="text-[13px]" style={{ color: 'var(--t2)' }}>{STEPS[stepIdx]}...</div>
              <div className="flex flex-col gap-1.5">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-2 text-[12px]" style={{ color: i <= stepIdx ? 'var(--t2)' : 'var(--t3)' }}>
                    <span className={'w-1.5 h-1.5 rounded-full ' + (i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-yellow-400' : 'bg-zinc-700')} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {error && <Card><p className="text-[13px]" style={{ color: 'var(--red)' }}>{error}</p></Card>}

        {greats.length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="text-[12px]" style={{ color: 'var(--t3)' }}>
                {selected.length > 0
                  ? <span style={{ color: 'var(--accent)' }}>{selected.length} selected - pick a project below</span>
                  : 'Click cards to select, then add as competitors to a project'}
              </div>
              <Btn sm onClick={() => selected.length === greats.length ? setSelected([]) : setSelected(greats.map((_, i) => i))}>
                {selected.length === greats.length ? 'Deselect all' : 'Select all'}
              </Btn>
            </div>
            {greats.map((g, i) => {
              const isSel = selected.includes(i)
              return (
                <Card key={i} cls={isSel ? 'ring-2 ring-[var(--accent)]' : ''}>
                  <div className="flex items-center gap-3 mb-2" onClick={() => toggleSelect(i)} style={{ cursor: 'pointer' }}>
                    <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: isSel ? 'var(--accent)' : 'var(--t3)', background: isSel ? 'var(--accent)' : 'transparent' }}>
                      {isSel && <span className="text-[11px] font-bold" style={{ color: '#0f0f11' }}>+</span>}
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold" style={{ color: 'var(--t1)' }}>{g.businessName}</div>
                      <div className="text-[11px]" style={{ color: 'var(--t3)' }}>{g.website}</div>
                    </div>
                    <div className="text-[24px] font-bold" style={{ color: scCol(g.overallScore) }}>{g.overallScore}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {CAT_KEYS.map(k => (
                      <div key={k}>
                        <div className="text-[10px] mb-1" style={{ color: 'var(--t3)' }}>{k.charAt(0).toUpperCase() + k.slice(1)}</div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div className="h-full rounded-full" style={{ width: (g.categories[k] || 0) + '%', background: scCol(g.categories[k] || 0) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {g.reviewCount > 0 && <div className="text-[11px] mb-2" style={{ color: 'var(--t3)' }}>{g.reviewRating} stars / {g.reviewCount} reviews</div>}
                  <p className="text-[12px] mb-2 pl-3" style={{ color: 'var(--accent)', borderLeft: '2px solid var(--accent)' }}>{g.whyTheyRank}</p>
                  {g.strengths.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Why they rank</div>
                      {g.strengths.map((s, j) => <div key={j} className="text-[12px] py-0.5" style={{ color: 'var(--t2)' }}>+ {s}</div>)}
                    </div>
                  )}
                  {g.keyTactics.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--t3)' }}>Tactics to borrow</div>
                      {g.keyTactics.map((t, j) => <div key={j} className="text-[12px] py-0.5" style={{ color: 'var(--t2)' }}>{'-> '}{t}</div>)}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-0 left-[230px] right-0 px-6 py-4 border-t flex items-center gap-3" style={{ background: 'var(--bg2)', borderColor: 'var(--accent)', borderTopWidth: 2, zIndex: 50 }}>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{selected.length} business{selected.length !== 1 ? 'es' : ''} selected</div>
          <div className="flex-1">
            <select value={targetProject} onChange={e => setTargetProject(e.target.value)} className="inp w-full max-w-xs">
              <option value="">Add to project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Btn primary onClick={addToProject} disabled={!targetProject}>{added ? 'Added!' : 'Add as competitors'}</Btn>
          <Btn onClick={() => setSelected([])}>Cancel</Btn>
        </div>
      )}
    </>
  )
}
