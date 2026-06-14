/**
 * CandidateSidebarSection — rendered at the TOP of PropertySidebar when the
 * selected property is a pending scan candidate (id exists in roofCandidates).
 *
 * Shows: header chip + title + area/kWp/priority + tier/PV badges.
 * Actions: Approve (green), Reject (red → opens RejectReasonMenu), Edit area.
 * Gated behind can(role, 'crm.edit').
 *
 * On Approve:
 *   setScanCandidateStatus(id,'added') → confirmDetectedRoof → promote to
 *   properties, removeRoofCandidate, incrementApprovedToday, close sidebar, toast.
 *
 * On Reject (with reason):
 *   rejectScanCandidate(id, reason) → removeRoofCandidate, close sidebar, toast.
 */
import { useState, useCallback } from 'react'
import { Check, X, MapPin, Zap, Pencil, Loader2 } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { useBustanStore } from '../../lib/bustan-store'
import { can } from '../../lib/bustan-permissions'
import {
  setScanCandidateStatus,
  confirmDetectedRoof,
  rejectScanCandidate,
  updateScanCandidateArea,
} from '../../lib/bustan-crm-service'
import type { RejectionReason } from '../../lib/bustan-crm-service'
import { useToastStore } from '../../lib/toast-store'
import { triggerFindContact } from '../../lib/trigger-find-contact'
import { RejectReasonMenu } from '../Candidates/RejectReasonMenu'
import { rejectionLabel } from '../../lib/rejection-reason-label'
import type { Property } from '../../types'

const TIER_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  farm:       { bg: 'bg-[#E8A820]/20',  text: 'text-[#E8A820]',  label: 'Farm' },
  utility:    { bg: 'bg-purple-500/20', text: 'text-purple-300',  label: 'Utility' },
  commercial: { bg: 'bg-blue-500/20',   text: 'text-blue-300',    label: 'Commercial' },
}

const PRIORITY_COLORS: Record<string, string> = {
  A: 'text-emerald-400', B: 'text-amber-400', C: 'text-orange-400', D: 'text-red-400',
}

interface Props {
  candidate: Property
}

export function CandidateSidebarSection({ candidate: c }: Props) {
  const removeRoofCandidate = useAppStore((s) => s.removeRoofCandidate)
  const updateRoofCandidate = useAppStore((s) => s.updateRoofCandidate)
  const setProperties = useAppStore((s) => s.setProperties)
  const setSelectedProperty = useAppStore((s) => s.setSelectedProperty)
  const setReviewCandidate = useAppStore((s) => s.setReviewCandidate)
  const incrementApprovedToday = useAppStore((s) => s.incrementApprovedToday)
  const role = useBustanStore((s) => s.role)
  const canEdit = can(role, 'crm.edit')
  const showToast = useToastStore((s) => s.showToast)

  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showReasonMenu, setShowReasonMenu] = useState(false)

  // Edit-area state
  const isLand = c.type === 'land'
  const canEditArea = canEdit && !isLand
  const [editingArea, setEditingArea] = useState(false)
  const [areaDraft, setAreaDraft] = useState('')
  const [savingArea, setSavingArea] = useState(false)

  const dismiss = useCallback(() => {
    setSelectedProperty(null)
    setReviewCandidate(null)
  }, [setSelectedProperty, setReviewCandidate])

  const handleApprove = useCallback(async () => {
    if (!canEdit) return
    setApproving(true)
    try {
      await setScanCandidateStatus(c.id, 'added')
      const res = await confirmDetectedRoof(c)
      if (!res.ok) { showToast(res.error ?? 'Failed to approve', 'error'); return }
      const promoted = { ...c, id: res.id ?? c.id }
      setProperties([...useAppStore.getState().properties, promoted])
      removeRoofCandidate(c.id)
      incrementApprovedToday()
      triggerFindContact(promoted)   // auto-start owner / decision-maker discovery
      dismiss()
      showToast('Lead added — searching for contact…', 'success')
    } catch {
      showToast('Failed to approve candidate', 'error')
    } finally {
      setApproving(false)
    }
  }, [c, canEdit, removeRoofCandidate, setProperties, incrementApprovedToday, dismiss, showToast])

  const handleRejectPick = useCallback(async (reason: RejectionReason) => {
    setShowReasonMenu(false)
    setRejecting(true)
    try {
      const res = await rejectScanCandidate(c.id, reason)
      if (!res.ok) { showToast(res.error ?? 'Failed to reject', 'error'); return }
      removeRoofCandidate(c.id)
      dismiss()
      showToast(`Rejected: ${rejectionLabel(reason)}`, 'info')
    } catch {
      showToast('Failed to reject candidate', 'error')
    } finally {
      setRejecting(false)
    }
  }, [c, removeRoofCandidate, dismiss, showToast])

  const beginEditArea = () => {
    setAreaDraft(c.area ? String(Math.round(c.area)) : '')
    setEditingArea(true)
  }

  const commitArea = async () => {
    const v = Math.round(Number(areaDraft))
    if (!Number.isFinite(v) || v <= 0) { setEditingArea(false); return }
    if (c.area && Math.round(c.area) === v) { setEditingArea(false); return }
    setSavingArea(true)
    try {
      const res = await updateScanCandidateArea(c.id, v)
      if (!res.ok) { showToast(res.error ?? 'Failed to update area', 'error'); return }
      updateRoofCandidate(c.id, {
        area: res.areaSqm ?? v,
        capacityKwp: res.kwp ?? c.capacityKwp,
        priority: res.priority ?? c.priority,
      })
      showToast(`Area updated → ${res.kwp != null ? `${Math.round(res.kwp)} kWp` : 'recomputed'}`, 'success')
    } finally {
      setSavingArea(false)
      setEditingArea(false)
    }
  }

  // Derived display values
  const kwp = c.capacityKwp ?? 0
  const capacityLabel = c.type === 'land' && kwp >= 1000
    ? `${(kwp / 1000).toFixed(1)} MWp`
    : kwp > 0 ? `${kwp.toFixed(0)} kWp` : null

  const areaLabel = c.type === 'land'
    ? c.sizeRai != null
      ? `${c.sizeRai.toFixed(1)} rai`
      : c.sizeM2
      ? `${(c.sizeM2 / 1600).toFixed(1)} rai`
      : null
    : c.area ? `${Math.round(c.area).toLocaleString()} m²` : null

  const tier = c.tier ? TIER_STYLE[c.tier] : null
  const priorityColor = c.priority ? PRIORITY_COLORS[c.priority] : null
  const hasPv = c.existingSolar === true

  const working = approving || rejecting

  return (
    <div className="border-b border-white/10 bg-[#0A1628]/40 p-4 space-y-3">
      {/* Header chip */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8A820]/15 text-[#E8A820] border border-[#E8A820]/30 flex items-center gap-1">
          🏠 Pending review
        </span>
        {hasPv && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25">
            ☀️ has PV
          </span>
        )}
        {tier && (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border border-white/10 ${tier.bg} ${tier.text}`}>
            {tier.label}
          </span>
        )}
      </div>

      {/* Title + metrics */}
      <div>
        <p className="text-white font-semibold text-sm mb-1">{c.title}</p>
        <div className="flex flex-wrap items-center gap-3">
          {areaLabel && (
            <span className="text-[11px] text-white/50 flex items-center gap-1">
              <MapPin size={10} className="shrink-0" />
              {areaLabel}
            </span>
          )}
          {capacityLabel && (
            <span className="text-[11px] text-[#E8A820] flex items-center gap-1">
              <Zap size={10} className="shrink-0" />
              {capacityLabel}
            </span>
          )}
          {c.priority && (
            <span className={`text-[11px] font-semibold ${priorityColor ?? 'text-white/50'}`}>
              Grade {c.priority}
            </span>
          )}
        </div>
      </div>

      {/* Edit area — roof only */}
      {canEditArea && (
        <div className="flex items-center gap-2">
          {editingArea ? (
            <div className="flex items-center gap-1.5 flex-1">
              <MapPin size={10} className="text-white/40 shrink-0" />
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={areaDraft}
                disabled={savingArea}
                onChange={(e) => setAreaDraft(e.target.value)}
                onBlur={commitArea}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void commitArea() }
                  if (e.key === 'Escape') { e.preventDefault(); setEditingArea(false) }
                }}
                className="w-20 bg-white/10 border border-[#E8A820]/50 rounded px-2 py-1 text-xs text-white outline-none focus:border-[#E8A820]"
              />
              <span className="text-[10px] text-white/40">m²</span>
              {savingArea && <Loader2 size={11} className="animate-spin text-[#E8A820]" />}
            </div>
          ) : (
            <button
              onClick={beginEditArea}
              className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-[#E8A820] transition-colors"
            >
              <Pencil size={11} />
              Edit roof area
            </button>
          )}
        </div>
      )}

      {/* Reject reason menu (shown when showReasonMenu is true) */}
      {showReasonMenu && (
        <div className="pt-1">
          <p className="text-[10px] text-white/40 mb-1.5">Reason for rejection:</p>
          <RejectReasonMenu
            onPick={handleRejectPick}
            onCancel={() => setShowReasonMenu(false)}
          />
        </div>
      )}

      {/* Primary action buttons */}
      {!showReasonMenu && canEdit && (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={working}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2ED89A]/20 border border-[#2ED89A]/40 text-[#2ED89A] text-sm font-semibold hover:bg-[#2ED89A]/30 transition-colors disabled:opacity-50"
          >
            {approving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Approve
          </button>
          <button
            onClick={() => setShowReasonMenu(true)}
            disabled={working}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {rejecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Reject
          </button>
        </div>
      )}

      {!canEdit && (
        <p className="text-[11px] text-white/30 text-center py-1">
          View only — no edit permission
        </p>
      )}
    </div>
  )
}
