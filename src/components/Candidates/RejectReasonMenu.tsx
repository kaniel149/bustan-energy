/**
 * RejectReasonMenu — compact inline picker shown BEFORE a rejection commits.
 *
 * Renders a row of 4 pill buttons, one per RejectionReason. The caller
 * decides where/how to mount it (inline row area, sidebar section, etc.).
 *
 * Props:
 *   onPick(reason)  — called when the user selects a reason
 *   onCancel()      — called when the user presses the Cancel / escape button
 *   compact         — (optional) use smaller text/padding for the panel row context
 *
 * Note: rejectionLabel helper lives in src/lib/rejection-reason-label.ts to
 * avoid mixing component and non-component exports in this file.
 */
import type { RejectionReason } from '../../lib/bustan-crm-service'

interface RejectReasonMenuProps {
  onPick: (reason: RejectionReason) => void
  onCancel: () => void
  compact?: boolean
}

const REASONS: { reason: RejectionReason; icon: string; label: string }[] = [
  { reason: 'has_pv',    icon: '☀️', label: 'Has panels' },
  { reason: 'not_a_roof', icon: '🚫', label: 'Not a roof' },
  { reason: 'too_small',  icon: '📐', label: 'Too small' },
  { reason: 'other',      icon: '⋯',  label: 'Other' },
]

export function RejectReasonMenu({ onPick, onCancel, compact = false }: RejectReasonMenuProps) {
  const pill = compact
    ? 'px-1.5 py-1 text-[9px] gap-0.5'
    : 'px-2 py-1.5 text-[10px] gap-1'

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {REASONS.map(({ reason, icon, label }) => (
        <button
          key={reason}
          onClick={() => onPick(reason)}
          className={`inline-flex items-center rounded-lg border border-[#E8A820]/40 bg-[#E8A820]/10 text-[#E8A820] hover:bg-[#E8A820]/25 hover:border-[#E8A820]/60 transition-colors font-medium shrink-0 ${pill}`}
          style={{ minHeight: 28 }}
          title={label}
        >
          <span>{icon}</span>
          <span className="leading-none">{label}</span>
        </button>
      ))}
      <button
        onClick={onCancel}
        className={`inline-flex items-center rounded-lg border border-white/15 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-colors shrink-0 ${pill}`}
        style={{ minHeight: 28 }}
        title="Cancel"
      >
        Cancel
      </button>
    </div>
  )
}

