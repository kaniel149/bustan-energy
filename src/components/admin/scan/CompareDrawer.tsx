/**
 * CompareDrawer — bottom sheet showing up to 3 candidates side by side.
 */
import { X } from 'lucide-react'
import type { ScanCandidate } from '../../../lib/bustan-crm-service'
import { displayName, footprintBadge, gradeOf, hasExistingSolar, GRADE_COLORS } from '../../../lib/scan-review'

interface Props {
  items: ScanCandidate[]
  onRemove: (id: string) => void
  onClear: () => void
}

const ROWS: { label: string; value: (c: ScanCandidate) => string }[] = [
  { label: 'Grade', value: (c) => gradeOf(c) },
  { label: 'kWp', value: (c) => String(Math.round(Number(c.estimated_kwp ?? 0))) },
  { label: 'm²', value: (c) => String(Math.round(Number(c.roof_area_sqm ?? 0))) },
  { label: 'Score', value: (c) => String(Math.round(Number(c.solar_potential_score ?? 0))) },
  { label: 'Footprint', value: (c) => footprintBadge(c) || (c.footprint_class ?? '—') },
  { label: 'PV', value: (c) => (hasExistingSolar(c) ? `yes${c.panel_coverage_pct != null ? ` (${Math.round(Number(c.panel_coverage_pct))}%)` : ''}` : 'no') },
  { label: 'Phone', value: (c) => c.phone ?? '—' },
]

export function CompareDrawer({ items, onRemove, onClear }: Props) {
  if (items.length === 0) return null
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 bg-[#FFF4E2]/95 backdrop-blur border-t border-[#24463E]/20 shadow-2xl max-h-[45%] overflow-auto"
      role="region"
      aria-label="Compare candidates"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#24463E]/10">
        <h3 className="text-sm font-semibold text-[#27342F]">Compare ({items.length}/3)</h3>
        <button onClick={onClear} className="text-xs text-[#24463E] hover:underline">Clear</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs text-[#27342F]">
          <thead>
            <tr>
              <th className="text-left px-4 py-2 font-medium text-[#27342F]/60 w-24" />
              {items.map((c) => (
                <th key={c.id} className="text-left px-4 py-2 font-semibold">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: GRADE_COLORS[gradeOf(c)], color: '#0b1a16' }}
                    >
                      {gradeOf(c)}
                    </span>
                    <span className="truncate max-w-[180px]" title={displayName(c)}>{displayName(c)}</span>
                    <button onClick={() => onRemove(c.id)} className="text-[#27342F]/40 hover:text-[#27342F]" aria-label="Remove from compare">
                      <X size={12} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-t border-[#24463E]/10">
                <td className="px-4 py-1.5 text-[#27342F]/60">{r.label}</td>
                {items.map((c) => <td key={c.id} className="px-4 py-1.5">{r.value(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
