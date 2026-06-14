/**
 * CandidateReviewPanel — fast triage UI for pending scan candidates.
 *
 * Desktop: draggable FloatingPanel (right of map).
 * Mobile:  bottom sheet (slides up from bottom, above MobileBottomNav).
 *          FloatingPanel is bypassed via mobileBehavior="passthrough" so the
 *          existing bottom-sheet markup is preserved.
 *
 * Existing-PV features:
 *   - Rows with existingSolar=true show an amber "☀️ has PV" badge and are
 *     dimmed. When solar_checked_at is null a subtle "⏳ PV check pending"
 *     hint is shown instead.
 *   - "Hide existing PV" toggle in the panel header (default ON) filters them out.
 *     The count of hidden rows is displayed: "N hidden (existing PV)".
 *
 * Uses existing service calls — no new backend surface:
 *   setScanCandidateStatus  → marks 'added' | 'rejected' in scan_candidates
 *   confirmDetectedRoof     → inserts property row (called after marking 'added')
 *   setReviewCandidate      → focuses the map overlay on the selected candidate
 */
import { useState, useMemo, useCallback } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { Check, X, ChevronDown, ChevronUp, MapPin, Zap, Loader2, Eye, EyeOff, Pencil } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { useBustanStore } from '../../lib/bustan-store'
import { can } from '../../lib/bustan-permissions'
import {
  setScanCandidateStatus,
  confirmDetectedRoof,
  updateScanCandidateArea,
} from '../../lib/bustan-crm-service'
import { useToastStore } from '../../lib/toast-store'
import { FloatingPanel } from '../ui/FloatingPanel'
import type { Property } from '../../types'

// ── Tier badge config ────────────────────────────────────────────────────────
const TIER_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  farm:       { bg: 'bg-[#E8A820]/20',  text: 'text-[#E8A820]',  label: 'Farm' },
  utility:    { bg: 'bg-purple-500/20', text: 'text-purple-300',  label: 'Utility' },
  commercial: { bg: 'bg-blue-500/20',   text: 'text-blue-300',    label: 'Commercial' },
}

// ── Row component ─────────────────────────────────────────────────────────────
interface RowProps {
  candidate: Property
  selected: boolean
  working: boolean
  canEdit: boolean
  onSelect: (id: string) => void
  onFocus: (c: Property) => void
  onApprove: (c: Property) => void
  onReject: (c: Property) => void
  onEditArea: (c: Property, areaSqm: number) => Promise<void>
}

function CandidateRow({ candidate: c, selected, working, canEdit, onSelect, onFocus, onApprove, onReject, onEditArea }: RowProps) {
  const isLand = c.type === 'land'
  const kwp = c.capacityKwp ?? 0
  const capacityLabel = isLand && kwp >= 1000
    ? `${(kwp / 1000).toFixed(1)} MWp`
    : kwp > 0 ? `${kwp.toFixed(0)} kWp` : '—'

  const areaLabel = isLand
    ? c.sizeRai != null ? `${c.sizeRai.toFixed(1)} rai` : c.sizeM2 ? `${(c.sizeM2 / 1600).toFixed(1)} rai` : ''
    : c.area ? `${Math.round(c.area).toLocaleString()} m²` : ''

  // Inline roof-area edit (roof candidates only — the detected footprint is
  // sometimes wrong; reviewer corrects it and kWp/priority recompute server-side).
  const canEditArea = canEdit && !isLand
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const beginEdit = (e: ReactMouseEvent) => {
    e.stopPropagation()
    setDraft(c.area ? String(Math.round(c.area)) : '')
    setEditing(true)
  }
  const commitEdit = async () => {
    const v = Math.round(Number(draft))
    if (!Number.isFinite(v) || v <= 0) { setEditing(false); return }
    if (c.area && Math.round(c.area) === v) { setEditing(false); return }
    setSaving(true)
    await onEditArea(c, v)
    setSaving(false)
    setEditing(false)
  }

  const tier = c.tier ? TIER_STYLE[c.tier] : null
  const hasPv = c.existingSolar === true
  const pvPending = c.existingSolar === undefined && c.solarCheckedAt === undefined

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 border-b border-white/5 transition-colors ${
        selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
      } ${hasPv ? 'opacity-60' : ''}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onSelect(c.id)}
        className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
          selected
            ? 'bg-[#E8A820] border-[#E8A820]'
            : 'border-white/20 hover:border-white/40'
        }`}
        aria-label={selected ? 'Deselect' : 'Select'}
      >
        {selected && <Check size={10} className="text-black" />}
      </button>

      {/* Main info — clicking focuses the map */}
      <button
        onClick={() => onFocus(c)}
        className="flex-1 min-w-0 text-left"
        disabled={working}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="text-xs shrink-0">{isLand ? '🌾' : '🏠'}</span>
          <span className="text-xs text-white truncate max-w-[100px]">{c.title}</span>
          {tier && (
            <span className={`shrink-0 px-1 py-0.5 rounded text-[8px] font-bold ${tier.bg} ${tier.text}`}>
              {tier.label}
            </span>
          )}
          {hasPv && (
            <span className="shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ☀️ has PV
            </span>
          )}
          {!hasPv && pvPending && (
            <span className="shrink-0 text-[8px] text-white/25 italic">⏳ PV check pending</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {editing ? (
            <span
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MapPin size={8} className="shrink-0 text-white/40" />
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={draft}
                disabled={saving}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                  if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
                }}
                className="w-16 bg-white/10 border border-[#E8A820]/50 rounded px-1 py-0.5 text-[10px] text-white outline-none focus:border-[#E8A820]"
              />
              <span className="text-[9px] text-white/40">m²</span>
              {saving && <Loader2 size={9} className="animate-spin text-[#E8A820]" />}
            </span>
          ) : (
            areaLabel && (
              <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                <MapPin size={8} className="shrink-0" />
                {areaLabel}
                {canEditArea && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={beginEdit}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === 'Enter') beginEdit(e as unknown as ReactMouseEvent) }}
                    className="ml-0.5 text-white/30 hover:text-[#E8A820] transition-colors cursor-pointer"
                    title="Edit roof area"
                    aria-label="Edit roof area"
                  >
                    <Pencil size={8} />
                  </span>
                )}
              </span>
            )
          )}
          {capacityLabel !== '—' && (
            <span className="text-[10px] text-[#E8A820] flex items-center gap-0.5">
              <Zap size={8} className="shrink-0" />
              {capacityLabel}
            </span>
          )}
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {working ? (
          <Loader2 size={14} className="animate-spin text-white/40" />
        ) : (
          <>
            <button
              onClick={() => onApprove(c)}
              className="w-7 h-7 rounded-lg bg-[#2ED89A]/15 border border-[#2ED89A]/30 text-[#2ED89A] flex items-center justify-center hover:bg-[#2ED89A]/25 transition-colors"
              title="Approve — add as lead"
            >
              <Check size={12} />
            </button>
            <button
              onClick={() => onReject(c)}
              className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors"
              title="Reject"
            >
              <X size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function CandidateReviewPanel() {
  const roofCandidates = useAppStore((s) => s.roofCandidates)
  const removeRoofCandidate = useAppStore((s) => s.removeRoofCandidate)
  const updateRoofCandidate = useAppStore((s) => s.updateRoofCandidate)
  const setReviewCandidate = useAppStore((s) => s.setReviewCandidate)
  const setProperties = useAppStore((s) => s.setProperties)
  const approvedTodayCount = useAppStore((s) => s.approvedTodayCount)
  const incrementApprovedToday = useAppStore((s) => s.incrementApprovedToday)
  const role = useBustanStore((s) => s.role)
  const canReview = can(role, 'crm.edit')
  const showToast = useToastStore((s) => s.showToast)

  // Mobile: collapsed / expanded sheet
  const [mobileOpen, setMobileOpen] = useState(false)
  // Per-row working state (approving/rejecting)
  const [working, setWorking] = useState<Record<string, boolean>>({})
  // Selected rows for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // Bulk working flag
  const [bulkWorking, setBulkWorking] = useState(false)
  // Hide existing PV toggle (default ON)
  const [hideExistingPv, setHideExistingPv] = useState(true)

  // Sort by capacity desc (highest potential first)
  const sorted = useMemo(
    () => [...roofCandidates].sort((a, b) => (b.capacityKwp ?? 0) - (a.capacityKwp ?? 0)),
    [roofCandidates],
  )

  // Count of hidden (existing PV) rows
  const pvCount = useMemo(() => sorted.filter((c) => c.existingSolar === true).length, [sorted])

  // Visible rows after the PV filter
  const visible = useMemo(
    () => hideExistingPv ? sorted.filter((c) => c.existingSolar !== true) : sorted,
    [sorted, hideExistingPv],
  )

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(visible.map((c) => c.id)))
  }, [visible])

  const clearSelected = useCallback(() => setSelected(new Set()), [])

  // Focus candidate on map (sets reviewCandidate → SolarMap draws the polygon)
  const handleFocus = useCallback((c: Property) => {
    setReviewCandidate(c)
  }, [setReviewCandidate])

  // Correct a roof candidate's area → server recomputes kWp + priority.
  const handleEditArea = useCallback(async (c: Property, areaSqm: number) => {
    const res = await updateScanCandidateArea(c.id, areaSqm)
    if (!res.ok) { showToast(res.error ?? 'Failed to update area', 'error'); return }
    updateRoofCandidate(c.id, {
      area: res.areaSqm ?? areaSqm,
      capacityKwp: res.kwp ?? c.capacityKwp,
      priority: res.priority ?? c.priority,
    })
    showToast(`Area updated → ${res.kwp != null ? `${Math.round(res.kwp)} kWp` : 'recomputed'}`, 'success')
  }, [updateRoofCandidate, showToast])

  // Approve single candidate
  const handleApprove = useCallback(async (c: Property) => {
    setWorking((w) => ({ ...w, [c.id]: true }))
    try {
      await setScanCandidateStatus(c.id, 'added')
      const res = await confirmDetectedRoof(c)
      if (!res.ok) { showToast(res.error ?? 'Failed to approve', 'error'); return }
      const promoted = { ...c, id: res.id ?? c.id }
      setProperties([...useAppStore.getState().properties, promoted])
      removeRoofCandidate(c.id)
      setSelected((prev) => { const next = new Set(prev); next.delete(c.id); return next })
      if (useAppStore.getState().reviewCandidate?.id === c.id) setReviewCandidate(null)
      incrementApprovedToday()
      showToast('Lead added to map', 'success')
    } catch {
      showToast('Failed to approve candidate', 'error')
    } finally {
      setWorking((w) => { const n = { ...w }; delete n[c.id]; return n })
    }
  }, [removeRoofCandidate, setProperties, setReviewCandidate, incrementApprovedToday, showToast])

  // Reject single candidate
  const handleReject = useCallback(async (c: Property) => {
    setWorking((w) => ({ ...w, [c.id]: true }))
    try {
      await setScanCandidateStatus(c.id, 'rejected')
      removeRoofCandidate(c.id)
      setSelected((prev) => { const next = new Set(prev); next.delete(c.id); return next })
      if (useAppStore.getState().reviewCandidate?.id === c.id) setReviewCandidate(null)
    } catch {
      showToast('Failed to reject candidate', 'error')
    } finally {
      setWorking((w) => { const n = { ...w }; delete n[c.id]; return n })
    }
  }, [removeRoofCandidate, setReviewCandidate, showToast])

  // Bulk approve
  const handleBulkApprove = useCallback(async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    setBulkWorking(true)
    let approved = 0
    for (const id of ids) {
      const c = roofCandidates.find((x) => x.id === id)
      if (!c) continue
      try {
        await setScanCandidateStatus(c.id, 'added')
        const res = await confirmDetectedRoof(c)
        if (res.ok) {
          const promoted = { ...c, id: res.id ?? c.id }
          setProperties([...useAppStore.getState().properties, promoted])
          removeRoofCandidate(c.id)
          incrementApprovedToday()
          approved++
        }
      } catch { /* continue with next */ }
    }
    setBulkWorking(false)
    setSelected(new Set())
    setReviewCandidate(null)
    showToast(`${approved} candidate${approved !== 1 ? 's' : ''} approved`, 'success')
  }, [selected, roofCandidates, setProperties, removeRoofCandidate, setReviewCandidate, incrementApprovedToday, showToast])

  // Bulk reject
  const handleBulkReject = useCallback(async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    setBulkWorking(true)
    for (const id of ids) {
      const c = roofCandidates.find((x) => x.id === id)
      if (!c) continue
      try {
        await setScanCandidateStatus(c.id, 'rejected')
        removeRoofCandidate(c.id)
      } catch { /* continue */ }
    }
    setBulkWorking(false)
    setSelected(new Set())
    setReviewCandidate(null)
    showToast(`${ids.length} candidate${ids.length !== 1 ? 's' : ''} rejected`, 'info')
  }, [selected, roofCandidates, removeRoofCandidate, setReviewCandidate, showToast])

  if (!canReview || sorted.length === 0) return null

  // ── Sub-header: PV filter + tally ─────────────────────────────────────────
  const pvFilterBar = pvCount > 0 && (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-amber-500/5">
      <button
        onClick={() => setHideExistingPv((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] text-amber-400/80 hover:text-amber-300 transition-colors"
        title={hideExistingPv ? 'Show candidates with existing PV' : 'Hide candidates with existing PV'}
      >
        {hideExistingPv ? <EyeOff size={10} /> : <Eye size={10} />}
        Hide existing PV
      </button>
      {hideExistingPv && pvCount > 0 && (
        <span className="text-[10px] text-amber-400/60">{pvCount} hidden</span>
      )}
    </div>
  )

  // ── Tally header ──────────────────────────────────────────────────────────
  const tallyBar = (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-white">
          {visible.length} pending
        </span>
        {approvedTodayCount > 0 && (
          <span className="text-[10px] text-[#2ED89A]">· {approvedTodayCount} approved today</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {selected.size > 0 ? (
          <>
            <span className="text-[10px] text-white/50 mr-1">{selected.size} sel</span>
            {bulkWorking ? (
              <Loader2 size={12} className="animate-spin text-white/40" />
            ) : (
              <>
                <button
                  onClick={handleBulkApprove}
                  className="px-2 py-1 rounded-lg bg-[#2ED89A]/15 border border-[#2ED89A]/30 text-[#2ED89A] text-[10px] font-semibold hover:bg-[#2ED89A]/25 transition-colors flex items-center gap-1"
                >
                  <Check size={10} /> Approve
                </button>
                <button
                  onClick={handleBulkReject}
                  className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold hover:bg-red-500/20 transition-colors flex items-center gap-1"
                >
                  <X size={10} /> Reject
                </button>
                <button
                  onClick={clearSelected}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors ml-1"
                >
                  Clear
                </button>
              </>
            )}
          </>
        ) : (
          <button
            onClick={selectAll}
            className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
          >
            Select all
          </button>
        )}
      </div>
    </div>
  )

  const listBody = (
    <div className="overflow-y-auto flex-1 overscroll-contain">
      {visible.map((c) => (
        <CandidateRow
          key={c.id}
          candidate={c}
          selected={selected.has(c.id)}
          working={!!working[c.id]}
          canEdit={canReview}
          onSelect={toggleSelect}
          onFocus={handleFocus}
          onApprove={handleApprove}
          onReject={handleReject}
          onEditArea={handleEditArea}
        />
      ))}
    </div>
  )

  // ── Desktop: FloatingPanel wrapper ────────────────────────────────────────
  const desktopPanel = (
    <div className="hidden md:flex">
      <FloatingPanel
        id="candidate-review"
        title="Candidate Review"
        badge={sorted.length}
        defaultPosition={{ x: 16, y: 72 }}
        minWidth={288}
      >
        {pvFilterBar}
        {tallyBar}
        <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {listBody}
        </div>
      </FloatingPanel>
    </div>
  )

  // ── Mobile bottom sheet ───────────────────────────────────────────────────
  const mobileSheet = (
    <div className={`md:hidden fixed left-0 right-0 bottom-14 z-30 transition-transform duration-300 ease-out ${mobileOpen ? 'translate-y-0' : 'translate-y-[calc(100%-44px)]'}`}>
      <div className="bg-[#0D2137]/98 backdrop-blur-xl border border-white/10 border-b-0 rounded-t-2xl overflow-hidden shadow-2xl">
        {/* Drag handle + collapse toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 border-b border-white/10"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded-full bg-white/20 mx-auto" />
            <span className="text-[11px] font-semibold text-white ml-2">
              Review {sorted.length} candidates
            </span>
            {approvedTodayCount > 0 && (
              <span className="text-[10px] text-[#2ED89A]">· {approvedTodayCount} ✓</span>
            )}
          </div>
          {mobileOpen ? <ChevronDown size={14} className="text-white/40" /> : <ChevronUp size={14} className="text-white/40" />}
        </button>
        {mobileOpen && (
          <div className="flex flex-col" style={{ maxHeight: '55vh' }}>
            {pvFilterBar}
            {tallyBar}
            {listBody}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {desktopPanel}
      {mobileSheet}
    </>
  )
}
