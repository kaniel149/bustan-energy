import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { useAppStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { identifyUser, resetAnalytics } from '../lib/analytics'
import { getCrmProjects } from '../lib/crm-service'
import { useRealtimeSync } from '../lib/realtime'
import { isBustanConnected, bustanSupabase } from '../lib/bustan-supabase'
import { fetchBustanLeads, mapLeadToProperty, fetchScanRequests, fetchScanCandidates } from '../lib/bustan-crm-service'
import type { Property, ScanRequest } from '../types'
import { parseColliersMarkdown, attachGeocodes, colliersToProperties } from '../lib/colliers'
import { useColliersGeocodes } from '../hooks/useColliersGeocodes'
import { fetchCurrentRole } from '../lib/bustan-permissions'
import { useBustanStore } from '../lib/bustan-store'
import { can } from '../lib/bustan-permissions'
import { Toast } from '../components/Toast'
import { CandidateReviewPanel } from '../components/Candidates/CandidateReviewPanel'
import { FloatingPanel, PanelDock } from '../components/ui/FloatingPanel'
const BustanLeadEditor = lazy(() =>
  import('../components/CRM/BustanLeadEditor').then((m) => ({ default: m.BustanLeadEditor })),
)
const BustanDashboard = lazy(() => import('../components/CRM/BustanDashboard'))
const BustanLeadsTable = lazy(() => import('../components/CRM/BustanLeadsTable'))

const SolarMap = lazy(() => import('../components/Map/SolarMap').then((m) => ({ default: m.SolarMap })))
const FilterBar = lazy(() => import('../components/FilterBar/FilterBar').then((m) => ({ default: m.FilterBar })))
const PropertySidebar = lazy(() => import('../components/Sidebar/PropertySidebar').then((m) => ({ default: m.PropertySidebar })))
const LoginModal = lazy(() => import('../components/Auth/LoginModal').then((m) => ({ default: m.LoginModal })))
const CRMPanel = lazy(() => import('../components/CRM/CRMPanel').then((m) => ({ default: m.CRMPanel })))
const Scanner = lazy(() => import('../components/Scanner/Scanner').then((m) => ({ default: m.Scanner })))
const MobileBottomNav = lazy(() => import('../components/MobileNav/MobileBottomNav').then((m) => ({ default: m.MobileBottomNav })))
const CRMDashboard = lazy(() => import('../components/CRM/Dashboard'))
const CRMPipeline = lazy(() => import('../components/CRM/Pipeline'))
const ColliersPortfolio = lazy(() =>
  import('../components/Colliers/ColliersPortfolio').then((m) => ({ default: m.ColliersPortfolio })),
)

// Scan status chip styles
const SCAN_CHIP: Record<string, { cls: string; icon: string }> = {
  queued:  { cls: 'bg-white/10 text-white/60',       icon: '⏳' },
  running: { cls: 'bg-[#3B82F6]/20 text-[#60A5FA]', icon: '🔄' },
  done:    { cls: 'bg-[#2ED89A]/20 text-[#2ED89A]', icon: '✅' },
  failed:  { cls: 'bg-red-500/20 text-red-400',      icon: '❌' },
}

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
  const setFilter = useAppStore((s) => s.setFilter)
  const setScanRequests = useAppStore((s) => s.setScanRequests)
  const scanRequests = useAppStore((s) => s.scanRequests)
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

  // Load scan candidates — live source (bustan.scan_candidates, status='pending').
  // Falls back to the static /data/roof-candidates.json if no live candidates are
  // found (graceful: the json may be absent). Auto-enables the roof-detection layer
  // when live candidates exist so the user sees them without toggling a filter.
  const setRoofCandidates = useAppStore((s) => s.setRoofCandidates)
  // Ref used to gate the poll effect: polling only starts after the initial load
  // completes, preventing a race where the poll runs before the first fetch is done.
  const hasInitialLoadRef = useRef(false)
  useEffect(() => {
    if (!user || !isBustanConnected()) {
      // Not authenticated — try the static json fallback only
      let cancelled = false
      fetch('/data/roof-candidates.json')
        .then((r) => (r.ok ? r.json() : []))
        .then((rows) => {
          if (cancelled || !Array.isArray(rows)) return
          setRoofCandidates(rows.map((r: Record<string, unknown>) => ({ ...r, type: 'roof', status: 'private' })) as Property[])
          hasInitialLoadRef.current = true
        })
        .catch(() => { hasInitialLoadRef.current = true /* no candidate file — fine */ })
      return () => { cancelled = true }
    }

    let cancelled = false

    const loadCandidates = async () => {
      try {
        const live = await fetchScanCandidates()
        if (cancelled) return
        if (live.length > 0) {
          setRoofCandidates(live)
          // Auto-enable the detection layer so candidates are immediately visible
          setFilter('showRoofDetection', true)
        } else {
          // No live candidates — try static json as a fallback (best-effort)
          fetch('/data/roof-candidates.json')
            .then((r) => (r.ok ? r.json() : []))
            .then((rows) => {
              if (cancelled || !Array.isArray(rows)) return
              setRoofCandidates(rows.map((r: Record<string, unknown>) => ({ ...r, type: 'roof', status: 'private' })) as Property[])
            })
            .catch(() => { /* no candidate file — fine */ })
        }
      } catch {
        /* fetchScanCandidates failure is non-fatal */
      } finally {
        if (!cancelled) hasInitialLoadRef.current = true
      }
    }

    void loadCandidates()
    return () => { cancelled = true }
  }, [user, setRoofCandidates, setFilter])

  // Stable ref so the poll interval callback can read the latest scanRequests without
  // being in the dep array (which would tear down and recreate the interval each cycle).
  const scanRequestsRef = useRef(scanRequests)
  scanRequestsRef.current = scanRequests

  // Poll candidates + scan-request status while any scan is queued or running.
  // Stops automatically when all scans are in a terminal state (done/failed).
  // This makes new candidates appear without a manual reload after a scan finishes.
  // Does NOT start until the initial load has completed (hasInitialLoadRef guard).
  useEffect(() => {
    if (!user || !isBustanConnected()) return
    // Gate: do not start interval before initial load populates the candidates
    if (!hasInitialLoadRef.current) return
    const activeScans = scanRequestsRef.current.filter((s) => s.status === 'queued' || s.status === 'running')
    if (activeScans.length === 0) return

    let cancelled = false
    const interval = setInterval(async () => {
      if (cancelled) return
      try {
        const [requests, candidates] = await Promise.all([fetchScanRequests(), fetchScanCandidates()])
        if (cancelled) return
        setScanRequests(requests)
        // MERGE: add newly returned candidates, keep existing ones the poll didn't return.
        // Never wipe candidates when the poll returns an empty array.
        if (candidates.length > 0) {
          const prev = useAppStore.getState().roofCandidates
          const merged = [
            ...candidates,
            ...prev.filter((p) => !candidates.some((c) => c.id === p.id)),
          ]
          setRoofCandidates(merged)
          setFilter('showRoofDetection', true)
        }
      } catch {
        /* non-fatal — keep polling */
      }
    }, 20_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // scanRequests intentionally excluded — read via scanRequestsRef to avoid
    // tearing down the interval on every poll cycle.
  }, [user, setScanRequests, setRoofCandidates, setFilter])

  // Load Colliers dataset — independent of demo/bustan loads, runs once.
  // Uses shared geocode hook to fetch both precise (URL-keyed) and district
  // maps, then maps to Property[]. Graceful: failures leave colliersProperties empty.
  const { precise: colliersPrecise, district: colliersDistrict, loading: colliersGeoLoading } = useColliersGeocodes()
  const setColliersProperties = useAppStore((s) => s.setColliersProperties)
  useEffect(() => {
    if (colliersGeoLoading) return
    let cancelled = false
    async function loadColliers() {
      try {
        const mdRes = await fetch('/data/colliers-listings.md')
        if (cancelled) return
        if (!mdRes.ok) return

        const md = await mdRes.text()
        if (cancelled) return

        const parsed = parseColliersMarkdown(md)
        const geocoded = attachGeocodes(parsed, colliersPrecise, colliersDistrict)
        const props = colliersToProperties(geocoded)
        setColliersProperties(props)
      } catch {
        // best-effort — no Colliers data is a graceful degradation
      }
    }
    loadColliers()
    return () => { cancelled = true }
  }, [colliersGeoLoading, colliersPrecise, colliersDistrict, setColliersProperties])

  // Load the live Bustan CRM leads (bustan schema) once authenticated.
  // Additive + reversible: RLS returns nothing when unauthenticated, so the
  // static demo data above is preserved; real 85 leads replace it on sign-in.
  const setBustanLeads = useBustanStore((s) => s.setLeads)
  const setBustanRole = useBustanStore((s) => s.setRole)
  const hasBustanLeads = useBustanStore((s) => Object.keys(s.leadsById).length > 0)
  useEffect(() => {
    if (!user || !isBustanConnected()) return
    let cancelled = false
    const load = async () => {
      try {
        const [leads, role] = await Promise.all([fetchBustanLeads(), fetchCurrentRole()])
        if (cancelled) return
        // Always apply the role so role-gated UI (admin actions etc.) is never
        // suppressed by an empty lead list. The role comes from bustan.app_users
        // and is independent of how many leads are currently in the pipeline.
        setBustanRole(role)
        if (leads.length > 0) {
          setBustanLeads(leads)
          setProperties(leads.map(mapLeadToProperty))
          setDataStatus('loaded')
        }
      } catch (err) {
        console.error('Failed to load Bustan leads:', err)
      }
    }
    load()
    fetchScanRequests().then((r) => { if (!cancelled) setScanRequests(r) }).catch(() => { /* ignore */ })
    // Re-load when the bustan session becomes available. On a page reload the
    // MAIN session restores synchronously (so `user` is set immediately) but the
    // separate bustan client restores its session asynchronously — the initial
    // load() above can run while the bustan client is still anon (→ 0 leads →
    // demo data sticks). onAuthStateChange fires INITIAL_SESSION/SIGNED_IN/
    // TOKEN_REFRESHED with the bustan session once it's ready, so we re-load then.
    if (!bustanSupabase) {
      return () => { cancelled = true }
    }
    const { data: { subscription: bustanSub } } = bustanSupabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) load()
    })
    return () => {
      cancelled = true
      bustanSub.unsubscribe()
    }
  }, [user, setProperties, setBustanLeads, setBustanRole, setScanRequests])

  const isMapView = platformView === 'map'
  const filters = useAppStore((s) => s.filters)
  const roofCandidates = useAppStore((s) => s.roofCandidates)
  const bustanRole = useBustanStore((s) => s.role)
  const canScanReview = can(bustanRole, 'crm.edit')
  const setMapFlyToBbox = useAppStore((s) => s.setMapFlyToBbox)

  useEffect(() => {
    if (isMapView) setHasLoadedMap(true)
  }, [isMapView])

  // Clear roof candidates when the detection layer is toggled off or when
  // the user navigates away from the map, to avoid stale markers on return.
  useEffect(() => {
    if (!filters.showRoofDetection || platformView !== 'map') {
      setRoofCandidates([])
    }
  }, [filters.showRoofDetection, platformView, setRoofCandidates])

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

      {/* Bustan CRM lead editor — Scanner/CRM view only (Map uses PropertySidebar)
          so the two detail panels never overlap. */}
      {selectedProperty && platformView === 'scanner' && (
        <Suspense fallback={null}>
          <BustanLeadEditor />
        </Suspense>
      )}

      {/* Global toast (CRM writes) */}
      <Toast />

      {/* Scanner view — Bustan leads table when live leads loaded, else legacy scanner */}
      {platformView === 'scanner' && (
        hasBustanLeads ? (
          <div className="absolute inset-0 top-[52px] z-10 bg-[#0A1628]">
            <Suspense fallback={<ViewLoader />}>
              <BustanLeadsTable />
            </Suspense>
          </div>
        ) : (
          <Suspense fallback={<ViewLoader />}>
            <Scanner />
          </Suspense>
        )
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

      {/* Colliers portfolio view */}
      {platformView === 'colliers' && (
        <div className="absolute inset-0 top-[52px] z-10 bg-[#0A1628] overflow-y-auto">
          <Suspense fallback={<ViewLoader />}>
            <ColliersPortfolio />
          </Suspense>
        </div>
      )}

      {/* Candidate review panel — map view, detection layer on, has candidates, authorised */}
      {isMapView && filters.showRoofDetection && roofCandidates.length > 0 && canScanReview && (
        <CandidateReviewPanel />
      )}

      {/* PropertySidebar — Map view only (Scanner/CRM uses BustanLeadEditor)
          so the two detail panels never overlap. */}
      {selectedProperty && isMapView && (
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

      {/* Scan status — only in map view, when there are scans */}
      {isMapView && scanRequests.length > 0 && (
        <FloatingPanel
          id="scan-status"
          title="Area Scans"
          badge={scanRequests.length}
          defaultPosition={{ x: typeof window !== 'undefined' ? Math.max(window.innerWidth - 272, 16) : 16, y: 80 }}
          minWidth={240}
        >
          <ScanStatusPanel scanRequests={scanRequests} onFlyToBbox={setMapFlyToBbox} />
        </FloatingPanel>
      )}

      {/* Legend — only in map view */}
      {isMapView && (
        <FloatingPanel
          id="map-legend"
          title="Legend"
          defaultPosition={{ x: 16, y: typeof window !== 'undefined' ? window.innerHeight - 340 : 400 }}
          minWidth={180}
        >
          <MapLegend hasLandCandidates={roofCandidates.some((c) => c.type === 'land')} />
        </FloatingPanel>
      )}

      {/* Panel dock — reopen chips for closed floating panels */}
      <PanelDock />
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

// ── Scan status panel — body only (wrapped in FloatingPanel in PlatformPage) ──
function ScanStatusPanel({
  scanRequests,
  onFlyToBbox,
}: {
  scanRequests: ScanRequest[]
  onFlyToBbox: (bbox: number[]) => void
}) {
  const [hoveredError, setHoveredError] = useState<string | null>(null)

  return (
    <div className="p-3">
      <div className="space-y-1.5 max-h-52 overflow-y-auto">
        {scanRequests.slice(0, 10).map((s) => {
          const chip = SCAN_CHIP[s.status] ?? SCAN_CHIP.queued
          const hasBbox = Array.isArray(s.bbox) && s.bbox.length >= 4
          const candidateCount = typeof s.counts?.candidates === 'number'
            ? s.counts.candidates
            : typeof s.counts?.inserted === 'number'
            ? s.counts.inserted
            : null

          return (
            <div
              key={s.id}
              className={`flex items-center gap-2 text-[11px] rounded-lg px-2 py-1.5 transition-colors ${
                hasBbox ? 'hover:bg-white/5 cursor-pointer' : ''
              }`}
              onClick={() => hasBbox && onFlyToBbox(s.bbox!)}
              title={hasBbox ? 'Click to zoom to scan area' : undefined}
            >
              <span className="shrink-0">{s.scan_type === 'land' ? '🌾' : '🏠'}</span>
              <span className="text-white/50 truncate flex-1">
                {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {candidateCount !== null && s.status === 'done' && (
                <span className="text-white/40 shrink-0">+{candidateCount}</span>
              )}
              <div className="relative shrink-0">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-0.5 ${chip.cls}`}
                  onMouseEnter={() => s.status === 'failed' && s.error ? setHoveredError(s.error) : undefined}
                  onMouseLeave={() => setHoveredError(null)}
                >
                  {chip.icon} {s.status}
                </span>
                {hoveredError && s.status === 'failed' && (
                  <div className="absolute right-0 top-6 z-50 bg-[#0A1628] border border-red-500/30 text-red-300 text-[10px] rounded-lg px-3 py-2 w-48 shadow-xl whitespace-normal">
                    {hoveredError}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Map Legend — body only (wrapped in FloatingPanel in PlatformPage) ────────
function MapLegend({ hasLandCandidates }: { hasLandCandidates: boolean }) {
  const [showTier, setShowTier] = useState(false)
  const [showDC, setShowDC] = useState(false)

  return (
    <div className="p-3 max-w-[180px]">
      <div className="space-y-1.5">
        <LegendItem shape="circle" color="#00E676" label="Roof — Priority A" />
        <LegendItem shape="circle" color="#FFD600" label="Roof — Priority B" />
        <LegendItem shape="circle" color="#FF9100" label="Roof — Priority C" />
        <LegendItem shape="circle" color="#FF3D00" label="Roof — Priority D" />
        <LegendItem shape="square" color="#E8A820" label="Land (grid-grade)" />
        <LegendItem shape="line" color="#ff4444" label="Substation" />
        <LegendItem shape="line" color="#ff8800" label="Transmission" />
        <LegendItem shape="line" color="#ffcc00" label="Distribution" />
        <LegendItem shape="line" color="#00aaff" label="Submarine Cable" />
      </div>

      {/* Collapsible DC legend */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <button
          onClick={() => setShowDC((v) => !v)}
          className="text-[10px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1 w-full"
        >
          <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: '#A855F7' }} />
          Data Centers {showDC ? '▲' : '▼'}
        </button>
        {showDC && (
          <div className="mt-1.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#22C55E]/20 text-[#22C55E]">Live</span>
              <span className="text-[9px] text-white/40">Operational</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#3B82F6]/20 text-[#3B82F6]">Build</span>
              <span className="text-[9px] text-white/40">Under construction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/10 text-white/50">Plan</span>
              <span className="text-[9px] text-white/40">Announced</span>
            </div>
            <div className="text-[9px] text-white/30 mt-1">Circle = 10 km radius<br />(estate/address only)</div>
          </div>
        )}
      </div>

      {/* Collapsible tier legend — shown when land candidates are present */}
      {hasLandCandidates && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <button
            onClick={() => setShowTier((v) => !v)}
            className="text-[10px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1 w-full"
          >
            🌾 Land tiers {showTier ? '▲' : '▼'}
          </button>
          {showTier && (
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#E8A820]/20 text-[#E8A820]">Farm</span>
                <span className="text-[9px] text-white/40">≤9 MW</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/20 text-purple-300">Utility</span>
                <span className="text-[9px] text-white/40">DC-scale</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-300">Commercial</span>
                <span className="text-[9px] text-white/40">rooftop C&I</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
