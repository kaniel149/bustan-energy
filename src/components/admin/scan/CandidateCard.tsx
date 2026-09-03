/**
 * CandidateCard — one scan candidate in the /admin/scan list: identity,
 * grade/kWp/m²/score, footprint + PV + CRM badges, and the action row
 * (approve / reject-with-reason / proposal / WhatsApp / compare / note / fly-to).
 */
import { useEffect, useRef, useState } from 'react'
import { Check, X, FilePlus, MessageCircle, Crosshair, Loader2 } from 'lucide-react'
import { RejectReasonMenu } from '../../Candidates/RejectReasonMenu'
import type { ScanCandidate, RejectionReason } from '../../../lib/bustan-crm-service'
import { CAT_ICONS, GRADE_COLORS, displayName, footprintBadge, gradeOf, hasExistingSolar, whatsappLink } from '../../../lib/scan-review'

export interface CandidateCardProps {
  c: ScanCandidate
  selected: boolean
  note: string
  compared: boolean
  compareDisabled: boolean
  canEdit: boolean
  working: boolean
  onSelect: () => void
  onApprove: () => void
  onReject: (reason: RejectionReason) => void
  onProposal: () => void
  onCompareToggle: () => void
  onNote: (text: string) => void
  onFlyTo: () => void
}

export function CandidateCard({
  c, selected, note, compared, compareDisabled, canEdit, working,
  onSelect, onApprove, onReject, onProposal, onCompareToggle, onNote, onFlyTo,
}: CandidateCardProps) {
  const [rejecting, setRejecting] = useState(false)
  const [draft, setDraft] = useState(note)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep the local draft in sync when the persisted note changes from outside.
  useEffect(() => { setDraft(note) }, [note])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const grade = gradeOf(c)
  const kwp = Math.round(Number(c.estimated_kwp ?? 0))
  const badge = footprintBadge(c)
  const pv = hasExistingSolar(c)
  const inCrm = c.status === 'added'
  const wa = whatsappLink(
    c,
    `Hello, this is Bustan Energy. Your roof could host ~${kwp} kWp of solar — may we send a free proposal?`,
  )

  const handleNote = (text: string) => {
    setDraft(text)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onNote(text), 300)
  }

  return (
    <div
      data-candidate-id={c.id}
      onClick={onSelect}
      className={`rounded-xl border p-3 space-y-2 cursor-pointer transition-colors ${
        selected ? 'border-[#24463E] bg-[#D8ECE8]/60' : 'border-[#24463E]/15 bg-white/70 hover:bg-white'
      } ${pv ? 'opacity-70' : ''}`}
    >
      {/* Identity */}
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none" aria-hidden="true">{CAT_ICONS[c.category ?? ''] ?? '🏢'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#27342F] truncate" title={displayName(c)}>{displayName(c)}</p>
          <p className="text-[11px] text-[#27342F]/55 truncate">
            {c.area_name ?? ''}{c.external_id ? ` · #${c.external_id}` : ''}
          </p>
        </div>
        <span
          className="px-2 py-0.5 rounded-md text-xs font-bold shrink-0"
          style={{ backgroundColor: GRADE_COLORS[grade], color: '#0b1a16' }}
          title={`Grade ${grade}`}
        >
          {grade}
        </span>
      </div>

      {/* Numbers */}
      <div className="flex items-center gap-3 text-xs text-[#27342F]/75">
        <span className="font-semibold text-[#27342F]">{kwp} kWp</span>
        <span>{Math.round(Number(c.roof_area_sqm ?? 0))} m²</span>
        <span>score {Math.round(Number(c.solar_potential_score ?? 0))}</span>
      </div>

      {/* Badges */}
      {(badge || pv || inCrm) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {badge && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 text-[10px] font-medium">{badge}</span>}
          {pv && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 text-[10px] font-medium">
              ☀️ PV{c.panel_coverage_pct != null ? ` ${Math.round(Number(c.panel_coverage_pct))}%` : ''}
            </span>
          )}
          {inCrm && <span className="px-1.5 py-0.5 rounded bg-[#24463E]/15 text-[#24463E] text-[10px] font-medium">In CRM</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {rejecting ? (
          <RejectReasonMenu
            compact
            onPick={(r) => { setRejecting(false); onReject(r) }}
            onCancel={() => setRejecting(false)}
          />
        ) : (
          <>
            {!inCrm && (
              <button
                onClick={onApprove}
                disabled={!canEdit || working}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title={canEdit ? 'Approve → CRM' : 'Needs admin/sales role'}
              >
                {working ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
              </button>
            )}
            {!inCrm && (
              <button
                onClick={() => setRejecting(true)}
                disabled={!canEdit || working}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/40 text-red-700 text-[11px] font-medium hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                title={canEdit ? 'Reject with reason' : 'Needs admin/sales role'}
              >
                <X size={12} /> Reject
              </button>
            )}
            <button
              onClick={onProposal}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E8A820] text-[#0b1a16] text-[11px] font-medium hover:opacity-90"
              title="Create proposal"
            >
              <FilePlus size={12} /> Proposal
            </button>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#25D366]/20 text-[#128C7E] text-[11px] font-medium hover:bg-[#25D366]/30"
                title={`WhatsApp ${c.phone}`}
              >
                <MessageCircle size={12} /> WhatsApp
              </a>
            )}
            <button
              onClick={onFlyTo}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#24463E]/25 text-[#24463E] text-[11px] hover:bg-[#24463E]/10"
              title="Fly to roof"
            >
              <Crosshair size={12} /> Fly
            </button>
            <label className={`ml-auto inline-flex items-center gap-1 text-[11px] text-[#27342F]/70 ${compareDisabled && !compared ? 'opacity-40' : 'cursor-pointer'}`} title="Compare (max 3)">
              <input
                type="checkbox"
                checked={compared}
                disabled={compareDisabled && !compared}
                onChange={onCompareToggle}
                className="accent-[#24463E]"
              />
              Compare
            </label>
          </>
        )}
      </div>

      {/* Note */}
      <textarea
        value={draft}
        onChange={(e) => handleNote(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder="Note…"
        rows={1}
        className="w-full px-2 py-1 rounded-md bg-white/80 border border-[#24463E]/15 text-[11px] text-[#27342F] placeholder:text-[#27342F]/35 focus:outline-none focus:border-[#24463E] resize-y"
        aria-label={`Note for ${displayName(c)}`}
      />
    </div>
  )
}
