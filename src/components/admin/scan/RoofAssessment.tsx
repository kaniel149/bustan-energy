import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, Ruler, Search, Sun, UserSearch } from 'lucide-react'
import type { ScanCandidate } from '../../../lib/bustan-crm-service'
import { sizingSummary } from '../../../lib/scan-review'
import { assessDemand, safeWebsite } from '../../../lib/scan-assessment'

type CompanyResult = {
  configured?: boolean
  source?: string
  target?: string
  message?: string
  error?: string
  data?: { companyLegalName?: string; businessPhone?: string; registeredAddress?: string; registrationNo?: string; website?: string }
}

export function RoofAssessment({ candidate: c, canEdit, working, onArea, onNote, note, onProposal }: {
  candidate: ScanCandidate
  canEdit: boolean
  working: boolean
  onArea: (area: number) => Promise<void>
  onNote: (text: string) => void
  note: string
  onProposal?: (kwp: number) => void
}) {
  const [area, setArea] = useState(String(c.roof_area_sqm ?? ''))
  const [monthlyKwh, setMonthlyKwh] = useState('')
  const [daytime, setDaytime] = useState('60')
  const [yieldPerDay, setYieldPerDay] = useState('4')
  const [website, setWebsite] = useState(c.website ?? '')
  const [juristicId, setJuristicId] = useState('')
  const [research, setResearch] = useState<CompanyResult | null>(null)
  const [researchBusy, setResearchBusy] = useState(false)
  const researchController = useRef<AbortController | null>(null)
  useEffect(() => () => researchController.current?.abort(), [])
  const summary = sizingSummary(c)
  const needsRoofOutline = summary.status === 'needs_roof_verification'
  const assessment = assessDemand(c, { monthlyKwh: Number(monthlyKwh), daytimePercent: Number(daytime), dailyYield: Number(yieldPerDay) })
  const areaValid = area.trim() !== '' && Number.isFinite(Number(area)) && Number(area) > 0 && Number(area) <= 1_000_000
  const websiteUrl = safeWebsite(website)
  const researchAllowed = (!!websiteUrl || /^\d{13}$/.test(juristicId.trim())) && (!website.trim() || !!websiteUrl)

  const lookup = async () => {
    if (researchBusy || !researchAllowed) return
    setResearchBusy(true)
    setResearch(null)
    const controller = new AbortController()
    researchController.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 35_000)
    const target = /^\d{13}$/.test(juristicId.trim()) ? juristicId.trim() : websiteUrl
    try {
      const response = await fetch('/api/enrich-owner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl ?? undefined, juristicId: juristicId.trim() || undefined, companyName: c.name || undefined }),
        signal: controller.signal,
      })
      const result = await response.json() as CompanyResult
      if (!response.ok) throw new Error('לא ניתן להשלים את החיפוש כרגע. אפשר לפתוח את מקורות המחקר למטה ולנסות שוב.')
      setResearch({ ...result, target: result.target || target || undefined })
    } catch {
      setResearch({ error: 'חיפוש החברה לא הושלם. בדקו את כתובת האתר או מספר החברה ונסו שוב.' })
    } finally { window.clearTimeout(timeout); setResearchBusy(false) }
  }
  const appendNote = (text: string) => onNote([note.trim(), text].filter(Boolean).join('\n\n'))
  const inputClass = 'mt-1 w-full rounded-lg border border-[#24463E]/20 bg-white px-2.5 py-2 text-sm text-[#27342F] focus:outline-none focus:ring-2 focus:ring-[#24463E]/25'
  const linkClass = 'inline-flex items-center gap-1.5 rounded-lg border border-[#24463E]/20 px-2.5 py-2 text-xs font-medium text-[#24463E] hover:bg-[#D8ECE8]/60'

  return <section dir="rtl" aria-label="בדיקת הגג והבעלים" className="rounded-xl border border-[#24463E]/25 bg-[#F7F1E5] p-4 text-[#27342F] space-y-5">
    <div>
      <h3 className="flex items-center gap-2 font-semibold text-sm"><Ruler size={16} /> 1. בדיקת שטח הגג</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#27342F]/65">בדקו שהמתאר במפה הוא גג בנוי. שטח מגרש או מתחם דורש זיהוי של הגגות בנפרד.</p>
      {needsRoofOutline ? <p className="mt-3 rounded-lg bg-[#C79942]/10 p-3 text-xs leading-relaxed">המתאר הזה אינו גג מאומת. יש לזהות ולמדוד כל גג בנפרד. אפשר לפתוח טיוטת הצעה מהכרטיס ולסמן בה את הגג במפה; שטח המתחם לא יועבר כשטח גג.</p> : <><form onSubmit={(event) => { event.preventDefault(); if (areaValid && canEdit && !working) void onArea(Number(area)) }} className="mt-3 flex items-end gap-2">
        <label className="min-w-0 flex-1 text-xs">שטח גג מתוקן, מ״ר
          <input type="number" min="1" max="1000000" step="0.1" value={area} onChange={(e) => setArea(e.target.value)} className={inputClass} dir="ltr" required />
        </label>
        <button disabled={!canEdit || working || !areaValid || Number(area) === Number(c.roof_area_sqm)} className="min-h-10 rounded-lg bg-[#24463E] px-3 text-xs font-medium text-[#FFF4E2] disabled:opacity-40">{working ? 'שומר…' : 'עדכון שטח'}</button>
      </form>
      <p className="mt-1.5 text-[11px] text-[#27342F]/60">העדכון נשמר במאגר ומחשב מחדש את הפוטנציאל. יש לבדוק את המתאר והשטח לפני תכנון.</p></>}
    </div>

    <div className="border-t border-[#24463E]/15 pt-4">
      <h3 className="flex items-center gap-2 font-semibold text-sm"><Sun size={16} /> 2. התאמת מערכת לצריכה</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#27342F]/65">{summary.estimatedCapacityKwp == null ? summary.reason : `פוטנציאל הגג: עד ${summary.estimatedCapacityKwp.toLocaleString('he-IL', { maximumFractionDigits: 1 })} kWp. המלצה ראשונית מחושבת לפי הצריכה בשעות היום.`}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs">צריכה חודשית מחשבון החשמל, קוט״ש
          <input type="number" min="1" step="1" placeholder="למשל 1200" value={monthlyKwh} onChange={(e) => setMonthlyKwh(e.target.value)} className={inputClass} dir="ltr" />
        </label>
        <label className="text-xs">חלק הצריכה בשעות היום, %
          <input type="number" min="1" max="100" value={daytime} onChange={(e) => setDaytime(e.target.value)} className={inputClass} dir="ltr" />
        </label>
        <label className="text-xs">תפוקה יומית להנחה, קוט״ש/kWp
          <input type="number" min="0.1" max="8" step="0.1" value={yieldPerDay} onChange={(e) => setYieldPerDay(e.target.value)} className={inputClass} dir="ltr" />
        </label>
      </div>
      {assessment && assessment.recommendedKwp > 0 ? <div className="mt-3 rounded-lg border border-[#C79942]/30 bg-[#F2B84B]/15 p-3" aria-live="polite">
        <p className="text-xs font-medium">גודל ראשוני לבדיקה</p>
        <p className="my-1 text-2xl font-semibold tabular-nums" dir="ltr">{assessment.recommendedKwp.toLocaleString('he-IL', { maximumFractionDigits: 1 })} <span className="text-sm">kWp</span></p>
        <p className="text-xs">{assessment.roofLimited ? 'מוגבל לפי פוטנציאל הגג.' : 'מותאם לצריכת היום הממוצעת.'} תפוקה מחושבת: כ־{assessment.estimatedMonthlyKwh.toLocaleString('he-IL')} קוט״ש בחודש.</p>
        <button disabled={working} onClick={() => appendNote(`בדיקת מערכת ראשונית: ${assessment.recommendedKwp} kWp. צריכה ${monthlyKwh} קוט״ש/חודש, ${daytime}% ביום, הנחת תפוקה ${yieldPerDay} קוט״ש/kWp/יום. טעון סקר גג ופרופיל צריכה.`)} className="mt-2 text-xs font-semibold underline underline-offset-4 disabled:opacity-40">שמירת החישוב בהערות המקומיות</button>
        {onProposal && <button disabled={working} onClick={() => onProposal(assessment.recommendedKwp)} className="mt-3 w-full rounded-lg bg-[#24463E] px-3 py-2.5 text-xs font-medium text-[#FFF4E2] disabled:opacity-40">פתיחת טיוטת הצעה עם הגודל הזה</button>}
      </div> : <p className="mt-3 text-xs text-[#27342F]/60">{summary.estimatedCapacityKwp == null ? 'השלימו את בדיקת המתאר לפני המלצה.' : 'הזינו צריכה תקינה כדי לקבל גודל ראשוני לבדיקה.'}</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-[#27342F]/60">60% ו־4 הם ערכי פתיחה הניתנים לשינוי, לא מדידה של הנכס. החישוב משתמש ב־30 יום; אינו כולל אגירה, הצללות או התאמה לפי שעות. תכנון סופי מחייב סקר ונתוני צריכה.</p>
    </div>

    <div className="border-t border-[#24463E]/15 pt-4">
      <h3 className="flex items-center gap-2 font-semibold text-sm"><UserSearch size={16} /> 3. מי הבעלים?</h3>
      <p className="mt-2 inline-block rounded bg-[#C79942]/15 px-2 py-1 text-xs font-medium text-[#775711]">בעלות טרם אומתה</p>
      <p className="mt-2 text-xs leading-relaxed text-[#27342F]/65">שם עסק, חברה רשומה או טלפון הם קצה חוט. יש לאמת בנפרד את הבעלים ואת מי שמוסמך לאשר התקנה.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {c.lat != null && c.lon != null && <a className={linkClass} href={`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> זיהוי הנכס במפות</a>}
        {c.name && <a className={linkClass} href={`https://www.google.com/search?q=${encodeURIComponent(`${c.name} ${c.area_name || 'Koh Phangan'} owner contact`)}`} target="_blank" rel="noopener noreferrer"><Search size={12} /> חיפוש עסק ואיש קשר</a>}
        <a className={linkClass} href="https://datawarehouse.dbd.go.th/" target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> מרשם חברות DBD</a>
        <a className={linkClass} href="https://www.dol.go.th/" target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> בירור מסמך בעלות</a>
      </div>
      <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void lookup() }}>
        <label className="block text-xs">אתר העסק לחיפוש פרטי חברה
          <input type="text" inputMode="url" value={website} disabled={researchBusy} onChange={(e) => { setWebsite(e.target.value); setResearch(null) }} placeholder="https://example.com" className={inputClass} dir="ltr" />
        </label>
        <label className="block text-xs">או מספר חברה בתאילנד, 13 ספרות
          <input type="text" inputMode="numeric" pattern="[0-9]{13}" maxLength={13} value={juristicId} disabled={researchBusy} onChange={(e) => { setJuristicId(e.target.value); setResearch(null) }} className={inputClass} dir="ltr" />
        </label>
        <button disabled={researchBusy || !researchAllowed} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#24463E]/30 bg-white text-sm font-medium disabled:opacity-40">
          {researchBusy ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} {researchBusy ? 'מחפש פרטי חברה…' : 'חיפוש פרטי חברה ממקור ציבורי'}
        </button>
      </form>
      {research && <div className="mt-3 rounded-lg bg-white p-3 text-xs leading-relaxed" role="status">
        {research.configured && research.data && Object.values(research.data).some((value) => typeof value === 'string' && value.trim()) ? <>
          <p className="font-semibold">נמצאו פרטי עסק — יש לאמת את הקשר לנכס</p>
          <dl className="mt-2 space-y-1">
            {research.data.companyLegalName && <div><dt className="inline text-[#27342F]/55">שם חברה: </dt><dd className="inline">{research.data.companyLegalName}</dd></div>}
            {research.data.registrationNo && <div><dt className="inline text-[#27342F]/55">מספר חברה: </dt><dd className="inline" dir="ltr">{research.data.registrationNo}</dd></div>}
            {research.data.businessPhone && <div><dt className="inline text-[#27342F]/55">טלפון העסק: </dt><dd className="inline" dir="ltr">{research.data.businessPhone}</dd></div>}
            {research.data.registeredAddress && <div><dt className="inline text-[#27342F]/55">כתובת רשומה: </dt><dd className="inline">{research.data.registeredAddress}</dd></div>}
          </dl>
          <p className="mt-2 text-[#27342F]/60">מקור: {research.source === 'dbd' ? 'מרשם חברות DBD' : 'אתר עסק ציבורי'}. אין כאן אימות בעלות.</p>
          <p className="mt-1 break-all text-[#27342F]/60" dir="ltr">{research.target}</p>
          <button onClick={() => appendNote(`מחקר חברה — בעלות לא אומתה. ${Object.entries(research.data ?? {}).map(([key, value]) => `${key}: ${value}`).join('; ')}. מקור: ${research.target ?? websiteUrl ?? 'DBD'}. נבדק: ${new Date().toLocaleDateString('he-IL')}`)} className="mt-2 font-semibold underline underline-offset-4">שמירת הממצא בהערות המקומיות</button>
        </> : <p>{research.error || 'שירות חיפוש החברה לא סיפק מידע. אפשר להמשיך באמצעות קישורי המחקר ולתעד את המקור בהערות.'}</p>}
      </div>}
      <p className="mt-3 text-[11px] text-[#27342F]/60">תיעוד המחקר כאן נשמר בדפדפן. לאחר אימות, הוסיפו את הגג ל־CRM להמשך ניהול הבעלים והפנייה.</p>
    </div>
  </section>
}
