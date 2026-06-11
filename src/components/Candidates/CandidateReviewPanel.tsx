/**
 * CandidateReviewPanel — fast triage UI for pending scan candidates.
 *
 * Desktop: fixed side panel (right of map, left of PropertySidebar).
 * Mobile:  bottom sheet (slides up from bottom, above MobileBottomNav).
 *
 * Uses existing service calls — no new backend surface:
 *   setScanCandidateStatus  → marks 'added' | 'rejected' in scan_candidates
 *   confirmDetectedRoof     → inserts property row (called after marking 'added')
 *   setReviewCandidate      → focuses the map overlay on the selected candidate
 */
import { useState, useMemo, useCallback } from 'react'
import { Check, X, ChevronDown, ChevronUp, MapPin, Zap, Loader2 } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { useBustanStore } from '../../lib/bustan-store'
import { can } from '../../lib/bustan-permissions'
import {
  setScanCandidateStatus,
  confirmDetectedRoof,
} from '../../lib/bustan-crm-service'
import { useToastStore } from '../../lib/toast-store'
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
  onSelect: (id: string) => void
  onFocus: (c: Property) => void
  onApprove: (c: Property) => void
  onReject: (c: Property) => void
}

function CandidateRow({ candidate: c, selected, working, onSelect, onFocus, onApprove, onReject }: RowProps) {
  const isLand = c.type === 'land'
  const kwp = c.capacityKwp ?? 0
  const capacityLabel = isLand && kwp >= 1000
    ? `${(kwp / 1000).toFixed(1)} MWp`
    : kwp > 0 ? `${kwp.toFixed(0)} kWp` : '—'

  const areaLabel = isLand
    ? c.sizeRai != null ? `${c.sizeRai.toFixed(1)} rai` : c.sizeM2 ? `${(c.sizeM2 / 1600).toFixed(1)} rai` : ''
    : c.area ? `${Math.round(c.area).toLocaleString()} m²` : ''

  const tier = c.tier ? TIER_STYLE[c.tier] : null

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 border-b border-white/5 transition-colors ${
        selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
      }`}
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
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs shrink-0">{isLand ? '🌾' : '🏠'}</span>
          <span className="text-xs text-white truncate">{c.title}</span>
          {tier && (
            <span className={`shrink-0 px-1 py-0.5 rounded text-[8px] font-bold ${tier.bg} ${tier.text}`}>
              {tier.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {areaLabel && (
            <span className="text-[10px] text-white/40 flex items-center gap-0.5">
              <MapPin size={8} className="shrink-0" />
              {areaLabel}
            </span>
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

  // Sort by capacity desc (highest potential first)
  const sorted = useMemo(
    () => [...roofCandidates].sort((a, b) => (b.capacityKwp ?? 0) - (a.capacityKwp ?? 0)),
    [roofCandidates],
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
    setSelected(new Set(sorted.map((c) => c.id)))
  }, [sorted])

  const clearSelected = useCallback(() => setSelected(new Set()), [])

  // Focus candidate on map (sets reviewCandidate → SolarMap draws the polygon)
  const handleFocus = useCallback((c: Property) => {
    setReviewCandidate(c)
  }, [setReviewCandidate])

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

  // ── Tally header ──────────────────────────────────────────────────────────
  const tallyBar = (
    <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-white">
          {sorted.length} pending
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
      {sorted.map((c) => (
        <CandidateRow
          key={c.id}
          candidate={c}
          selected={selected.has(c.id)}
          working={!!working[c.id]}
          onSelect={toggleSelect}
          onFocus={handleFocus}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      ))}
    </div>
  )

  // ── Desktop panel (hidden on mobile via md:flex) ───────────────────────────
  const desktopPanel = (
    <div className="hidden md:flex absolute top-[52px] left-4 bottom-16 z-20 w-72 flex-col bg-[#0D2137]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <div className="px-3 py-2 border-b border-white/10 bg-white/[0.03]">
        <h3 className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
          Candidate Review
        </h3>
      </div>
      {tallyBar}
      {listBody}
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
