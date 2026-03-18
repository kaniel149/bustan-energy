import { useEffect, useState, lazy, Suspense } from 'react'
import { SolarMap } from '../components/Map/SolarMap'
import { FilterBar } from '../components/FilterBar/FilterBar'
import { PropertySidebar } from '../components/Sidebar/PropertySidebar'
import { LoginModal } from '../components/Auth/LoginModal'
import { CRMPanel } from '../components/CRM/CRMPanel'
import { Scanner } from '../components/Scanner/Scanner'
import { MobileBottomNav } from '../components/MobileNav/MobileBottomNav'
import { useAppStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { loadGridData, loadRoofData, loadLandData, enrichWithGridProximity } from '../lib/load-data'
import { getCrmProjects } from '../lib/crm-service'
import { useRealtimeSync } from '../lib/realtime'

const CRMDashboard = lazy(() => import('../components/CRM/Dashboard'))
const CRMPipeline = lazy(() => import('../components/CRM/Pipeline'))

function ViewLoader() {
  return (
    <div className="absolute inset-0 top-[52px] z-10 bg-[#0A1628] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
        <span className="text-white/40 text-sm">Loading...</span>
      </div>
    </div>
  )
}

export default function PlatformPage() {
  const setProperties = useAppStore((s) => s.setProperties)
  const setGridData = useAppStore((s) => s.setGridData)
  const setUser = useAppStore((s) => s.setUser)
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)
  const setCrmLoading = useAppStore((s) => s.setCrmLoading)
  const platformView = useAppStore((s) => s.platformView)
  const user = useAppStore((s) => s.user)
  const [dataStatus, setDataStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  // Real-time Supabase sync
  useRealtimeSync()

  // Auth listener
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [setUser])

  // Load CRM data when user authenticates
  useEffect(() => {
    if (!user || !supabase) return
    setCrmLoading(true)
    getCrmProjects().then((projects) => {
      setCrmProjects(projects)
      setCrmLoading(false)
    }).catch(() => setCrmLoading(false))
  }, [user, setCrmProjects, setCrmLoading])

  // Load geo data
  useEffect(() => {
    async function init() {
      try {
        const grid = await loadGridData()
        setGridData(grid)
        const roofs = await loadRoofData()
        const lands = await loadLandData()
        const allProperties = [...roofs, ...lands]
        const enriched = enrichWithGridProximity(allProperties, grid)
        setProperties(enriched)
        setDataStatus('loaded')
      } catch (err) {
        console.error('Failed to load data:', err)
        setDataStatus('error')
      }
    }
    init()
  }, [setProperties, setGridData])

  const isMapView = platformView === 'map'

  return (
    <div className="platform-layout bg-[#0A1628] relative">
      {/* Map — always rendered but hidden when not active (preserves state) */}
      <div style={{ display: isMapView ? 'block' : 'none' }} className="absolute inset-0">
        <SolarMap />
      </div>

      {/* FilterBar — always visible */}
      <FilterBar />

      {/* Scanner view */}
      {platformView === 'scanner' && <Scanner />}

      {/* Pipeline view */}
      {platformView === 'pipeline' && (
        <div className="absolute inset-0 top-[52px] z-10 bg-[#0A1628] overflow-hidden">
          <Suspense fallback={<ViewLoader />}>
            <CRMPipeline />
          </Suspense>
        </div>
      )}

      {/* Dashboard view */}
      {platformView === 'dashboard' && (
        <div className="absolute inset-0 top-[52px] z-10 bg-[#0A1628] overflow-y-auto">
          <Suspense fallback={<ViewLoader />}>
            <CRMDashboard />
          </Suspense>
        </div>
      )}

      {/* PropertySidebar — works in map & scanner */}
      {(isMapView || platformView === 'scanner') && <PropertySidebar />}

      {/* CRM Panel overlay — only in map view */}
      {isMapView && <CRMPanel />}

      {/* Login modal */}
      <LoginModal />

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Data loading status */}
      {dataStatus === 'loading' && (
        <div className="absolute bottom-4 right-4 z-10 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 px-4 py-2 flex items-center gap-2 md:bottom-4 bottom-16">
          <div className="w-3 h-3 rounded-full bg-[#E8A820] animate-pulse" />
          <span className="text-white/60 text-xs">Loading data...</span>
        </div>
      )}

      {dataStatus === 'error' && (
        <div className="absolute bottom-4 right-4 z-10 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-red-500/30 px-4 py-2 flex items-center gap-2 md:bottom-4 bottom-16">
          <span className="text-red-400 text-xs">Data loading failed — map only mode</span>
          <button onClick={() => window.location.reload()} className="text-[10px] text-[#E8A820] hover:underline">Retry</button>
        </div>
      )}

      {/* Legend — only in map view */}
      {isMapView && (
        <div className="absolute bottom-4 left-4 z-10 bg-[#0D2137]/90 backdrop-blur-xl rounded-xl border border-white/10 p-3 md:bottom-4 bottom-16">
          <h4 className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Legend</h4>
          <div className="space-y-1.5">
            <LegendItem shape="square" color="#2ED89A" label="Roof (Solar Potential)" />
            <LegendItem shape="circle" color="#E8A820" label="Land (For Sale)" />
            <LegendItem shape="line" color="#ff4444" label="Substation" />
            <LegendItem shape="line" color="#ff8800" label="Transmission Line" />
            <LegendItem shape="line" color="#ffcc00" label="Distribution Line" />
            <LegendItem shape="line" color="#00aaff" label="Submarine Cable" />
          </div>
        </div>
      )}
    </div>
  )
}

function LegendItem({ shape, color, label }: { shape: 'square' | 'circle' | 'line'; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {shape === 'square' && <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />}
      {shape === 'circle' && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />}
      {shape === 'line' && <div className="w-3 h-0.5 rounded" style={{ backgroundColor: color }} />}
      <span className="text-[10px] text-white/60">{label}</span>
    </div>
  )
}
