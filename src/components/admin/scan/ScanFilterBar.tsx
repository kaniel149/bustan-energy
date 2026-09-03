/**
 * ScanFilterBar — grade pills, category, min kWp / score, search, PV + CRM
 * toggles for /admin/scan. Pure controlled component over ScanFilters.
 */
import { CAT_ICONS, GRADES, GRADE_COLORS } from '../../../lib/scan-review'
import type { Grade, ScanFilters } from '../../../lib/scan-review'

interface Props {
  filters: ScanFilters
  onChange: (next: ScanFilters) => void
  counts: { filtered: number; total: number; pvExcluded: number }
  onSearchEnter: () => void
}

export function ScanFilterBar({ filters, onChange, counts, onSearchEnter }: Props) {
  const set = <K extends keyof ScanFilters>(k: K, v: ScanFilters[K]) => onChange({ ...filters, [k]: v })
  const toggleGrade = (g: Grade) => {
    const on = filters.grades.includes(g)
    const next = on ? filters.grades.filter((x) => x !== g) : [...filters.grades, g]
    set('grades', next.length ? next : [g]) // never allow an empty grade set
  }

  return (
    <div className="p-3 space-y-2 border-b border-[#24463E]/15 bg-[#FFF4E2]/60">
      <input
        type="search"
        value={filters.search}
        onChange={(e) => set('search', e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSearchEnter() }}
        placeholder="Search name / area / OSM id — Enter flies to first match"
        className="w-full px-3 py-2 rounded-lg bg-white border border-[#24463E]/20 text-sm text-[#27342F] placeholder:text-[#27342F]/40 focus:outline-none focus:border-[#24463E]"
        aria-label="Search candidates"
      />

      <div className="flex items-center gap-1.5 flex-wrap">
        {GRADES.map((g) => {
          const on = filters.grades.includes(g)
          return (
            <button
              key={g}
              onClick={() => toggleGrade(g)}
              className="px-2.5 py-1 rounded-md text-xs font-bold border transition-colors"
              style={{
                borderColor: GRADE_COLORS[g],
                backgroundColor: on ? GRADE_COLORS[g] : 'transparent',
                color: on ? '#0b1a16' : GRADE_COLORS[g],
                opacity: on ? 1 : 0.7,
              }}
              aria-pressed={on}
              title={`Grade ${g}`}
            >
              {g}
            </button>
          )
        })}
        <select
          value={filters.category}
          onChange={(e) => set('category', e.target.value)}
          className="ml-auto px-2 py-1 rounded-md bg-white border border-[#24463E]/20 text-xs text-[#27342F]"
          aria-label="Category"
        >
          <option value="all">All categories</option>
          {Object.keys(CAT_ICONS).map((k) => (
            <option key={k} value={k}>{CAT_ICONS[k]} {k.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-xs text-[#27342F]/70">
          <span className="shrink-0">Min kWp</span>
          <input
            type="number"
            min={0}
            value={filters.minKwp}
            onChange={(e) => set('minKwp', Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-2 py-1 rounded-md bg-white border border-[#24463E]/20 text-xs text-[#27342F]"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-[#27342F]/70">
          <span className="shrink-0">Score ≥ {filters.minScore}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => set('minScore', Number(e.target.value))}
            className="w-full accent-[#24463E]"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs text-[#27342F]/70">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filters.includeSolar} onChange={(e) => set('includeSolar', e.target.checked)} className="accent-[#24463E]" />
          כולל PV קיים
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filters.showInCrm} onChange={(e) => set('showInCrm', e.target.checked)} className="accent-[#24463E]" />
          הצג גם ב-CRM
        </label>
        <span className="ml-auto font-mono text-[#27342F]/60" aria-live="polite">
          {counts.filtered.toLocaleString()} / {counts.total.toLocaleString()}
          {!filters.includeSolar && counts.pvExcluded > 0 && (
            <span className="ml-2 text-red-600/80">PV excluded: {counts.pvExcluded}</span>
          )}
        </span>
      </div>
    </div>
  )
}
