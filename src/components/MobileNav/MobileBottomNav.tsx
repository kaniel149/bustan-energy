import { Map, Grid3X3, Kanban, BarChart3 } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import type { PlatformView } from '../../types'

const NAV_ITEMS: { view: PlatformView; icon: typeof Map; label: string }[] = [
  { view: 'map', icon: Map, label: 'Map' },
  { view: 'scanner', icon: Grid3X3, label: 'Scanner' },
  { view: 'pipeline', icon: Kanban, label: 'Pipeline' },
  { view: 'dashboard', icon: BarChart3, label: 'Dashboard' },
]

export function MobileBottomNav() {
  const platformView = useAppStore((s) => s.platformView)
  const setPlatformView = useAppStore((s) => s.setPlatformView)

  return (
    <div className="mobile-bottom-nav">
      {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
        <button
          key={view}
          onClick={() => setPlatformView(view)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
            platformView === view
              ? 'text-[#00D68F]'
              : 'text-white/40'
          }`}
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  )
}
