import { useEffect, useState, lazy, Suspense } from 'react'
import { useAppStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { identifyUser, resetAnalytics } from '../lib/analytics'
import { getCrmProjects } from '../lib/crm-service'
import { useRealtimeSync } from '../lib/realtime'
import { isBustanConnected } from '../lib/bustan-supabase'
import { fetchBustanLeads, mapLeadToProperty } from '../lib/bustan-crm-service'
import { fetchCurrentRole } from '../lib/bustan-permissions'
import { useBustanStore } from '../lib/bustan-store'
import { Toast } from '../components/Toast'
const BustanLeadEditor = lazy(() =>
  import('../components/CRM/BustanLeadEditor').then((m) => ({ default: m.BustanLeadEditor })),
)
const BustanDashboard = lazy(() => import('../components/CRM/BustanDashboard'))

const SolarMap = lazy(() => import('../components/Map/SolarMap').then((m) => ({ default: m.SolarMap })))
const FilterBar = lazy(() => import('../components/FilterBar/FilterBar').then((m) => ({ default: m.FilterBar })))
const PropertySidebar = lazy(() => import('../components/Sidebar/PropertySidebar').then((m) => ({ default: m.PropertySidebar })))
const LoginModal = lazy(() => import('../components/Auth/LoginModal').then((m) => ({ default: m.LoginModal })))
const CRMPanel = lazy(() => import('../components/CRM/CRMPanel').then((m) => ({ default: m.CRMPanel })))
const Scanner = lazy(() => import('../components/Scanner/Scanner').then((m) => ({ default: m.Scanner })))
const MobileBottomNav = lazy(() => import('../components/MobileNav/MobileBottomNav').then((m) => ({ default: m.MobileBottomNav })))
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
  const selectedProperty = useAppStore((s) => s.selectedProperty)
  const showCrmPanel = useAppStore((s) => s.showCrmPanel)
  const [dataStatus, setDataStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [hasLoadedMap, setHasLoadedMap] = useState(platformView === 'map')

  // Real-time Supabase sync
  useRealtimeSync()

  // Auth listener
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        identifyUser(u.id, { email: u.email })
      } else {
        resetAnalytics()
      }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        identifyUser(u.id, { email: u.email })
      }
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
        const {
          loadGridData,
          loadRoofData,
          loadLandData,
          enrichWithGridProximity,
        } = await import('../lib/load-data')
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

  // Load the live Bustan CRM leads (bustan schema) once authenticated.
  // Additive + reversible: RLS returns nothing when unauthenticated, so the
  // static demo data above is preserved; real 85 leads replace it on sign-in.
  const setBustanLeads = useBustanStore((s) => s.setLeads)
  const setBustanRole = useBustanStore((s) => s.setRole)
  const hasBustanLeads = useBustanStore((s) => Object.keys(s.leadsById).length > 0)
  useEffect(() => {
    if (!user || !isBustanConnected()) return
    let cancelled = false
    Promise.all([fetchBustanLeads(), fetchCurrentRole()])
      .then(([leads, role]) => {
        if (cancelled || leads.length === 0) return
        setBustanLeads(leads)
        setBustanRole(role)
        setProperties(leads.map(mapLeadToProperty))
        setDataStatus('loaded')
      })
      .catch((err) => console.error('Failed to load Bustan leads:', err))
    return () => {
      cancelled = true
    }
  }, [user, setProperties, setBustanLeads, setBustanRole])

  const isMapView = platformView === 'map'

  useEffect(() => {
    if (isMapView) setHasLoadedMap(true)
  }, [isMapView])

  return (
    <div className="platform-layout bg-[#0A1628] relative">
      {/* Map — lazy loaded on first map visit, then hidden when inactive to preserve state */}
      {hasLoadedMap && (
        <div style={{ display: isMapView ? 'block' : 'none' }} className="absolute inset-0">
          <Suspense fallback={<ViewLoader />}>
            <SolarMap />
          </Suspense>
        </div>
      )}

      {/* FilterBar — always visible */}
      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      {/* Bustan CRM lead editor — shows for the selected live lead (map/scanner) */}
      {selectedProperty && (isMapView || platformView === 'scanner') && (
        <Suspense fallback={null}>
          <BustanLeadEditor />
        </Suspense>
      )}

      {/* Global toast (CRM writes) */}
      <Toast />

      {/* Scanner view */}
      {platformView === 'scanner' && (
        <Suspense fallback={<ViewLoader />}>
          <Scanner />
        </Suspense>
      )}

      {/* Pipeline view */}
      {platformView === 'pipeline' && (
        <div className="absolute inset-0 top-[52px] z-10 bg-[#0A1628] overflow-hidden">
          <Suspense fallback={<ViewLoader />}>
            <CRMPipeline />
          </Suspense>
        </div>
      )}

      {/* Dashboard view — Bustan dashboard when live leads are loaded, else legacy */}
      {platformView === 'dashboard' && (
        <div className="absolute inset-0 top-[52px] z-10 bg-[#0A1628] overflow-y-auto">
          <Suspense fallback={<ViewLoader />}>
            {hasBustanLeads ? <BustanDashboard /> : <CRMDashboard />}
          </Suspense>
        </div>
      )}

      {/* PropertySidebar — works in map & scanner */}
      {selectedProperty && (isMapView || platformView === 'scanner') && (
        <Suspense fallback={null}>
          <PropertySidebar />
        </Suspense>
      )}

      {/* CRM Panel overlay — only in map view */}
      {isMapView && showCrmPanel && (
        <Suspense fallback={null}>
          <CRMPanel />
        </Suspense>
      )}

      {/* Login modal */}
      <Suspense fallback={null}>
        <LoginModal />
      </Suspense>

      {/* Mobile bottom nav */}
      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>

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
