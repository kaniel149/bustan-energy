import { useState } from 'react'
import { Lock, Loader2, Phone } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { useBustanStore } from '../../lib/bustan-store'
import { useToastStore } from '../../lib/toast-store'
import { can } from '../../lib/bustan-permissions'
import { updateLeadStage, assignLead, updateLeadPipeline } from '../../lib/bustan-crm-service'
import { CRM_PIPELINE_STAGES } from '../../lib/owner-decision-layer'

/**
 * Compact CRM editor for the currently selected Bustan lead. Role-gated:
 * non-editors see a read-only view. Writes go to bustan.crm_pipeline (the
 * activity_log trigger records the change); errors surface as a toast.
 */
export function BustanLeadEditor() {
  const selected = useAppStore((s) => s.selectedProperty)
  const lead = useBustanStore((s) => (selected ? s.leadsById[selected.id] : undefined))
  const role = useBustanStore((s) => s.role)
  const patchCrm = useBustanStore((s) => s.patchCrm)
  const showToast = useToastStore((s) => s.showToast)
  const [saving, setSaving] = useState(false)

  if (!selected || !lead) return null

  const editable = can(role, 'crm.edit')
  const { crm } = lead
  const data = (lead.owner?.data ?? {}) as Record<string, unknown>
  const phone = typeof data.decisionMakerPhone === 'string' ? data.decisionMakerPhone : ''

  const runWrite = async (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    optimistic: () => void,
    successMsg: string,
  ) => {
    if (!editable) {
      showToast('Your role is read-only', 'info')
      return
    }
    setSaving(true)
    const res = await fn()
    setSaving(false)
    if (res.ok) {
      optimistic()
      showToast(successMsg, 'success')
    } else {
      showToast(res.error || 'Save failed', 'error')
    }
  }

  return (
    <div className="absolute top-4 right-4 z-30 w-[300px] rounded-2xl bg-[#0A1929]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white truncate">{selected.title}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
          {crm.priority} · {crm.reachability}
        </span>
      </div>

      <div className="text-[11px] text-white/50">
        Lead score <span className="text-white/80 font-medium">{crm.lead_score}</span> ·{' '}
        {crm.estimated_kWp} kWp
      </div>

      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-2 text-xs text-emerald-300 hover:text-emerald-200"
        >
          <Phone size={12} /> {phone}
        </a>
      )}

      {/* Stage */}
      <label className="block text-[10px] uppercase tracking-wide text-white/40">Stage</label>
      <select
        value={crm.crm_stage}
        disabled={!editable || saving}
        onChange={(e) => {
          const stage = e.target.value
          void runWrite(
            () => updateLeadStage(selected.id, stage),
            () => patchCrm(selected.id, { crm_stage: stage as typeof crm.crm_stage }),
            `Stage → ${stage}`,
          )
        }}
        className="w-full bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {CRM_PIPELINE_STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Assignee */}
      <label className="block text-[10px] uppercase tracking-wide text-white/40">Assigned to</label>
      <input
        type="text"
        defaultValue={crm.assigned_to}
        disabled={!editable || saving}
        placeholder="unassigned"
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v === (crm.assigned_to || '')) return
          void runWrite(
            () => assignLead(selected.id, v || null),
            () => patchCrm(selected.id, { assigned_to: v }),
            v ? `Assigned to ${v}` : 'Unassigned',
          )
        }}
        className="w-full bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white disabled:opacity-50"
      />

      {/* Next action */}
      <label className="block text-[10px] uppercase tracking-wide text-white/40">Next action</label>
      <input
        type="text"
        defaultValue={crm.next_action}
        disabled={!editable || saving}
        onBlur={(e) => {
          const v = e.target.value.trim()
          if (v === (crm.next_action || '')) return
          void runWrite(
            () => updateLeadPipeline(selected.id, { next_action: v }),
            () => patchCrm(selected.id, { next_action: v }),
            'Next action saved',
          )
        }}
        className="w-full bg-[#0D2137] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white disabled:opacity-50"
      />

      {!editable && (
        <p className="flex items-center gap-1.5 text-[11px] text-white/40">
          <Lock size={11} /> Read-only ({role})
        </p>
      )}
      {saving && (
        <p className="flex items-center gap-1.5 text-[11px] text-blue-300">
          <Loader2 size={11} className="animate-spin" /> Saving…
        </p>
      )}
    </div>
  )
}
