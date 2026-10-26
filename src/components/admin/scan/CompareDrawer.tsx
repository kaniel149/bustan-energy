/** Compare scan evidence without treating roof estimates or contact data as verified. */
import { X } from 'lucide-react'
import type { ScanCandidate } from '../../../lib/bustan-crm-service'
import { categoryLabel, displayName, footprintLabel, gradeOf, GRADES, GRADE_COLORS, sizingSummary, solarCheckLabel } from '../../../lib/scan-review'

interface Props {
  items: ScanCandidate[]
  onRemove: (id: string) => void
  onClear: () => void
}

const format = (value: number | null, unit = '') => value == null ? 'לא אומת' : `${value.toLocaleString('he-IL', { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ''}`
const ROWS: { label: string; value: (c: ScanCandidate) => string; emphasis?: boolean; direction?: 'ltr' }[] = [
  { label: 'פוטנציאל על הגג', value: (c) => format(sizingSummary(c).estimatedCapacityKwp, 'kWp'), emphasis: true },
  { label: 'מערכת מומלצת', value: () => 'נדרשים נתוני צריכה וסקר' },
  { label: 'שטח גג', value: (c) => format(sizingSummary(c).roofAreaSqm, 'מ״ר') },
  { label: 'ציון סריקה', direction: 'ltr', value: (c) => c.solar_potential_score == null || !Number.isFinite(Number(c.solar_potential_score)) ? 'לא דורג' : `${Math.round(Number(c.solar_potential_score))} / 100` },
  { label: 'תוואי שזוהה', value: (c) => footprintLabel(c) || 'טרם סווג' },
  { label: 'פאנלים קיימים', value: solarCheckLabel },
  { label: 'סוג הנכס', value: categoryLabel },
  { label: 'אזור', value: (c) => c.area_name || 'לא צוין' },
  { label: 'טלפון שפורסם', direction: 'ltr', value: (c) => c.phone?.trim() || 'לא נמצא' },
  { label: 'זהות הבעלים', value: () => 'טרם אומתה' },
  { label: 'טיפול ב־CRM', value: (c) => c.status === 'added' ? 'הועבר להמשך טיפול' : 'ממתין לבדיקה' },
]

export function CompareDrawer({ items, onRemove, onClear }: Props) {
  if (items.length === 0) return null
  return (
    <section dir="rtl" className="absolute inset-x-0 bottom-0 z-20 max-h-[50%] overflow-auto border-t border-[#24463E]/25 bg-[#FFFCF6] shadow-[0_-8px_28px_#24463E15]" aria-label="השוואת נכסים">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#24463E]/15 bg-[#FFF4E2] px-4 py-3">
        <div><h3 className="text-sm font-bold text-[#27342F]">השוואת נכסים <span className="ms-1 text-xs font-normal text-[#27342F]/60"><bdi dir="ltr">{items.length} / 3</bdi></span></h3><p className="mt-1 text-[10px] leading-relaxed text-[#27342F]/65">אומדני סריקה ראשוניים. גודל מערכת דורש נתוני צריכה וסקר; פרטי קשר אינם אימות בעלות.</p></div>
        <button type="button" onClick={onClear} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-[#24463E]/20 px-2.5 text-[11px] font-semibold text-[#24463E] hover:bg-[#24463E]/5 focus-visible:outline-2 focus-visible:outline-[#24463E]" aria-label="סגירת ההשוואה והסרת כל הנכסים"><X size={13} aria-hidden="true" /> סגירה</button>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="טבלת השוואה; ניתן לגלול לרוחב" >
        <table className="w-full text-start text-xs text-[#27342F]">
          <caption className="sr-only">השוואת שטח גג, פוטנציאל סולארי ופרטי קשר עבור הנכסים שנבחרו</caption>
          <thead>
            <tr className="bg-[#F4EAD8]/30">
              <th scope="col" className="min-w-[125px] px-4 py-3 text-start text-[10px] font-medium text-[#27342F]/65">נתוני הנכס</th>
              {items.map((candidate) => (
                <th key={candidate.id} scope="col" className="min-w-[200px] px-4 py-3 text-start font-semibold">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <span className="block max-w-[220px] break-words leading-relaxed"><bdi>{displayName(candidate)}</bdi></span>
                      <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-[#1F352D]" style={{ backgroundColor: GRADES.some((grade) => grade === candidate.priority) ? `${GRADE_COLORS[gradeOf(candidate)]}40` : '#E7E7DF' }}>{GRADES.some((grade) => grade === candidate.priority) ? `עדיפות ${gradeOf(candidate)}` : 'לא דורג'}</span>
                    </div>
                    <button type="button" onClick={() => onRemove(candidate.id)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#27342F]/60 hover:bg-[#24463E]/10 hover:text-[#27342F] focus-visible:outline-2 focus-visible:outline-[#24463E]" aria-label={`הסרת ${displayName(candidate)} מההשוואה`}><X size={14} aria-hidden="true" /></button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className={`border-t border-[#24463E]/10 ${row.emphasis ? 'bg-[#D8ECE8]/35' : 'even:bg-[#F4EAD8]/15'}`}>
                <th scope="row" className="px-4 py-2.5 text-start text-[11px] font-medium text-[#27342F]/65">{row.label}</th>
                {items.map((candidate) => <td key={candidate.id} className={`px-4 py-2.5 leading-relaxed ${row.emphasis ? 'font-bold text-[#24463E]' : ''}`}><bdi dir={row.direction}>{row.value(candidate)}</bdi></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
