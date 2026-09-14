import { useState } from 'react'
import { Ruler, Sun } from 'lucide-react'
import type { ScanCandidate } from '../../../lib/bustan-crm-service'
import { sizingSummary } from '../../../lib/scan-review'
import { assessDemand } from '../../../lib/scan-assessment'
import { OwnerResearchPanel } from './OwnerResearchPanel'

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
  const summary = sizingSummary(c)
  const needsRoofOutline = summary.status === 'needs_roof_verification'
  const assessment = assessDemand(c, { monthlyKwh: Number(monthlyKwh), daytimePercent: Number(daytime), dailyYield: Number(yieldPerDay) })
  const areaValid = area.trim() !== '' && Number.isFinite(Number(area)) && Number(area) > 0 && Number(area) <= 1_000_000
  const appendNote = (text: string) => onNote([note.trim(), text].filter(Boolean).join('\n\n'))
  const inputClass = 'mt-1 w-full rounded-lg border border-[#24463E]/20 bg-white px-2.5 py-2 text-sm text-[#27342F] focus:outline-none focus:ring-2 focus:ring-[#24463E]/25'

  return <section dir="rtl" aria-label="בדיקת הגג והבעלים" className="rounded-xl border border-[#24463E]/25 bg-[#F7F1E5] p-4 text-[#27342F] space-y-5">
    <OwnerResearchPanel candidate={c} canEdit={canEdit} />
    <div className="border-t border-[#24463E]/15 pt-4">
      <h3 className="flex items-center gap-2 font-semibold text-sm"><Ruler size={16} /> 2. בדיקת שטח הגג</h3>
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
      <h3 className="flex items-center gap-2 font-semibold text-sm"><Sun size={16} /> 3. התאמת מערכת לצריכה</h3>
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

  </section>
}
