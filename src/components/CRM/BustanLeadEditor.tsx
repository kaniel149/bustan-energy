import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Lock, Loader2, Phone, FileText, ClipboardCheck, Activity } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { useBustanStore } from '../../lib/bustan-store'
import { useToastStore } from '../../lib/toast-store'
import { can } from '../../lib/bustan-permissions'
import {
  updateLeadStage,
  assignLead,
  updateLeadPipeline,
  fetchSurvey,
  upsertSurvey,
  fetchOmSite,
  upsertOmSite,
  type SiteSurvey,
  type OmSite,
  type WriteResult,
} from '../../lib/bustan-crm-service'
import { autoBuildSystem } from '../../lib/bom'
import { CRM_PIPELINE_STAGES } from '../../lib/owner-decision-layer'

const thb = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`
const inputCls =
  'w-full bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white disabled:opacity-50'

const emptySurvey = (id: string): SiteSurvey => ({
  property_id: id,
  roof_photos: false,
  pea_bill: false,
  battery_space: false,
  shading: '',
  access: '',
  main_board: '',
  notes: '',
  recommendation: '',
})

const emptyOm = (id: string): OmSite => ({
  property_id: id,
  commissioned_at: null,
  monitoring_status: '',
  last_reading_kwh: null,
  performance_ratio: null,
  next_maintenance: null,
  notes: '',
})

/**
 * Full work panel for the selected Bustan lead: CRM fields, auto-BOM quote,
 * site survey, and (when won) O&M. Each section is role-gated; writes surface
 * toasts and never swallow errors.
 */
export function BustanLeadEditor() {
  const selected = useAppStore((s) => s.selectedProperty)
  const lead = useBustanStore((s) => (selected ? s.leadsById[selected.id] : undefined))
  const role = useBustanStore((s) => s.role)
  const patchCrm = useBustanStore((s) => s.patchCrm)
  const showToast = useToastStore((s) => s.showToast)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'crm' | 'quote' | 'survey' | 'om'>('crm')

  const propertyId = selected?.id ?? ''
  const [survey, setSurvey] = useState<SiteSurvey>(emptySurvey(propertyId))
  const [om, setOm] = useState<OmSite>(emptyOm(propertyId))

  useEffect(() => {
    if (!propertyId) return
    let cancelled = false
    setSurvey(emptySurvey(propertyId))
    setOm(emptyOm(propertyId))
    void fetchSurvey(propertyId).then((s) => !cancelled && s && setSurvey(s))
    void fetchOmSite(propertyId).then((o) => !cancelled && o && setOm(o))
    return () => {
      cancelled = true
    }
  }, [propertyId])

  const quote = useMemo(() => autoBuildSystem(lead?.crm.estimated_kWp ?? 0), [lead?.crm.estimated_kWp])

  if (!selected || !lead) return null

  const { crm } = lead
  const data = (lead.owner?.data ?? {}) as Record<string, unknown>
  const phone = typeof data.decisionMakerPhone === 'string' ? data.decisionMakerPhone : ''
  const canCrm = can(role, 'crm.edit')
  const canQuote = can(role, 'crm.quote')
  const canSurvey = can(role, 'survey.edit')
  const canOm = can(role, 'om.edit')
  const isWon = crm.crm_stage === 'won'

  const runWrite = async (
    fn: () => Promise<WriteResult>,
    allowed: boolean,
    onOk: () => void,
    successMsg: string,
  ) => {
    if (!allowed) {
      showToast('Your role cannot perform this action', 'info')
      return
    }
    setSaving(true)
    const res = await fn()
    setSaving(false)
    if (res.ok) {
      onOk()
      showToast(successMsg, 'success')
    } else {
      showToast(res.error || 'Save failed', 'error')
    }
  }

  const tabs: { key: typeof tab; label: string; icon: ReactNode; show: boolean }[] = [
    { key: 'crm', label: 'CRM', icon: <ClipboardCheck size={12} />, show: true },
    { key: 'quote', label: 'Quote', icon: <FileText size={12} />, show: canQuote },
    { key: 'survey', label: 'Survey', icon: <ClipboardCheck size={12} />, show: true },
    { key: 'om', label: 'O&M', icon: <Activity size={12} />, show: isWon },
  ]

  return (
    <div className="absolute top-4 right-4 z-30 w-[320px] max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0A1929]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white truncate">{selected.title}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
          {crm.priority} · {crm.reachability}
        </span>
      </div>
      <div className="text-[11px] text-white/50">
        Lead score <span className="text-white/80 font-medium">{crm.lead_score}</span> ·{' '}
        {crm.estimated_kWp} kWp · {thb(crm.estimated_annual_thb)}/yr
      </div>
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200">
          <Phone size={12} /> {phone}
        </a>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-2">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] ${
              tab === t.key ? 'bg-[#6366f1]/20 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'crm' && (
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-wide text-white/40">Stage</label>
          <select
            value={crm.crm_stage}
            disabled={!canCrm || saving}
            onChange={(e) => {
              const stage = e.target.value
              void runWrite(
                () => updateLeadStage(selected.id, stage),
                canCrm,
                () => patchCrm(selected.id, { crm_stage: stage as typeof crm.crm_stage }),
                `Stage → ${stage}`,
              )
            }}
            className={inputCls}
          >
            {CRM_PIPELINE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <label className="block text-[10px] uppercase tracking-wide text-white/40">Assigned to</label>
          <input
            type="text"
            defaultValue={crm.assigned_to}
            disabled={!canCrm || saving}
            placeholder="unassigned"
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === (crm.assigned_to || '')) return
              void runWrite(
                () => assignLead(selected.id, v || null),
                canCrm,
                () => patchCrm(selected.id, { assigned_to: v }),
                v ? `Assigned to ${v}` : 'Unassigned',
              )
            }}
            className={inputCls}
          />

          <label className="block text-[10px] uppercase tracking-wide text-white/40">Next action</label>
          <input
            type="text"
            defaultValue={crm.next_action}
            disabled={!canCrm || saving}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v === (crm.next_action || '')) return
              void runWrite(
                () => updateLeadPipeline(selected.id, { next_action: v }),
                canCrm,
                () => patchCrm(selected.id, { next_action: v }),
                'Next action saved',
              )
            }}
            className={inputCls}
          />
          {!canCrm && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Lock size={11} /> Read-only ({role})
            </p>
          )}
        </div>
      )}

      {tab === 'quote' && canQuote && (
        <div className="space-y-2 text-xs">
          <p className="text-white/60">
            {quote.kWp} kWp · {quote.panels} panels · {quote.inverterUnits} inverter(s)
          </p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
            {quote.lines.map((l) => (
              <div key={l.product.sku} className="flex justify-between gap-2 px-2 py-1">
                <span className="text-white/70 truncate">
                  {l.qty}× {l.product.name}
                </span>
                <span className="text-white/50 shrink-0">{thb(l.product.cost_thb * l.qty)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-white/70">
            <div className="flex justify-between">
              <span>Equipment</span>
              <span>{thb(quote.equipmentCostThb)}</span>
            </div>
            <div className="flex justify-between">
              <span>Labor (฿4,500/kWp)</span>
              <span>{thb(quote.laborCostThb)}</span>
            </div>
            <div className="flex justify-between font-semibold text-white border-t border-white/10 pt-1">
              <span>Total (cost)</span>
              <span>{thb(quote.equipmentCostThb + quote.laborCostThb)}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'survey' && (
        <div className="space-y-2 text-xs">
          {(['roof_photos', 'pea_bill', 'battery_space'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={survey[k]}
                disabled={!canSurvey || saving}
                onChange={(e) => setSurvey({ ...survey, [k]: e.target.checked })}
              />
              {k.replace('_', ' ')}
            </label>
          ))}
          {(['shading', 'access', 'main_board', 'notes'] as const).map((k) => (
            <input
              key={k}
              type="text"
              value={survey[k]}
              disabled={!canSurvey || saving}
              placeholder={k.replace('_', ' ')}
              onChange={(e) => setSurvey({ ...survey, [k]: e.target.value })}
              className={inputCls}
            />
          ))}
          <select
            value={survey.recommendation}
            disabled={!canSurvey || saving}
            onChange={(e) => setSurvey({ ...survey, recommendation: e.target.value as SiteSurvey['recommendation'] })}
            className={inputCls}
          >
            <option value="">recommendation…</option>
            <option value="go">Go</option>
            <option value="maybe">Maybe</option>
            <option value="no-go">No-go</option>
          </select>
          <button
            disabled={!canSurvey || saving}
            onClick={() => void runWrite(() => upsertSurvey(survey), canSurvey, () => {}, 'Survey saved')}
            className="w-full bg-[#6366f1] hover:bg-[#6366f1]/80 disabled:opacity-40 rounded-lg py-1.5 text-white text-sm"
          >
            Save survey
          </button>
          {!canSurvey && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Lock size={11} /> Read-only ({role})
            </p>
          )}
        </div>
      )}

      {tab === 'om' && isWon && (
        <div className="space-y-2 text-xs">
          <select
            value={om.monitoring_status}
            disabled={!canOm || saving}
            onChange={(e) => setOm({ ...om, monitoring_status: e.target.value as OmSite['monitoring_status'] })}
            className={inputCls}
          >
            <option value="">monitoring status…</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="alert">Alert</option>
          </select>
          <input
            type="number"
            value={om.last_reading_kwh ?? ''}
            disabled={!canOm || saving}
            placeholder="last reading kWh"
            onChange={(e) => setOm({ ...om, last_reading_kwh: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="number"
            step="0.01"
            value={om.performance_ratio ?? ''}
            disabled={!canOm || saving}
            placeholder="performance ratio"
            onChange={(e) => setOm({ ...om, performance_ratio: e.target.value === '' ? null : Number(e.target.value) })}
            className={inputCls}
          />
          <input
            type="text"
            value={om.notes}
            disabled={!canOm || saving}
            placeholder="notes"
            onChange={(e) => setOm({ ...om, notes: e.target.value })}
            className={inputCls}
          />
          <button
            disabled={!canOm || saving}
            onClick={() => void runWrite(() => upsertOmSite(om), canOm, () => {}, 'O&M saved')}
            className="w-full bg-[#6366f1] hover:bg-[#6366f1]/80 disabled:opacity-40 rounded-lg py-1.5 text-white text-sm"
          >
            Save O&M
          </button>
          {!canOm && (
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Lock size={11} /> Read-only ({role})
            </p>
          )}
        </div>
      )}

      {saving && (
        <p className="flex items-center gap-1.5 text-[11px] text-blue-300">
          <Loader2 size={11} className="animate-spin" /> Saving…
        </p>
      )}
    </div>
  )
}
