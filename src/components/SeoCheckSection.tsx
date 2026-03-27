'use client'

import { useState, useEffect } from 'react'
import { AuditReport, SeoCategories, LpWeights } from '@/lib/types'
import {
  getSeoChecks, addSeoCheck, deleteSeoCheck, SeoCheckResult,
  getLpWeights, DEFAULT_WEIGHTS,
} from '@/lib/storage'
import { exportHTML } from '@/lib/htmlExport'

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function sc(n: number) { return n >= 70 ? 'var(--green)' : n >= 40 ? 'var(--amber)' : 'var(--red)' }

function Btn({ children, onClick, primary = false, danger = false, sm = false, disabled = false }: { children: React.ReactNode; onClick?: (e?: React.MouseEvent) => void; primary?: boolean; danger?: boolean; sm?: boolean; disabled?: boolean }) {
  const size = sm ? 'px-2.5 py-1 text-[12px]' : 'px-3.5 py-2 text-[13px]'
  const style = primary
    ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] font-bold hover:opacity-90'
    : danger
    ? 'bg-transparent border-[var(--border)] text-[var(--red)] hover:bg-red-400/10'
    : 'bg-[var(--bg3)] border-[var(--border2)] text-[var(--t1)] hover:bg-[var(--bg4)]'
  return <button onClick={onClick} disabled={disabled} className={[
    'inline-flex items-center gap-1.5 font-medium border rounded-lg transition-all',
    size, style,
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
  ].join(' ')}>{children}</button>
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl p-5 mb-4 border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>{children}</div>
}
function CTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] font-semibold mb-3 tracking-wide" style={{ color: 'var(--t2)' }}>{children}</div>
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--t2)' }}>{children}</label>
}
function TopBar({ title, sub }: { title: string; sub: string }) {
  return <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}><div><div className="text-base font-semibold">{title}</div><div className="text-[12px]" style={{ color: 'var(--t3)' }}>{sub}</div></div></div>
}
function Bar({ pct }: { pct: number }) {
  const col = pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  return <div className="h-2 rounded overflow-hidden flex-1" style={{ background: 'var(--bg4)' }}><div className={['h-full rounded transition-all', col].join(' ')} style={{ width: Math.min(100, pct) + '%' }} /></div>
}
function Spinner() {
  return <div className="w-9 h-9 rounded-full border-2 spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
}

const SEO_LABELS: Record<keyof SeoCategories, string> = {
  metaInformation: 'Meta Information',
  pageQuality: 'Page Quality',
  pageStructure: 'Page Structure',
  linkStructure: 'Link Structure',
  serverTechnical: 'Server & Technical',
  externalFactors: 'External Factors',
}

const STEPS = [
  'Fetching page signals',
  'Analysing SEO — 6 categories',
  'Scoring landing page',
  'Evaluating messaging & trust',
  'Competitor gap analysis',
  'Classifying positioning',
  'Building gap analysis',
]

function SeoTabView({ r }: { r: AuditReport }) {
  const cats = Object.keys(r.seoCategories) as (keyof SeoCategories)[]
  return (
    <div>
      <Card>
        <CTitle>SEO Score Overview</CTitle>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {cats.map(function(k) {
            return (
              <div key={k}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px]" style={{ color: 'var(--t2)' }}>{SEO_LABELS[k]}</span>
                  <span className="font-mono text-[13px] font-semibold" style={{ color: sc(r.seoCategories[k].score) }}>{r.seoCategories[k].score}%</span>
                </div>
                <Bar pct={r.seoCategories[k].score} />
              </div>
            )
          })}
        </div>
      </Card>
      {cats.map(function(k) {
        const cat = r.seoCategories[k]
        const passCount = cat.checks.filter(function(c) { return c.status === 'pass' }).length
        return (
          <Card key={k}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[14px] font-semibold">{SEO_LABELS[k]}</div>
              <div className="flex items-center gap-2">
                <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{passCount}/{cat.checks.length} passed</span>
                <span className="font-mono text-[13px] font-semibold px-2 py-0.5 rounded" style={{ color: sc(cat.score), background: sc(cat.score) + '15' }}>{cat.score}%</span>
              </div>
            </div>
            {cat.checks.map(function(c, i) {
              const isPass = c.status === 'pass'
              const isFail = c.status === 'fail'
              const dotCol = isPass ? 'var(--green)' : isFail ? 'var(--red)' : 'var(--amber)'
              const critMap: Record<string, { label: string; cls: string }> = {
                critical: { label: 'Critically important', cls: 'text-red-400' },
                important: { label: 'Important', cls: 'text-yellow-400' },
                somewhat: { label: 'Somewhat important', cls: 'text-blue-400' },
                nice: { label: 'Nice to have', cls: 'text-zinc-500' },
              }
              const crit = critMap[c.criticality] ?? critMap.nice
              return (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: dotCol + '20' }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: dotCol }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold mb-0.5">{c.label}</div>
                    <div className="text-[12px]" style={{ color: 'var(--t3)' }}>{c.detail}</div>
                  </div>
                  <div className={['text-[10px] font-medium flex-shrink-0', crit.cls].join(' ')}>{crit.label}</div>
                </div>
              )
            })}
          </Card>
        )
      })}
    </div>
  )
}

export default function SeoCheckSection() {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [result, setResult] = useState<AuditReport | null>(null)
  const [savedId, setSavedId] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<SeoCheckResult[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [weights, setWeights] = useState<LpWeights>(DEFAULT_WEIGHTS)

  useEffect(function() {
    setHistory(getSeoChecks())
    setWeights(getLpWeights())
  }, [])

  function del(id: string) {
    deleteSeoCheck(id)
    setHistory(getSeoChecks())
    if (expandedId === id) setExpandedId(null)
    if (savedId === id) { setSavedId(''); setResult(null) }
  }

  async function run() {
    if (!url) { alert('Please enter a URL'); return }
    setLoading(true); setError(''); setResult(null); setStepIdx(0)
    const timer = setInterval(function() {
      setStepIdx(function(s) { return s < STEPS.length - 1 ? s + 1 : s })
    }, 1600)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url, label, industry: '', location: '', projectId: '', assignedTo: 'unassigned',
          project: null, competitors: [], existingAuditsCount: 0, lpWeights: weights,
        }),
      })
      const data = await res.json() as { success: boolean; report?: AuditReport; error?: string }
      clearInterval(timer)
      if (!data.success || !data.report) { setError(data.error ?? 'Audit failed'); return }
      const id = uid()
      const check: SeoCheckResult = {
        id, url, label,
        date: new Date().toISOString(),
        score: data.report.scores.seo,
        report: data.report,
      }
      addSeoCheck(check)
      setSavedId(id)
      setHistory(getSeoChecks())
      setResult(data.report)
      setExpandedId(id)
    } catch (e) {
      clearInterval(timer)
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function exportCheck(id: string) {
    const checks = getSeoChecks()
    const check = checks.find(function(c) { return c.id === id })
    if (!check || !check.report) return
    exportHTML(check.report, check.url, check.label)
  }

  return (
    <>
      <TopBar title="SEO Check" sub="Audit any URL — SEO analysis only" />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CTitle>Audit a URL</CTitle>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Lbl>Page URL *</Lbl><input value={url} onChange={function(e) { setUrl(e.target.value) }} type="url" placeholder="https://example.com" className="inp w-full" /></div>
            <div><Lbl>Label (optional)</Lbl><input value={label} onChange={function(e) { setLabel(e.target.value) }} placeholder="e.g. Homepage" className="inp w-full" /></div>
          </div>
          <Btn primary onClick={run} disabled={loading}>{loading ? 'Analysing...' : 'Run SEO Check'}</Btn>
        </Card>

        {loading && (
          <Card>
            <div className="flex flex-col items-center py-6 gap-4">
              <Spinner />
              <div className="text-[13px]" style={{ color: 'var(--t2)' }}>{STEPS[stepIdx]}...</div>
              <div className="flex flex-col gap-1.5">
                {STEPS.map(function(s, i) {
                  return (
                    <div key={s} className="flex items-center gap-2 text-[12px]" style={{ color: i <= stepIdx ? 'var(--t2)' : 'var(--t3)' }}>
                      <span className={['w-1.5 h-1.5 rounded-full', i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-yellow-400 pulse' : ''].join(' ')} style={i > stepIdx ? { background: 'var(--border2)' } : {}} />
                      {s}
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {error && (
          <Card>
            <div className="font-semibold mb-1" style={{ color: 'var(--red)' }}>Audit Failed</div>
            <div style={{ color: 'var(--t3)' }}>{error}</div>
          </Card>
        )}

        {result && expandedId === savedId && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-semibold">{label || url}</div>
                <div className="font-mono text-[12px]" style={{ color: 'var(--accent2)' }}>{url}</div>
              </div>
              <Btn sm onClick={function() { exportCheck(savedId) }}>Export HTML</Btn>
            </div>
            <SeoTabView r={result} />
          </Card>
        )}

        {history.length > 0 && (
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--t3)' }}>Previous Checks</div>
            {history.map(function(h) {
              const isExpanded = expandedId === h.id
              return (
                <div key={h.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                    onClick={function() { setExpandedId(isExpanded ? null : h.id) }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: sc(h.score), minWidth: 42 }}>{h.score}</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)', minWidth: 24 }}>/100</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label || h.url}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{new Date(h.date).toLocaleString('en-AU')}</div>
                    </div>
                    <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, flexShrink: 0 }}>
                      <div style={{ height: 6, borderRadius: 3, background: sc(h.score), width: Math.round(h.score) + '%' }} />
                    </div>
                    <Btn sm onClick={function(e) { if(e) e.stopPropagation(); exportCheck(h.id) }}>Export</Btn>
                    <Btn sm danger onClick={function(e) { if(e) e.stopPropagation(); del(h.id) }}>Delete</Btn>
                    <span style={{ color: 'var(--t3)', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && h.report && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                      <SeoTabView r={h.report} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}