/** Controlled filters for the roofs currently loaded in the map viewport. */
import { RotateCcw, Search } from 'lucide-react'
import { CAT_ICONS, CATEGORY_LABELS, DEFAULT_FILTERS, GRADES, GRADE_COLORS } from '../../../lib/scan-review'
import type { Grade, ScanFilters } from '../../../lib/scan-review'

interface Props {
  filters: ScanFilters
  onChange: (next: ScanFilters) => void
  counts: { filtered: number; total: number; pvExcluded: number }
  onSearchEnter: () => void
}

const fieldClass = 'min-h-9 rounded-md border border-[#24463E]/20 bg-white px-2.5 py-1.5 text-xs text-[#27342F] focus:outline-2 focus:outline-[#24463E]/50'

export function ScanFilterBar({ filters, onChange, counts, onSearchEnter }: Props) {
  const set = <K extends keyof ScanFilters>(key: K, value: ScanFilters[K]) => onChange({ ...filters, [key]: value })
  const toggleGrade = (grade: Grade) => {
    const next = filters.grades.includes(grade) ? filters.grades.filter((value) => value !== grade) : [...filters.grades, grade]
    set('grades', next.length ? next : [grade])
  }
  const hasFilters = filters.search !== '' || filters.category !== 'all' || filters.minKwp !== 0 || filters.minScore !== 0
    || filters.includeSolar !== DEFAULT_FILTERS.includeSolar || filters.showInCrm !== DEFAULT_FILTERS.showInCrm
    || filters.grades.length !== GRADES.length

  return (
    <div dir="rtl" className="space-y-3 border-b border-[#24463E]/15 bg-[#FFF4E2] p-3.5 text-[#27342F]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">נכסים לבדיקה</p>
          <p className="mt-0.5 text-[10px] text-[#27342F]/65">הסינון חל על המועמדים שנטענו באזור המפה</p>
        </div>
        {hasFilters && <button type="button" onClick={() => onChange({ ...DEFAULT_FILTERS, grades: [...DEFAULT_FILTERS.grades] })} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-[#24463E] hover:bg-[#24463E]/5 focus-visible:outline-2 focus-visible:outline-[#24463E]"><RotateCcw size={12} aria-hidden="true" /> איפוס</button>}
      </div>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#24463E]/60" aria-hidden="true" />
        <input type="search" value={filters.search} onChange={(event) => set('search', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onSearchEnter() } }} placeholder="חיפוש לפי שם, אזור או מזהה" className={`${fieldClass} w-full pe-3 ps-9`} aria-label="חיפוש נכסים לפי שם, אזור או מזהה" title="לחיצה על Enter תתמקד בתוצאה הראשונה במפה" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-[10px] font-medium text-[#27342F]/70">עדיפות סריקה</legend>
          <div className="flex gap-1.5" dir="ltr">
            {GRADES.map((grade) => {
              const active = filters.grades.includes(grade)
              return <button type="button" key={grade} onClick={() => toggleGrade(grade)} aria-pressed={active} aria-label={`עדיפות ${grade}`} title={`עדיפות ${grade} · לחיצה להצגה או הסתרה`} className="h-9 w-9 rounded-md border text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#24463E]" style={{ borderColor: active ? GRADE_COLORS[grade] : '#24463E30', backgroundColor: active ? `${GRADE_COLORS[grade]}40` : '#FFFFFF70', color: active ? '#1F352D' : '#5E6D63' }}>{grade}</button>
            })}
          </div>
        </fieldset>
        <label className="flex min-w-[130px] flex-1 flex-col gap-1.5 text-[10px] font-medium text-[#27342F]/70">
          סוג הנכס
          <select value={filters.category} onChange={(event) => set('category', event.target.value)} className={`${fieldClass} w-full`}>
            <option value="all">כל סוגי הנכסים</option>
            {Object.keys(CAT_ICONS).map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category] || category}</option>)}
          </select>
        </label>
      </div>

      <details className="group rounded-md border border-[#24463E]/10 bg-white/45">
        <summary className="cursor-pointer px-2.5 py-2 text-[11px] font-medium text-[#24463E] focus-visible:outline-2 focus-visible:outline-[#24463E]">
          סינון נוסף{filters.minKwp > 0 || filters.minScore > 0 || filters.includeSolar || filters.showInCrm ? ' · פעיל' : ''}
        </summary>
        <div className="space-y-3 px-2.5 pb-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-w-0 flex-col gap-1.5 text-[10px] text-[#27342F]/70"><span>מינימום פוטנציאל <bdi>(kWp)</bdi></span><input type="number" min={0} step={1} value={filters.minKwp} onChange={(event) => set('minKwp', Math.max(0, Number(event.target.value) || 0))} className={`${fieldClass} w-full tabular-nums`} /></label>
            <label className="flex min-w-0 flex-col gap-1.5 text-[10px] text-[#27342F]/70"><span>ציון סריקה מינימלי: <bdi>{filters.minScore}</bdi></span><span className="flex min-h-9 items-center"><input type="range" min={0} max={100} step={5} value={filters.minScore} onChange={(event) => set('minScore', Number(event.target.value))} className="w-full accent-[#24463E]" aria-valuetext={`${filters.minScore} מתוך 100`} /></span></label>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#27342F]/80">
            <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={filters.includeSolar} onChange={(event) => set('includeSolar', event.target.checked)} className="h-3.5 w-3.5 accent-[#24463E]" /> כולל גגות עם פאנלים</label>
            <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={filters.showInCrm} onChange={(event) => set('showInCrm', event.target.checked)} className="h-3.5 w-3.5 accent-[#24463E]" /> כולל נכסים שב־CRM</label>
          </div>
        </div>
      </details>
      <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-[#27342F]/65" role="status" aria-live="polite" aria-atomic="true">
        <span><strong className="text-xs font-semibold tabular-nums text-[#24463E]">{counts.filtered.toLocaleString('he-IL')}</strong> תוצאות מתוך {counts.total.toLocaleString('he-IL')} שנטענו</span>
        {!filters.includeSolar && counts.pvExcluded > 0 && <span>{counts.pvExcluded.toLocaleString('he-IL')} עם פאנלים מוסתרים</span>}
      </p>
    </div>
  )
}
