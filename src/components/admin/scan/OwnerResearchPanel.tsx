import { useEffect, useId, useRef, useState } from 'react'
import { ExternalLink, FileCheck2, Loader2, MapPin, Save, Search, UserSearch } from 'lucide-react'
import type { ScanCandidate } from '../../../lib/bustan-crm-service'
import { safeWebsite } from '../../../lib/scan-assessment'
import {
  loadScanOwnerResearch, researchScanOwner, saveScanOwnerReview,
  type OwnerBusinessMatch, type OwnerResearchRecord, type OwnerResearchReview,
} from '../../../lib/scan-owner-research'

type Props = { candidate: ScanCandidate; canEdit: boolean }
type Operation = 'discover' | 'research' | 'save'
const EMPTY_REVIEW: OwnerResearchReview = {
  legalOwnerName: '', decisionMakerName: '', decisionMakerRole: '', titleReference: '', sourceUrl: '', evidenceNote: '', status: 'unverified',
}
const SOURCE_LABEL = { google_places: 'Google Maps', candidate: 'נתוני הנכס', manual: 'הזנה ידנית' }
const FINDING_LABEL = { business_owner: 'בעל העסק', founder: 'מייסד', manager: 'מנהל', operator: 'מפעיל', company: 'חברה', business_contact: 'איש קשר עסקי' }
const inputClass = 'mt-1 w-full rounded-lg border border-[#24463E]/20 bg-white px-2.5 py-2 text-sm text-[#27342F] focus:outline-none focus:ring-2 focus:ring-[#24463E]/25 disabled:opacity-60'
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#24463E]/25 px-3 py-2 text-xs font-semibold text-[#24463E] hover:bg-[#D8ECE8]/50 disabled:cursor-not-allowed disabled:opacity-40'
const linkClass = 'inline-flex items-center gap-1 text-xs font-medium text-[#24463E] underline underline-offset-4'
const businessKey = (business: OwnerBusinessMatch) => `${business.source}:${business.id}`
function dateLabel(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('he-IL')
}
function sourceLabel(value: string): string {
  try { return new URL(value).hostname.replace(/^www\./, '') } catch { return 'פתיחת המקור' }
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'הפעולה לא הושלמה. נסו שוב.'
}

/** The key resets every draft and ignores old requests when a different roof is selected. */
export function OwnerResearchPanel(props: Props) {
  return <OwnerResearchContent key={props.candidate.id} {...props} />
}

function OwnerResearchContent({ candidate: c, canEdit }: Props) {
  const [record, setRecord] = useState<OwnerResearchRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState<Operation | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState<'nearby' | 'manual'>('manual')
  const [selected, setSelected] = useState<OwnerBusinessMatch | null>(null)
  const [manualName, setManualName] = useState(c.name?.trim() ?? '')
  const [manualWebsite, setManualWebsite] = useState(c.website?.trim() ?? '')
  const [review, setReview] = useState<OwnerResearchReview>({ ...EMPTY_REVIEW })
  const generation = useRef(0)
  const operation = useRef<{ controller: AbortController; kind: Operation } | null>(null)
  const fieldId = useId()

  useEffect(() => {
    const version = ++generation.current
    void loadScanOwnerResearch(c.id).then((saved) => {
      if (generation.current !== version) return
      setRecord(saved)
      setReview(saved?.review ?? { ...EMPTY_REVIEW })
      const business = saved?.result?.selectedBusiness
      setSelected(business ?? null)
      setMode(business?.source === 'manual' ? 'manual' : business || saved?.result?.nearby.length ? 'nearby' : 'manual')
      if (business?.source === 'manual') { setManualName(business.name); setManualWebsite(business.website ?? '') }
      setLoading(false)
    }).catch((reason: unknown) => {
      if (generation.current !== version) return
      setLoadError(errorMessage(reason)); setLoading(false)
    })
    return () => { generation.current = version + 1; operation.current?.controller.abort(); operation.current = null }
  }, [c.id, retry])

  const result = record?.result
  const nearby = [...(result?.nearby ?? [])]
  if (result?.selectedBusiness && result.selectedBusiness.source !== 'manual' && !nearby.some((business) => businessKey(business) === businessKey(result.selectedBusiness!))) nearby.unshift(result.selectedBusiness)
  const enabled = canEdit && !loading && !loadError && !busy
  const website = safeWebsite(manualWebsite)
  const name = manualName.trim()
  const meaningfulName = name.length >= 3 && !/^(?:building|roof|גג|מבנה|untitled|unknown)(?:\s|$|\()/i.test(name) && !/^[\d\s.,²m-]+$/.test(name) ? name : ''
  const manualValid = (!!meaningfulName || !!website) && (!manualWebsite.trim() || !!website)
  const chosenBusiness: OwnerBusinessMatch | null = mode === 'nearby' ? selected : manualValid ? {
    id: 'manual', name: meaningfulName || new URL(website!).hostname, website: website ?? undefined, source: 'manual',
  } : null
  const reviewWebsite = safeWebsite(review.sourceUrl)
  const evidenceComplete = review.status !== 'document_verified' || Boolean(review.legalOwnerName.trim() && review.titleReference.trim() && review.evidenceNote.trim())
  const reviewValid = evidenceComplete && (!review.sourceUrl.trim() || !!reviewWebsite)
  const savedReview = record?.review
  const latitude = c.lat == null ? Number.NaN : Number(c.lat), longitude = c.lon == null ? Number.NaN : Number(c.lon)
  const locationValid = Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && (latitude !== 0 || longitude !== 0)
  const patchReview = (patch: Partial<OwnerResearchReview>) => { setReview((previous) => ({ ...previous, ...patch })); setNotice('') }

  const lookup = async (action: 'discover' | 'research') => {
    if (!enabled || operation.current || (action === 'research' && !chosenBusiness)) return
    const version = generation.current
    const controller = new AbortController()
    operation.current = { controller, kind: action }
    setBusy(action); setError(''); setNotice('')
    const timeout = window.setTimeout(() => controller.abort(), 90_000)
    try {
      const next = await researchScanOwner({ candidateId: c.id, action, ...(action === 'research' ? { business: chosenBusiness! } : {}) }, controller.signal)
      if (generation.current !== version || operation.current?.controller !== controller) return
      setRecord(next)
      if (action === 'discover') {
        // Nearby is a suggestion only. The operator must select the business.
        setSelected(null); setMode('nearby')
        if (next.result?.status !== 'failed' && !next.result?.nearby.length) setNotice('לא נמצאה התאמה סמוכה. אפשר להזין שם עסק או אתר ידוע ולחפש לפיהם.')
      } else if (next.result?.status !== 'failed') {
        setNotice('המחקר נשמר במאגר המשותף. ממצאי חיפוש אינם אימות בעלות במקרקעין.')
      }
    } catch (reason) {
      if (generation.current !== version || operation.current?.controller !== controller) return
      setError(controller.signal.aborted ? 'החיפוש ארך יותר מדי. נסו שוב עם שם עסק מדויק או אתר.' : errorMessage(reason))
    } finally {
      window.clearTimeout(timeout)
      if (generation.current === version && operation.current?.controller === controller) { operation.current = null; setBusy(null) }
    }
  }

  const saveReview = async () => {
    if (!enabled || operation.current || !reviewValid) return
    const version = generation.current
    const controller = new AbortController()
    operation.current = { controller, kind: 'save' }
    setBusy('save'); setError(''); setNotice('')
    const cleaned = Object.fromEntries(Object.entries(review).map(([key, value]) => [key, value.trim()])) as unknown as OwnerResearchReview
    cleaned.sourceUrl = reviewWebsite ?? ''
    try {
      const next = await saveScanOwnerReview(c.id, cleaned)
      if (generation.current !== version || operation.current?.controller !== controller) return
      setRecord(next); setReview(next.review ?? cleaned)
      setNotice('תיעוד הבעלים ומקבל ההחלטה נשמר במאגר המשותף.')
    } catch (reason) {
      if (generation.current === version && operation.current?.controller === controller) setError(errorMessage(reason))
    } finally {
      if (generation.current === version && operation.current?.controller === controller) { operation.current = null; setBusy(null) }
    }
  }

  return <section dir="rtl" aria-label="איתור בעלי הנכס ואנשי מפתח" className="space-y-4 text-[#27342F]">
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><UserSearch size={17} /> 1. מי הבעלים ומקבל ההחלטה?</h3>
      <p className="mt-2 text-xs leading-relaxed text-[#27342F]/65">קודם מזהים איזה עסק נמצא בנכס, ואז מחפשים בעלים ואנשי מפתח עם מקורות. בעל העסק, מפעיל הנכס ובעל המקרקעין עשויים להיות אנשים שונים.</p>
      <p className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${savedReview?.status === 'document_verified' ? 'bg-[#D8ECE8] text-[#24463E]' : 'bg-[#C79942]/15 text-[#775711]'}`}>
        {savedReview?.status === 'document_verified' ? 'בעלות אומתה ידנית לפי מסמך' : 'בעלות במקרקעין טרם אומתה'}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-[#27342F]/60">המחקר והאימות נשמרים במאגר משותף לצוות, ומשויכים לנכס גם בהעברתו ל־CRM.</p>
    </div>

    {loading && <p role="status" className="flex items-center gap-2 text-xs"><Loader2 size={14} className="animate-spin" /> טוען מחקר בעלים שמור…</p>}
    {loadError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800"><p>{loadError}. יש לטעון את הרשומה לפני חיפוש או עדכון.</p><button className={`${buttonClass} mt-2`} onClick={() => { setLoadError(''); setLoading(true); setRetry((value) => value + 1) }}>ניסיון טעינה נוסף</button></div>}
    {!canEdit && <p className="rounded-lg bg-[#24463E]/5 p-3 text-xs">ניתן לצפות במחקר השמור. חיפוש ושמירת אימות דורשים הרשאת עריכה.</p>}
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800"><p>{error}</p><p className="mt-1">המידע הקודם לא הוחלף. אפשר לתקן את פרטי העסק ולנסות שוב.</p></div>}
    {notice && <p role="status" className="rounded-lg bg-[#D8ECE8]/60 p-3 text-xs leading-relaxed text-[#24463E]">{notice}</p>}

    {!loading && !loadError && <>
      <div className="space-y-3 rounded-xl border border-[#24463E]/15 bg-white/60 p-3">
        <div className="flex items-start justify-between gap-2">
          <div><h4 className="text-xs font-semibold">זיהוי העסק בנכס</h4><p className="mt-1 text-[11px] leading-relaxed text-[#27342F]/60">קרבה לגג היא רמז. בחרו התאמה רק לאחר בדיקה במפה.</p></div>
          {locationValid && <a className={`${linkClass} shrink-0`} href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`} target="_blank" rel="noopener noreferrer"><MapPin size={12} /> הנכס במפה</a>}
        </div>
        <button disabled={!enabled || !locationValid} onClick={() => void lookup('discover')} className={`${buttonClass} w-full bg-white`}>
          {busy === 'discover' ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}{busy === 'discover' ? 'מאתר עסקים סמוכים…' : 'איתור עסקים ליד הגג'}
        </button>
        {!locationValid && <p className="text-[11px] text-[#775711]">חסר מיקום תקין. אפשר להמשיך באמצעות שם או אתר העסק.</p>}
        {nearby.length > 0 && <fieldset className="space-y-2" disabled={!enabled}>
          <legend className="mb-2 text-xs font-semibold">איזה עסק תואם לגג הזה?</legend>
          {nearby.map((business, index) => {
            const maps = safeWebsite(business.mapsUrl), site = safeWebsite(business.website)
            const id = `${fieldId}-business-${index}`
            return <article key={businessKey(business)} className={`rounded-lg border p-2.5 ${mode === 'nearby' && selected && businessKey(selected) === businessKey(business) ? 'border-[#24463E] bg-[#D8ECE8]/40' : 'border-[#24463E]/15 bg-white'}`}>
              <div className="flex items-start gap-2"><input id={id} type="radio" name={`${fieldId}-business`} checked={mode === 'nearby' && !!selected && businessKey(selected) === businessKey(business)} onChange={() => { setSelected(business); setMode('nearby'); setError('') }} className="mt-0.5 accent-[#24463E]" /><label htmlFor={id} className="min-w-0 text-xs font-semibold"><bdi>{business.name}</bdi></label></div>
              {business.address && <p className="mt-1 text-[11px] text-[#27342F]/60"><bdi>{business.address}</bdi></p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-[#27342F]/60"><span>מקור: {SOURCE_LABEL[business.source]}</span>{business.distanceM != null && Number.isFinite(business.distanceM) && business.distanceM >= 0 && <span>כ־{Math.round(business.distanceM).toLocaleString('he-IL')} מ׳ מהגג</span>}{maps && <a className={linkClass} href={maps} target="_blank" rel="noopener noreferrer">בדיקה במפה <ExternalLink size={11} /></a>}{site && <a className={linkClass} href={site} target="_blank" rel="noopener noreferrer">אתר העסק <ExternalLink size={11} /></a>}</div>
            </article>
          })}
        </fieldset>}
        <button disabled={!enabled} onClick={() => { setMode('manual'); setSelected(null); setError('') }} className={`${linkClass} disabled:opacity-40`}>הזנת שם או אתר ידועים במקום בחירה מהרשימה</button>
        {mode === 'manual' && <div className="grid gap-3 border-t border-[#24463E]/10 pt-3">
          <label className="text-xs">שם העסק או החברה<input value={manualName} maxLength={200} disabled={!enabled} onChange={(event) => { setManualName(event.target.value); setNotice('') }} className={inputClass} placeholder="אפשר לחפש לפי שם בלבד" /></label>
          <label className="text-xs">אתר העסק, אם ידוע<input value={manualWebsite} maxLength={2048} disabled={!enabled} onChange={(event) => { setManualWebsite(event.target.value); setNotice('') }} className={inputClass} inputMode="url" dir="ltr" placeholder="https://example.com" /></label>
          {name && !meaningfulName && !website && <p className="text-xs text-[#775711]">הזינו שם עסק אמיתי באורך 3 תווים לפחות, או אתר. מספר גג או תיאור מבנה אינם שם עסק.</p>}
          {manualWebsite.trim() && !website && <p role="alert" className="text-xs text-red-700">הזינו כתובת אתר תקינה, או מחקו אותה כדי לחפש לפי שם בלבד.</p>}
        </div>}
        {mode === 'nearby' && !selected && <p className="text-xs text-[#775711]">בחרו עסק מהרשימה, או עברו להזנה ידנית, לפני חיפוש בעלי העסק.</p>}
        {chosenBusiness && <p className="text-[11px] text-[#27342F]/65">החיפוש יתייחס ל־<bdi className="font-semibold">{chosenBusiness.name}</bdi>. יש לאמת את הקשר שלו לנכס.</p>}
        <button disabled={!enabled || !chosenBusiness} onClick={() => void lookup('research')} className={`${buttonClass} w-full !border-[#24463E] !bg-[#24463E] !text-[#FFF4E2]`}>
          {busy === 'research' ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}{busy === 'research' ? 'מחפש בעלים ואנשי מפתח…' : 'חיפוש בעלים ואנשי מפתח'}
        </button>
      </div>

      {result && <div className="space-y-3" aria-live="polite">
        <div><h4 className="text-xs font-semibold">מחקר שמור{result.selectedBusiness ? <> · <bdi>{result.selectedBusiness.name}</bdi></> : ''}</h4><p className="mt-1 text-[10px] text-[#27342F]/60">נבדק: {dateLabel(result.searchedAt)}</p></div>
        {result.status === 'failed' && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">החיפוש לא הושלם. בדקו את פרטי העסק ונסו שוב, או המשיכו בבירור ידני.</p>}
        {result.status === 'not_found' && <p className="rounded-lg bg-[#C79942]/10 p-3 text-xs leading-relaxed">לא נמצא ממצא עם מקור שמאפשר לזהות בעלים או איש מפתח. נסו שם מדויק או אתר נוסף; אפשר לתעד בירור ישיר או מסמך בהמשך.</p>}
        {result.findings.map((finding, index) => {
          const source = safeWebsite(finding.sourceUrl)
          return <article key={`${finding.kind}-${finding.name}-${index}`} className="space-y-2 rounded-lg border border-[#24463E]/15 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2"><p className="text-sm font-semibold"><bdi>{finding.name}</bdi></p><span className="rounded bg-[#D8ECE8]/60 px-1.5 py-0.5 text-[10px] text-[#24463E]">{FINDING_LABEL[finding.kind]}</span></div>
            <p className="text-xs text-[#27342F]/70"><bdi>{finding.role}</bdi></p>
            <blockquote className="border-r-2 border-[#C79942]/40 pr-2 text-xs leading-relaxed text-[#27342F]/70"><bdi>{finding.excerpt}</bdi></blockquote>
            <div className="flex flex-wrap items-center gap-3">{source ? <a className={linkClass} href={source} target="_blank" rel="noopener noreferrer">{sourceLabel(source)} <ExternalLink size={11} /></a> : <span className="text-xs text-[#775711]">קישור המקור אינו זמין לבדיקה</span>}{finding.sourceDate && <span className="text-[10px] text-[#27342F]/60">תאריך המקור: {dateLabel(finding.sourceDate)}</span>}</div>
            <p className="text-[10px] text-[#775711]">ממצא מחקר ממקור ציבורי · אינו אימות בעלות במקרקעין</p>
          </article>
        })}
        {result.issues.length > 0 && <ul className="list-inside list-disc space-y-1 text-[11px] leading-relaxed text-[#775711]">{result.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}
        {result.sources.length > 0 && <details className="text-xs"><summary className="cursor-pointer font-medium text-[#24463E]">כל מקורות המחקר ({result.sources.length})</summary><ul className="mt-2 space-y-2">{result.sources.map((source, index) => {
          const url = safeWebsite(source.url)
          return url ? <li key={`${source.url}-${index}`}><a className={linkClass} href={url} target="_blank" rel="noopener noreferrer"><bdi>{source.title || sourceLabel(url)}</bdi><ExternalLink size={11} /></a></li> : null
        })}</ul></details>}
      </div>}

      {savedReview && <div className="space-y-2 rounded-lg border border-[#24463E]/15 bg-[#D8ECE8]/30 p-3 text-xs">
        <p className="flex items-center gap-2 font-semibold"><FileCheck2 size={14} /> תיעוד ידני שנשמר</p>
        {savedReview.legalOwnerName && <p>בעלים: <bdi>{savedReview.legalOwnerName}</bdi>{savedReview.status !== 'document_verified' && ' · טרם אומת'}</p>}
        {savedReview.decisionMakerName && <p>מקבל ההחלטה: <bdi>{savedReview.decisionMakerName}</bdi>{savedReview.decisionMakerRole && <> · <bdi>{savedReview.decisionMakerRole}</bdi></>}</p>}
        {savedReview.titleReference && <p>מסמך / חלקה: <bdi>{savedReview.titleReference}</bdi></p>}
        {savedReview.evidenceNote && <p className="whitespace-pre-wrap leading-relaxed"><bdi>{savedReview.evidenceNote}</bdi></p>}
        {safeWebsite(savedReview.sourceUrl) && <a className={linkClass} href={safeWebsite(savedReview.sourceUrl)!} target="_blank" rel="noopener noreferrer">מקור האימות <ExternalLink size={11} /></a>}
        <p className="text-[10px] text-[#27342F]/60">נשמר: {dateLabel(record?.reviewed_at || record?.updated_at)}</p>
      </div>}

      <details className="rounded-xl border border-[#24463E]/20 bg-white/50 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#24463E]">תיעוד בעלים, מקבל החלטה ואימות מסמך</summary>
        <p className="mt-3 text-xs leading-relaxed text-[#27342F]/65">אם ידועים מספר חלקה או שטר, תעדו אותם ובררו מול לשכת הקרקעות. בחירה ב״אומת לפי מסמך״ דורשת שם בעלים, פרטי מסמך ותיאור הבדיקה שבוצעה.</p>
        <div className="mt-3 flex flex-wrap gap-3"><a className={linkClass} href="https://datawarehouse2.dbd.go.th" target="_blank" rel="noopener noreferrer">מרשם חברות DBD <ExternalLink size={11} /></a><a className={linkClass} href="https://landsmaps.dol.go.th/" target="_blank" rel="noopener noreferrer">איתור חלקה / בירור בלשכת הקרקעות <ExternalLink size={11} /></a></div>
        <form className="mt-4" onSubmit={(event) => { event.preventDefault(); void saveReview() }}>
          <fieldset disabled={!enabled} className="space-y-3">
            <label className="block text-xs">שם בעל המקרקעין<input value={review.legalOwnerName} maxLength={250} required={review.status === 'document_verified'} onChange={(event) => patchReview({ legalOwnerName: event.target.value })} className={inputClass} /></label>
            <label className="block text-xs">שם מקבל ההחלטה<input value={review.decisionMakerName} maxLength={250} onChange={(event) => patchReview({ decisionMakerName: event.target.value })} className={inputClass} /></label>
            <label className="block text-xs">תפקיד / הקשר לנכס<input value={review.decisionMakerRole} maxLength={250} onChange={(event) => patchReview({ decisionMakerRole: event.target.value })} className={inputClass} placeholder="למשל: מנהל הנכס או מורשה חתימה" /></label>
            <label className="block text-xs">מספר שטר, חלקה או הפניה למסמך<input value={review.titleReference} maxLength={500} required={review.status === 'document_verified'} onChange={(event) => patchReview({ titleReference: event.target.value })} className={inputClass} /></label>
            <label className="block text-xs">קישור למקור או למסמך, אם קיים<input value={review.sourceUrl} maxLength={2048} onChange={(event) => patchReview({ sourceUrl: event.target.value })} className={inputClass} dir="ltr" inputMode="url" /></label>
            {review.sourceUrl.trim() && !reviewWebsite && <p className="text-xs text-red-700">כתובת המקור אינה תקינה.</p>}
            <label className="block text-xs">מה נבדק ומה הראיה לקשר לנכס?<textarea value={review.evidenceNote} maxLength={4000} required={review.status === 'document_verified'} onChange={(event) => patchReview({ evidenceNote: event.target.value })} className={inputClass} rows={3} placeholder="למשל: מספר המסמך, תאריך העיון, הלשכה והשם שמופיע במסמך" /></label>
            <label className="block text-xs">מצב אימות הבעלות<select value={review.status} onChange={(event) => patchReview({ status: event.target.value as OwnerResearchReview['status'] })} className={inputClass}><option value="unverified">טרם אומתה / נדרש בירור נוסף</option><option value="document_verified">אומתה ידנית לפי מסמך</option></select></label>
            {!evidenceComplete && <p className="text-xs text-[#775711]">לשמירת אימות השלימו שם בעלים, הפניה למסמך ותיאור הראיה שנבדקה.</p>}
            <button disabled={!enabled || !reviewValid} className={`${buttonClass} w-full !bg-[#24463E] !text-[#FFF4E2]`}>{busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{busy === 'save' ? 'שומר תיעוד…' : 'שמירת תיעוד במאגר המשותף'}</button>
          </fieldset>
        </form>
      </details>
    </>}
  </section>
}
