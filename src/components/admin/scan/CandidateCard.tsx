/** A roof review record: scan evidence, preliminary sizing, contact and next actions. */
import { useId, useRef, useState } from 'react'
import { Check, ChevronDown, Crosshair, ExternalLink, FilePlus, Loader2, MessageCircle, NotebookPen, UserRound, UserSearch, X } from 'lucide-react'
import type { ScanCandidate, RejectionReason } from '../../../lib/bustan-crm-service'
import {
  GRADE_COLORS, GRADES, categoryLabel, displayName, footprintLabel, gradeOf,
  hasExistingSolar, sizingSummary, solarCheckLabel, whatsappLink,
} from '../../../lib/scan-review'

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

const REASONS: { value: RejectionReason; label: string }[] = [
  { value: 'has_pv', label: 'פאנלים קיימים · הסרת נכס זה' },
  { value: 'not_a_roof', label: 'אינו גג · חסימת אזור' },
  { value: 'too_small', label: 'קטן מדי · חסימת אזור' },
  { value: 'other', label: 'סיבה אחרת · חסימת אזור' },
]
const actionClass = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24463E] disabled:cursor-not-allowed disabled:opacity-40'
const number = (value: number) => value.toLocaleString('he-IL', { maximumFractionDigits: 1 })

function websiteHref(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch { return null }
}

export function CandidateCard({
  c, selected, note, compared, compareDisabled, canEdit, working,
  onSelect, onApprove, onReject, onProposal, onCompareToggle, onNote, onFlyTo,
}: CandidateCardProps) {
  const [rejecting, setRejecting] = useState(false)
  const noteId = useId()
  const rejectButtonRef = useRef<HTMLButtonElement>(null)
  const closeRejection = () => {
    setRejecting(false)
    requestAnimationFrame(() => rejectButtonRef.current?.focus())
  }
  const grade = gradeOf(c)
  const hasGrade = GRADES.some((value) => value === c.priority)
  const sizing = sizingSummary(c)
  const footprint = footprintLabel(c)
  const pv = hasExistingSolar(c)
  const inCrm = c.status === 'added'
  const website = websiteHref(c.website)
  const hasContact = Boolean(c.phone?.trim() || website)
  const score = c.solar_potential_score == null || !Number.isFinite(Number(c.solar_potential_score))
    ? null : Number(c.solar_potential_score)
  const canLocate = c.lat != null && c.lon != null && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon))
    && Math.abs(Number(c.lat)) <= 90 && Math.abs(Number(c.lon)) <= 180
  const wa = whatsappLink(c,
    'Hello, this is Bustan Energy in Koh Phangan. We are checking whether solar could suit this property. Could you help us reach the owner or the person responsible for energy decisions?',
  )

  return (
    <article
      dir="rtl"
      data-candidate-id={c.id}
      aria-label={displayName(c)}
      className={`overflow-hidden rounded-xl border transition-colors ${
        selected ? 'border-[#24463E] bg-white shadow-[0_3px_14px_#24463E12]' : 'border-[#24463E]/15 bg-[#FFFCF6] hover:border-[#24463E]/35'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`בחירת ${displayName(c)} במפה`}
        className="block w-full space-y-3 p-3.5 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#24463E]"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="mb-1 block text-[10px] font-semibold text-[#24463E]/70">{categoryLabel(c)}{c.area_name ? <> · <bdi>{c.area_name}</bdi></> : ''}</span>
            <span className="block break-words text-sm font-bold leading-snug text-[#27342F]"><bdi>{displayName(c)}</bdi></span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className="rounded px-2 py-1 text-[10px] font-bold text-[#1F352D]"
              style={{ backgroundColor: hasGrade ? `${GRADE_COLORS[grade]}40` : '#E7E7DF' }}
              title="עדיפות מתוך נתוני הסריקה; אינה אישור להתקנה"
            >
              {hasGrade ? <>עדיפות <bdi>{grade}</bdi></> : 'לא דורג'}
            </span>
            {selected && <span className="text-[10px] font-semibold text-[#24463E]">נבחר במפה</span>}
          </span>
        </span>

        <span className="grid grid-cols-[1.2fr_1fr_0.8fr] gap-2 rounded-lg bg-[#F4EAD8]/55 px-3 py-2.5">
          <span>
            <span className="block text-[10px] font-medium text-[#27342F]/65">פוטנציאל על הגג</span>
            <span className="mt-0.5 block text-base font-bold leading-tight text-[#24463E]">
              {sizing.estimatedCapacityKwp == null ? <span className="text-xs">{sizing.status === 'missing_estimate' ? 'טרם חושב' : 'נדרש אימות'}</span> : <bdi>{number(sizing.estimatedCapacityKwp)} <span className="text-[10px] font-medium">kWp</span></bdi>}
            </span>
          </span>
          <span className="border-s border-[#24463E]/10 ps-2.5">
            <span className="block text-[10px] font-medium text-[#27342F]/65">שטח גג</span>
            <span className="mt-0.5 block text-base font-semibold leading-tight text-[#27342F]">
              {sizing.roofAreaSqm == null ? <span className="text-xs">לא אומת</span> : <bdi>{number(sizing.roofAreaSqm)} <span className="text-[10px] font-medium">מ״ר</span></bdi>}
            </span>
          </span>
          <span className="border-s border-[#24463E]/10 ps-2.5" title="ציון לתעדוף מתוך הסריקה, מתוך 100">
            <span className="block text-[10px] font-medium text-[#27342F]/65">ציון סריקה</span>
            <span className="mt-0.5 block text-base font-semibold leading-tight text-[#27342F]"><bdi dir="ltr">{score == null ? '—' : Math.round(score)}<span className="text-[10px] font-normal text-[#27342F]/55"> / 100</span></bdi></span>
          </span>
        </span>

        <span className="flex flex-wrap gap-1.5 text-[10px] font-medium">
          {footprint && <span className={`rounded px-2 py-1 ${sizing.status === 'needs_roof_verification' ? 'bg-amber-100 text-amber-900' : 'bg-[#D8ECE8]/65 text-[#24463E]'}`}>{footprint}</span>}
          <span className={`rounded px-2 py-1 ${pv ? 'bg-amber-100 text-amber-900' : 'bg-[#24463E]/5 text-[#27342F]/70'}`}>{solarCheckLabel(c)}</span>
          {inCrm && <span className="rounded bg-[#24463E] px-2 py-1 text-white">הועבר ל־CRM</span>}
        </span>
        <span className="block text-[11px] leading-relaxed text-[#27342F]/65">
          {sizing.reason}
        </span>
      </button>

      <div className="border-t border-[#24463E]/10 px-3.5 py-3">
        <div className="mb-3 flex items-start gap-2 text-[11px] leading-relaxed text-[#27342F]/75">
          <UserRound size={14} className="mt-0.5 shrink-0 text-[#24463E]" aria-hidden="true" />
          <p><span className="font-semibold text-[#27342F]">{hasContact ? 'פרטי עסק זמינים מהסריקה' : 'אין פרטי קשר בנתוני הסריקה'}</span><span className="block">מחקר הבעלים והאימות מופיעים בכרטיס הגג</span></p>
        </div>
        {rejecting ? (
          <div
            className="rounded-lg border border-[#B85C35]/25 bg-[#FBEEE2] p-2.5"
            onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closeRejection() } }}
            role="group"
            aria-label="בחירת סיבת הסרה"
            aria-describedby={`${noteId}-rejection-impact`}
          >
            <p className="mb-2 text-xs font-semibold text-[#754326]">מה סיבת הסרת המועמד?</p>
            <p id={`${noteId}-rejection-impact`} className="mb-3 text-[11px] leading-relaxed text-[#754326]">
              ״אינו גג״, ״קטן מדי״ ו״סיבה אחרת״ חוסמים גם אזור של כ־28 מ׳ סביב הנכס, ומשפיעים על מועמדים סמוכים ועל סריקות עתידיות. ״פאנלים קיימים״ מסיר רק נכס זה. אין ביטול מתוך המסך הזה.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map(({ value, label }, index) => (
                <button key={value} type="button" autoFocus={index === 0} disabled={!canEdit || working} onClick={() => { closeRejection(); onReject(value) }} className={`${actionClass} border border-[#754326]/25 bg-white/70 text-[#754326] hover:bg-white`}>
                  {label}
                </button>
              ))}
              <button type="button" onClick={closeRejection} className={`${actionClass} text-[#27342F] hover:bg-white`}>ביטול</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={onSelect} className={`${actionClass} bg-[#D8ECE8] text-[#24463E] hover:bg-[#C8E3DD]`} aria-expanded={selected}><UserSearch size={13} aria-hidden="true" /> איתור בעלים</button>
            {!inCrm && <button type="button" onClick={onApprove} disabled={!canEdit || working} className={`${actionClass} bg-[#24463E] text-white hover:bg-[#355C50]`} title={canEdit ? 'שמירת הנכס להמשך טיפול ב־CRM' : 'נדרשת הרשאת מנהל או מכירות'}>
              {working ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Check size={13} aria-hidden="true" />} {working ? 'מעדכן…' : 'העברה ל־CRM'}
            </button>}
            <button type="button" onClick={onProposal} disabled={!canEdit || working} className={`${actionClass} bg-[#F2B84B] text-[#27342F] hover:bg-[#EBAE39]`} title={canEdit ? 'פתיחת טיוטת הצעה להשלמת נתוני צריכה וסקר' : 'נדרשת הרשאת מנהל או מכירות'}><FilePlus size={13} aria-hidden="true" /> טיוטת הצעה</button>
            {!inCrm && <button ref={rejectButtonRef} type="button" onClick={() => setRejecting(true)} disabled={!canEdit || working} className={`${actionClass} border border-[#24463E]/20 text-[#754326] hover:bg-[#FBEEE2]`} title="הסרת מועמד עם סיבה"><X size={13} aria-hidden="true" /> הסרה</button>}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={onFlyTo} disabled={!canLocate} className={`${actionClass} border border-[#24463E]/20 text-[#24463E] hover:bg-[#D8ECE8]/40`} title={canLocate ? 'התמקדות בנכס במפה' : 'חסרות קואורדינטות תקינות'}><Crosshair size={13} aria-hidden="true" /> במפה</button>
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${actionClass} border border-[#24463E]/20 text-[#24463E] hover:bg-[#D8ECE8]/40`} title={`פתיחת טיוטת WhatsApp לאיש הקשר: ${c.phone}`}><MessageCircle size={13} aria-hidden="true" /> וואטסאפ</a>}
          <label className={`ms-auto inline-flex min-h-9 items-center gap-1.5 text-xs text-[#27342F]/80 ${compareDisabled && !compared ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`} title={compareDisabled && !compared ? 'ניתן להשוות עד 3 נכסים; יש להסיר נכס מההשוואה תחילה' : 'השוואה של עד 3 נכסים'}>
            <input type="checkbox" checked={compared} disabled={compareDisabled && !compared} onChange={onCompareToggle} className="h-3.5 w-3.5 accent-[#24463E]" aria-label={`${compared ? 'הסרת' : 'הוספת'} ${displayName(c)} ${compared ? 'מההשוואה' : 'להשוואה'}`} /> להשוואה
          </label>
        </div>
      </div>

      <details className="group border-t border-[#24463E]/10 bg-[#F4EAD8]/20">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3.5 py-2 text-[11px] font-medium text-[#24463E] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#24463E] [&::-webkit-details-marker]:hidden">
          <NotebookPen size={13} aria-hidden="true" /><span>פרטי קשר, מקור והערות{note.trim() ? ' · קיימת הערה' : ''}</span><ChevronDown size={13} className="ms-auto transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-3 px-3.5 pb-3.5 text-xs text-[#27342F]">
          <dl className="space-y-2">
            <div className="flex justify-between gap-3"><dt className="text-[#27342F]/60">טלפון שפורסם</dt><dd><bdi dir="ltr">{c.phone?.trim() || 'לא נמצא'}</bdi></dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[#27342F]/60">אתר הנכס</dt><dd>{website ? <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#24463E] underline underline-offset-2">פתיחת האתר <ExternalLink size={11} aria-hidden="true" /></a> : 'לא נמצא'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="shrink-0 text-[#27342F]/60">מקור הסריקה</dt><dd className="break-all text-end"><bdi>{c.external_source || 'לא צוין'}{c.external_id ? ` · #${c.external_id}` : ''}</bdi></dd></div>
            <div className="flex justify-between gap-3"><dt className="shrink-0 text-[#27342F]/60">מערכת מומלצת</dt><dd className="text-end">נדרשים נתוני צריכה וסקר</dd></div>
          </dl>
          <div className="space-y-1.5 border-t border-[#24463E]/10 pt-3">
            <label htmlFor={noteId} className="block text-xs font-semibold">הערת בדיקה</label>
            <textarea id={noteId} value={note} onChange={(event) => onNote(event.target.value)} placeholder="למשל: נדרש צילום גג או בירור מול מנהל הנכס" rows={2} className="w-full resize-y rounded-md border border-[#24463E]/20 bg-white px-2.5 py-2 text-xs leading-relaxed text-[#27342F] placeholder:text-[#27342F]/45 focus:outline-2 focus:outline-[#24463E]/50" aria-describedby={`${noteId}-storage`} />
            <p id={`${noteId}-storage`} className="text-[10px] leading-relaxed text-[#27342F]/60">ההערות נשמרות בדפדפן הזה בלבד ואינן מסתנכרנות עם הצוות או עם ה־CRM.</p>
          </div>
        </div>
      </details>
    </article>
  )
}
