import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBustanStore } from '../../lib/bustan-store'
import { useAppStore } from '../../lib/store'
import { fetchActivityLog, type ActivityRow } from '../../lib/bustan-crm-service'
import { CRM_PIPELINE_STAGES } from '../../lib/owner-decision-layer'
import { useTranslation } from '../../i18n/useTranslation'

const thb = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[#0D2137] border border-white/10 p-4">
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="text-2xl font-semibold text-white mt-1">{value}</p>
      {sub && <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  )
}

/** Live CRM dashboard built from the bustan leads in the store. */
export default function BustanDashboard() {
  const leadsById = useBustanStore((s) => s.leadsById)
  const scanRequests = useAppStore((s) => s.scanRequests)
  const roofCandidates = useAppStore((s) => s.roofCandidates)
  const setPlatformView = useAppStore((s) => s.setPlatformView)
  const d = useTranslation().t.crm.dash
  const navigate = useNavigate()
  const [activity, setActivity] = useState<ActivityRow[]>([])

  useEffect(() => {
    let cancelled = false
    void fetchActivityLog(40).then((rows) => !cancelled && setActivity(rows))
    return () => {
      cancelled = true
    }
  }, [leadsById])

  const m = useMemo(() => {
    const leads = Object.values(leadsById)
    const byStage: Record<string, number> = {}
    const byPriority: Record<string, number> = { A: 0, B: 0, C: 0 }
    const byReach: Record<string, number> = { contactable: 0, partial: 0, cold: 0 }
    const byArea: Record<string, number> = {}
    let pipelineKwp = 0
    let pipelineValue = 0
    for (const l of leads) {
      const c = l.crm
      byStage[c.crm_stage] = (byStage[c.crm_stage] || 0) + 1
      if (byPriority[c.priority] != null) byPriority[c.priority] += 1
      if (byReach[c.reachability] != null) byReach[c.reachability] += 1
      const area = l.property.area_name || 'Unknown'
      byArea[area] = (byArea[area] || 0) + 1
      if (c.crm_stage !== 'lost') {
        pipelineKwp += c.estimated_kWp
        pipelineValue += c.estimated_annual_thb
      }
    }
    const won = byStage.won || 0
    const lost = byStage.lost || 0
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0
    const topAreas = Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Deal-flow funnel counts — maps the full pipeline from raw scans to closed deals.
    //
    // Step 1 — Scans run: total scan_requests in the store (all statuses).
    // Step 2 — Candidates found: pending scan_candidates currently in store.
    // Step 3 — Approved: every lead in leadsById was approved from a candidate
    //          (inserted via confirmDetectedRoof / set_scan_candidate_status='added').
    //          Count = total leads (candidates graduate into leads; the rest stay pending
    //          in scan_candidates and are counted in step 2).
    // Step 4 — Has contact: approved leads where owner data includes a decision-maker
    //          name OR legal-owner name (i.e. research has been done).
    // Step 5 — Proposal sent: leads at stage 'proposal' or 'won' (proposal was built
    //          and the deal is either in negotiation or already closed). The stage alias
    //          'proposal_sent' / 'negotiation' both normalise to 'proposal' in the layer.
    // Step 6 — Signed/Won: leads at stage 'won'.
    const funnelScans = scanRequests.length
    const funnelCandidates = roofCandidates.length
    const funnelApproved = leads.length
    const funnelContact = leads.filter((l) => {
      const ownerName = l.owner?.decision_maker_name || l.owner?.legal_owner_name
      return Boolean(ownerName?.trim())
    }).length
    const funnelProposal = (byStage.proposal || 0) + (byStage.won || 0)
    const funnelSigned = byStage.won || 0

    return {
      total: leads.length, byStage, byPriority, byReach, pipelineKwp, pipelineValue, winRate, topAreas,
      funnelScans, funnelCandidates, funnelApproved, funnelContact, funnelProposal, funnelSigned,
    }
  }, [leadsById, scanRequests, roofCandidates])

  if (m.total === 0) {
    return (
      <div className="p-8 text-center text-white/40 text-sm">{d.noLeads}</div>
    )
  }

  const maxStage = Math.max(...CRM_PIPELINE_STAGES.map((s) => m.byStage[s.key] || 0), 1)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold text-white">{d.title}</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={d.leads} value={String(m.total)} sub={`A ${m.byPriority.A} · B ${m.byPriority.B} · C ${m.byPriority.C}`} />
        <Kpi label={d.pipeline} value={`${Math.round(m.pipelineKwp).toLocaleString()} kWp`} sub={d.nonLost} />
        <Kpi label={d.annualValue} value={thb(m.pipelineValue)} sub={d.savingsYr} />
        <Kpi label={d.winRate} value={`${m.winRate}%`} sub={`${m.byStage.won || 0} ${d.won} · ${m.byStage.lost || 0} ${d.lost}`} />
      </div>

      {/* Deal-flow funnel — Scans → Candidates → Approved → Contact → Proposal → Signed */}
      <DealFlowFunnel m={m} d={d} onCandidatesClick={() => setPlatformView('scanner')} onPipelineClick={() => navigate('/crm/pipeline')} />

      {/* Funnel by stage */}
      <div className="rounded-xl bg-[#0D2137] border border-white/10 p-4">
        <h2 className="text-sm font-medium text-white mb-3">{d.funnel}</h2>
        <div className="space-y-2">
          {CRM_PIPELINE_STAGES.map((s) => {
            const count = m.byStage[s.key] || 0
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-24 text-xs text-white/50 shrink-0">{s.label}</span>
                <div className="flex-1 h-5 bg-white/5 rounded-md overflow-hidden">
                  <div
                    className="h-full bg-[#6366f1]/70 rounded-md transition-all"
                    style={{ width: `${(count / maxStage) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-white/70">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Reachability */}
        <div className="rounded-xl bg-[#0D2137] border border-white/10 p-4">
          <h2 className="text-sm font-medium text-white mb-3">{d.reachability}</h2>
          {(['contactable', 'partial', 'cold'] as const).map((k) => (
            <div key={k} className="flex items-center justify-between text-xs py-1">
              <span className="text-white/60 capitalize">{k}</span>
              <span className="text-white/80">{m.byReach[k]}</span>
            </div>
          ))}
        </div>

        {/* Top areas */}
        <div className="rounded-xl bg-[#0D2137] border border-white/10 p-4">
          <h2 className="text-sm font-medium text-white mb-3">{d.topAreas}</h2>
          {m.topAreas.map(([area, count]) => (
            <div key={area} className="flex items-center justify-between text-xs py-1">
              <span className="text-white/60 truncate">{area}</span>
              <span className="text-white/80 shrink-0 ml-2">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity log */}
      <div className="rounded-xl bg-[#0D2137] border border-white/10 p-4">
        <h2 className="text-sm font-medium text-white mb-3">{d.recentActivity}</h2>
        {activity.length === 0 ? (
          <p className="text-xs text-white/40">{d.noActivity}</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-[11px] text-white/60">
                <span className="text-white/40 w-32 shrink-0">{new Date(a.at).toLocaleString()}</span>
                <span className="text-white/80">{a.action}</span>
                {a.field && (
                  <span className="text-white/50 truncate">
                    {a.field}: {a.old_value ?? '∅'} → {a.new_value ?? '∅'}
                  </span>
                )}
                <span className="text-white/30 truncate ml-auto">{a.property_id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Deal-flow funnel sub-component
// ---------------------------------------------------------------------------

type DashMetrics = {
  funnelScans: number
  funnelCandidates: number
  funnelApproved: number
  funnelContact: number
  funnelProposal: number
  funnelSigned: number
}

type DashTranslations = {
  dealFunnel: string
  funnelScans: string
  funnelCandidates: string
  funnelApproved: string
  funnelContact: string
  funnelProposal: string
  funnelSigned: string
  ofPrev: string
}

function DealFlowFunnel({
  m,
  d,
  onCandidatesClick,
  onPipelineClick,
}: {
  m: DashMetrics
  d: DashTranslations
  onCandidatesClick: () => void
  onPipelineClick: () => void
}) {
  // Each step: label, count, click handler (null = no navigation)
  const steps: Array<{ label: string; count: number; onClick?: () => void }> = [
    { label: d.funnelScans, count: m.funnelScans },
    { label: d.funnelCandidates, count: m.funnelCandidates, onClick: onCandidatesClick },
    { label: d.funnelApproved, count: m.funnelApproved, onClick: onPipelineClick },
    { label: d.funnelContact, count: m.funnelContact, onClick: onPipelineClick },
    { label: d.funnelProposal, count: m.funnelProposal, onClick: onPipelineClick },
    { label: d.funnelSigned, count: m.funnelSigned, onClick: onPipelineClick },
  ]

  // Bar width relative to the first step (always 100%) — tapering funnel.
  const maxCount = Math.max(steps[0].count, 1)

  return (
    <div className="rounded-xl bg-[#0D2137] border border-white/10 p-4">
      <h2 className="text-sm font-medium text-white mb-3">{d.dealFunnel}</h2>
      <div className="space-y-2.5">
        {steps.map((step, i) => {
          const prev = i === 0 ? step.count : steps[i - 1].count
          const pct = prev > 0 ? Math.round((step.count / prev) * 100) : 0
          const barPct = (step.count / maxCount) * 100
          // Gold accent for first/last, teal for middle steps
          const barColor = i === steps.length - 1 ? '#E8A820' : i === 0 ? '#6366f1' : '#2ED89A'
          const Row = (
            <div className={`flex items-center gap-2 sm:gap-3 ${step.onClick ? 'cursor-pointer group' : ''}`}>
              {/* Step index */}
              <span className="w-4 text-[10px] text-white/30 shrink-0 text-right">{i + 1}</span>
              {/* Label */}
              <span className={`w-28 sm:w-32 text-[11px] shrink-0 truncate ${step.onClick ? 'text-white/60 group-hover:text-white/90' : 'text-white/50'} transition-colors`}>
                {step.label}
              </span>
              {/* Bar */}
              <div className="flex-1 h-5 bg-white/5 rounded-md overflow-hidden min-w-0">
                <div
                  className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                  style={{
                    width: `${Math.max(barPct, step.count > 0 ? 6 : 0)}%`,
                    backgroundColor: `${barColor}30`,
                    borderLeft: step.count > 0 ? `2px solid ${barColor}` : 'none',
                  }}
                >
                  {step.count > 0 && (
                    <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: barColor }}>
                      {step.count}
                    </span>
                  )}
                </div>
              </div>
              {/* Conversion % vs previous step */}
              {i > 0 && (
                <span className={`w-10 text-right text-[10px] shrink-0 ${pct >= 50 ? 'text-[#2ED89A]' : pct >= 20 ? 'text-[#E8A820]' : 'text-white/30'}`}>
                  {pct}%
                </span>
              )}
              {i === 0 && <span className="w-10" />}
            </div>
          )
          if (step.onClick) {
            return (
              <button key={step.label} onClick={step.onClick} className="w-full text-left">
                {Row}
              </button>
            )
          }
          return <div key={step.label}>{Row}</div>
        })}
      </div>
      <p className="text-[9px] text-white/25 mt-2 text-right">{d.ofPrev}</p>
    </div>
  )
}
