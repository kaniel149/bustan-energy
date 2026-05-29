import { useEffect, useMemo, useState } from 'react'
import { useBustanStore } from '../../lib/bustan-store'
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
  const d = useTranslation().t.crm.dash
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
    return { total: leads.length, byStage, byPriority, byReach, pipelineKwp, pipelineValue, winRate, topAreas }
  }, [leadsById])

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

      {/* Funnel */}
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
