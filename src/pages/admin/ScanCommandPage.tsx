/** Roof discovery → review → demand screening → owner research. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Crosshair, Layers, List, Loader2, Map as MapIcon, RefreshCw, ScanSearch, X } from 'lucide-react'
import { TILE_SOURCES, TILE_MAXZOOM, TILE_ATTRIBUTION } from '../../components/Map/SolarMap'
import { REGIONS } from '../../lib/regions'
import { bustanSupabase, signInBustan } from '../../lib/bustan-supabase'
import { can, fetchCurrentRole } from '../../lib/bustan-permissions'
import type { Role } from '../../lib/bustan-permissions'
import { fetchScanCandidateRows, fetchScanCandidateById, promoteScanCandidate, rejectScanCandidate, updateScanCandidateArea, createScanRequest, fetchScanRequests } from '../../lib/bustan-crm-service'
import type { ScanCandidate, RejectionReason } from '../../lib/bustan-crm-service'
import { applyScanFilters, toFeatureCollection, hasExistingSolar, loadNotes, saveNote, noteKey, DEFAULT_FILTERS, sizingSummary, GRADE_COLORS } from '../../lib/scan-review'
import type { ScanFilters } from '../../lib/scan-review'
import { viewportScanArea } from '../../lib/scan-assessment'
import type { ScanRequest } from '../../types'
import { useAdminStore } from '../../lib/admin-store'
import { ScanFilterBar } from '../../components/admin/scan/ScanFilterBar'
import { CandidateCard } from '../../components/admin/scan/CandidateCard'
import { CompareDrawer } from '../../components/admin/scan/CompareDrawer'
import { RoofAssessment } from '../../components/admin/scan/RoofAssessment'

type Bounds = [[number, number], [number, number]]
const KP = REGIONS.koh_phangan
const PAGE = 80
const SRC = 'cands'
const ROLE_LABEL: Record<Role, string> = { admin: 'מנהל', sales: 'מכירות', engineer: 'מהנדס', viewer: 'צפייה בלבד' }
const STATUS_LABEL = { queued: 'בתור לסריקה', running: 'סריקה מתבצעת', done: 'הסריקה הסתיימה', failed: 'הסריקה נכשלה' }
function boundsOf(map: maplibregl.Map): Bounds {
  const b = map.getBounds()
  return [[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]]
}

function BustanSignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  return <div dir="rtl" className="flex h-full items-center justify-center p-6">
    <form onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError(false)
      try { if (await signInBustan(email.trim(), password)) onDone(); else setError(true) }
      catch { setError(true) } finally { setBusy(false) }
    }} className="w-full max-w-md space-y-4 rounded-2xl border border-[#24463E]/15 bg-[#FFF4E2] p-6 text-[#27342F] shadow-sm">
      <ScanSearch className="text-[#24463E]" size={26} />
      <h1 className="text-xl font-semibold">מגג מזוהה להזדמנות סולארית</h1>
      <p className="text-sm leading-relaxed text-[#27342F]/65">התחברו למאגר הנכסים כדי לסרוק גגות, לבדוק התאמת מערכת ולאתר בעלים. נדרש החיבור לחשבון ה־CRM בנוסף לפאנל הניהול.</p>
      <label className="block text-xs">אימייל<input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="mt-1 w-full rounded-lg border border-[#24463E]/20 bg-white px-3 py-2.5 text-sm" /></label>
      <label className="block text-xs">סיסמה<input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="mt-1 w-full rounded-lg border border-[#24463E]/20 bg-white px-3 py-2.5 text-sm" /></label>
      {error && <p role="alert" className="text-sm text-red-700">ההתחברות לא הושלמה. בדקו את פרטי חשבון ה־CRM ונסו שוב.</p>}
      <button disabled={busy} className="w-full rounded-lg bg-[#24463E] py-3 text-sm font-medium text-[#FFF4E2] disabled:opacity-50">{busy ? 'מתחבר…' : 'כניסה לסורק הגגות'}</button>
    </form>
  </div>
}

export default function ScanCommandPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showToast = useAdminStore((s) => s.showToast)
  const [bustanReady, setBustanReady] = useState<boolean | null>(null)
  const [role, setRole] = useState<Role>('viewer')
  const canEdit = can(role, 'crm.edit') || role === 'engineer'
  const canQuote = can(role, 'crm.quote')
  const [rows, setRows] = useState<ScanCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [zoomTooLow, setZoomTooLow] = useState(false)
  const [filters, setFilters] = useState<ScanFilters>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Store snapshots so comparing roofs survives moving to another viewport.
  const [compared, setCompared] = useState<ScanCandidate[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [working, setWorking] = useState<Record<string, boolean>>({})
  const [visible, setVisible] = useState(PAGE)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')
  const [jobs, setJobs] = useState<ScanRequest[]>([])
  const [jobsError, setJobsError] = useState(false)
  const [jobsOpen, setJobsOpen] = useState(false)
  const [queuing, setQueuing] = useState(false)
  const [minArea, setMinArea] = useState('5')
  const [scanBounds, setScanBounds] = useState<Bounds | null>(null)
  const [mapError, setMapError] = useState(false)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const focusedRef = useRef('')
  const requestRef = useRef<AbortController | null>(null)
  const loadVersion = useRef(0)
  const jobStatuses = useRef(new Map<string, string>())

  const refreshRole = useCallback(async () => {
    setRole(await fetchCurrentRole()); setBustanReady(true)
  }, [])
  useEffect(() => {
    let alive = true
    const check = async () => {
      const { data } = (await bustanSupabase?.auth.getSession()) ?? { data: { session: null } }
      if (!alive) return
      if (!data.session) { setBustanReady(false); return }
      const nextRole = await fetchCurrentRole()
      if (alive) { setRole(nextRole); setBustanReady(true) }
    }
    void check().catch(() => { if (alive) setBustanReady(false) })
    const subscription = bustanSupabase?.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setBustanReady(false); setRows([]); setCompared([]) }
    }).data.subscription
    return () => { alive = false; subscription?.unsubscribe() }
  }, [])
  useEffect(() => { setNotes(loadNotes()) }, [])

  const invalidateLoad = useCallback(() => {
    requestRef.current?.abort(); ++loadVersion.current; setLoading(false)
  }, [])
  const load = useCallback(async (bounds: Bounds) => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const version = ++loadVersion.current
    setLoading(true); setLoadError(false)
    try {
      const data = await fetchScanCandidateRows(bounds, ['pending', 'added'], controller.signal)
      if (version !== loadVersion.current || controller.signal.aborted) return
      setRows(data); setVisible(PAGE)
      setCompared((previous) => previous.map((row) => data.find((next) => next.id === row.id) ?? row))
    } catch {
      if (version === loadVersion.current && !controller.signal.aborted) { setLoadError(true); setRows([]) }
    } finally { if (version === loadVersion.current) setLoading(false) }
  }, [])
  const reloadViewport = useCallback(() => {
    const map = mapRef.current
    if (!map) { void load(KP.bounds); return }
    if (map.getZoom() < 11) return
    void load(boundsOf(map))
  }, [load])
  const loadJobs = useCallback(async () => {
    try {
      const next = (await fetchScanRequests()).filter((job) => job.scan_type !== 'land')
      const completed = next.some((job) => job.status === 'done' && ['queued', 'running'].includes(jobStatuses.current.get(job.id) ?? ''))
      jobStatuses.current = new Map(next.map((job) => [job.id, job.status]))
      setJobs(next); setJobsError(false)
      if (completed) reloadViewport()
    } catch { setJobsError(true) }
  }, [reloadViewport])
  useEffect(() => {
    if (!bustanReady) return
    void loadJobs()
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void loadJobs() }, 15_000)
    return () => clearInterval(interval)
  }, [bustanReady, loadJobs])

  const filtered = useMemo(() => applyScanFilters(rows, filters), [rows, filters])
  const pvExcluded = useMemo(() => rows.filter((c) => c.status !== 'rejected' && hasExistingSolar(c)).length, [rows])
  const capacity = useMemo(() => filtered.reduce((sum, c) => sum + (sizingSummary(c).estimatedCapacityKwp ?? 0), 0), [filtered])
  const contacts = filtered.filter((c) => c.phone || c.website).length
  const activeJobs = jobs.filter((job) => job.status === 'queued' || job.status === 'running').length
  const areaToScan = scanBounds ? viewportScanArea(scanBounds) : null

  useEffect(() => {
    if (!bustanReady || !containerRef.current) return
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: { version: 8, sources: { sat: { type: 'raster', tiles: TILE_SOURCES.esri, tileSize: 256, maxzoom: TILE_MAXZOOM.esri, attribution: TILE_ATTRIBUTION } }, layers: [{ id: 'sat', type: 'raster', source: 'sat' }] },
        center: KP.center, zoom: 12,
      })
    } catch { setMapError(true); void load(KP.bounds); return }
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')
    map.on('error', () => setMapError(true))
    map.on('load', () => {
      map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'cand-fill', type: 'fill', source: SRC, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.28 } })
      map.addLayer({ id: 'cand-line', type: 'line', source: SRC, filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': ['get', 'color'], 'line-width': 1.7 } })
      map.addLayer({ id: 'cand-pt', type: 'circle', source: SRC, filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': ['get', 'color'], 'circle-radius': 6, 'circle-stroke-color': '#24463E', 'circle-stroke-width': 1 } })
      map.addLayer({ id: 'cand-selected', type: 'line', source: SRC, filter: ['==', ['get', 'id'], ''], paint: { 'line-color': '#ffffff', 'line-width': 4 } })
      map.addLayer({ id: 'cand-selected-pt', type: 'circle', source: SRC, filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], '']], paint: { 'circle-radius': 10, 'circle-color': 'transparent', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } })
      for (const layer of ['cand-fill', 'cand-pt']) {
        map.on('click', layer, (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined
          if (id) { setSelectedId(id); setMobileView('list') }
        })
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      }
      setMapReady(true)
      setScanBounds(boundsOf(map))
      void load(boundsOf(map))
    })
    let timer: ReturnType<typeof setTimeout> | undefined
    map.on('moveend', () => {
      clearTimeout(timer)
      invalidateLoad()
      setScanBounds(boundsOf(map))
      if (map.getZoom() < 11) { setZoomTooLow(true); setRows([]); return }
      setZoomTooLow(false)
      timer = setTimeout(() => void load(boundsOf(map)), 350)
    })
    const resize = new ResizeObserver(() => map.resize())
    resize.observe(containerRef.current)
    return () => {
      clearTimeout(timer); resize.disconnect(); invalidateLoad()
      map.remove(); mapRef.current = null; setMapReady(false)
    }
  }, [bustanReady, load, invalidateLoad])
  useEffect(() => {
    const source = mapRef.current?.getSource(SRC) as maplibregl.GeoJSONSource | undefined
    if (mapReady) source?.setData(toFeatureCollection(filtered))
  }, [filtered, mapReady])
  useEffect(() => {
    const map = mapRef.current
    if (mapReady && map?.getLayer('cand-selected')) {
      map.setFilter('cand-selected', ['==', ['get', 'id'], selectedId ?? ''])
      map.setFilter('cand-selected-pt', ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'id'], selectedId ?? '']])
    }
    const index = filtered.findIndex((row) => row.id === selectedId)
    if (index >= visible) { setVisible(Math.ceil((index + 1) / PAGE) * PAGE); return }
    if (selectedId) listRef.current?.querySelector(`[data-candidate-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, mapReady, filtered, visible])
  const flyTo = useCallback((c: ScanCandidate, zoom = 18) => {
    if (c.lat == null || c.lon == null || !Number.isFinite(Number(c.lat)) || !Number.isFinite(Number(c.lon)) || Math.abs(Number(c.lat)) > 90 || Math.abs(Number(c.lon)) > 180 || (Number(c.lat) === 0 && Number(c.lon) === 0)) { showToast('חסר מיקום תקין לגג הזה', 'error'); return }
    setSelectedId(c.id); setMobileView('map')
    mapRef.current?.flyTo({ center: [Number(c.lon), Number(c.lat)], zoom })
  }, [showToast])
  useEffect(() => {
    const id = searchParams.get('focus')
    if (!id || !mapReady || focusedRef.current === id) return
    focusedRef.current = id
    let cancelled = false
    void fetchScanCandidateById(id).then((candidate) => {
      if (cancelled) return
      if (!candidate || candidate.kind === 'land' || candidate.status === 'rejected') { showToast('הגג המבוקש לא זמין לבדיקה', 'error'); return }
      setFilters({ ...DEFAULT_FILTERS, includeSolar: true, showInCrm: true })
      setRows((prev) => prev.some((c) => c.id === id) ? prev : [candidate, ...prev])
      flyTo(candidate, 17)
    }).catch(() => { if (!cancelled) showToast('טעינת הגג המבוקש נכשלה', 'error') })
    return () => { cancelled = true }
  }, [searchParams, mapReady, flyTo, showToast])

  const busy = (id: string, value: boolean) => setWorking((previous) => ({ ...previous, [id]: value }))
  const updateRow = (id: string, patch: Partial<ScanCandidate>) => {
    setRows((previous) => previous.map((row) => row.id === id ? { ...row, ...patch } : row))
    setCompared((previous) => previous.map((row) => row.id === id ? { ...row, ...patch } : row))
  }
  const approve = async (c: ScanCandidate) => {
    if (!canEdit || working[c.id]) return
    busy(c.id, true)
    try {
      const result = await promoteScanCandidate(c.id)
      invalidateLoad()
      updateRow(c.id, { status: 'added' })
      showToast(result.ok ? 'הגג נוסף ל־CRM להמשך טיפול' : 'הגג קושר לנכס שכבר נמצא ב־CRM', 'success')
    } catch { showToast('ההוספה ל־CRM נכשלה. הנתונים לא סומנו כאושרו.', 'error') }
    finally { busy(c.id, false) }
  }
  const reject = async (c: ScanCandidate, reason: RejectionReason) => {
    if (!canEdit || working[c.id]) return
    busy(c.id, true)
    try {
      const result = await rejectScanCandidate(c.id, reason)
      if (!result.ok) throw new Error(result.error)
      invalidateLoad()
      setRows((prev) => prev.filter((row) => row.id !== c.id)); setCompared((prev) => prev.filter((row) => row.id !== c.id))
      setSelectedId((prev) => prev === c.id ? null : prev)
      showToast('הגג הוסר מרשימת הבדיקה והסיבה נשמרה', 'success')
    } catch { showToast('הדחייה לא נשמרה. אפשר לנסות שוב.', 'error') }
    finally { busy(c.id, false) }
  }
  const correctArea = async (c: ScanCandidate, area: number) => {
    if (!canEdit || working[c.id]) return
    busy(c.id, true)
    try {
      const result = await updateScanCandidateArea(c.id, area)
      if (!result.ok) throw new Error(result.error)
      invalidateLoad()
      updateRow(c.id, { roof_area_sqm: result.areaSqm ?? area, estimated_kwp: result.kwp ?? c.estimated_kwp, priority: result.priority ?? c.priority })
      showToast('שטח הגג והפוטנציאל עודכנו במאגר', 'success')
    } catch { showToast('עדכון השטח נכשל. הנתונים הקודמים נשמרו.', 'error') }
    finally { busy(c.id, false) }
  }
  const writeNote = (id: string, text: string) => {
    // Keep the draft available even if browser storage is full or disabled.
    setNotes((previous) => ({ ...previous, [id]: text }))
    try { saveNote(id, text) } catch { showToast('ההערה לא נשמרה בדפדפן. העתיקו אותה לפני יציאה מהמסך.', 'error') }
  }
  const queueScan = async () => {
    if (!canEdit || queuing || !areaToScan || !Number.isFinite(Number(minArea)) || Number(minArea) < 5 || Number(minArea) > 100000) return
    setQueuing(true)
    try {
      const result = await createScanRequest(areaToScan.polygon, areaToScan.bbox, { minRoofM2: Number(minArea) }, 'roof')
      if (!result.ok || !result.id) throw new Error('queue failed')
      setJobsOpen(true)
      showToast('הסריקה נוספה לתור. התוצאות יופיעו לאחר עיבוד הרקע.', 'success')
      await loadJobs()
    } catch { showToast('לא ניתן ליצור סריקה כרגע. בדקו את החיבור ונסו שוב.', 'error') }
    finally { setQueuing(false) }
  }
  const toggleCompare = (c: ScanCandidate) => setCompared((prev) => prev.some((row) => row.id === c.id) ? prev.filter((row) => row.id !== c.id) : prev.length < 3 ? [...prev, c] : prev)
  const onSearchEnter = () => { if (filtered[0]) flyTo(filtered[0], 17) }

  if (bustanReady === null) return <div className="flex h-full items-center justify-center gap-2 text-sm text-[#24463E]" role="status"><Loader2 className="animate-spin" size={18} /> מתחבר למאגר הגגות…</div>
  if (!bustanReady) return <BustanSignIn onDone={() => void refreshRole()} />

  const button = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#24463E]/20 bg-white px-3 text-xs font-medium text-[#24463E] hover:bg-[#D8ECE8]/50 disabled:opacity-40'
  return <div dir="rtl" className="flex h-full min-h-0 flex-col bg-[#F7F1E5] text-[#27342F]">
    <header className="shrink-0 border-b border-[#24463E]/15 px-4 py-3 lg:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-semibold tracking-wider text-[#607167]">BUSTAN ENERGY · סקר נכסים</p><h1 className="mt-0.5 text-xl font-semibold">מגג מזוהה למערכת מתאימה</h1><p className="mt-1 hidden text-xs text-[#27342F]/60 md:block">מאתרים גגות, בודקים פוטנציאל וצריכה, ומבררים מי הבעלים ומקבל ההחלטה.</p></div>
        <div className="flex items-center gap-2"><button className={button} onClick={() => { setJobsOpen((open) => !open); void loadJobs() }} aria-expanded={jobsOpen}><Layers size={14} /> סריקות {activeJobs > 0 && <span className="rounded bg-[#F2B84B]/30 px-1.5">{activeJobs}</span>}</button><button className={button} onClick={reloadViewport} disabled={loading || !mapReady || zoomTooLow} aria-label="רענון הגגות באזור המפה"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> רענון</button></div>
      </div>
      <div className="mt-3 flex gap-5 border-t border-[#24463E]/10 pt-2 text-xs"><span><b className="text-base tabular-nums">{filtered.length.toLocaleString('he-IL')}</b> גגות מסוננים באזור</span><span><b className="text-base tabular-nums" dir="ltr">{Math.round(capacity).toLocaleString('he-IL')}</b> kWp פוטנציאל משוער</span><span className="hidden sm:inline"><b className="text-base tabular-nums">{contacts}</b> עם פרטי עסק</span></div>
    </header>
    <div className="flex shrink-0 gap-2 border-b border-[#24463E]/15 p-2 lg:hidden" aria-label="תצוגת סורק"><button className={`${button} flex-1 ${mobileView === 'map' ? 'bg-[#D8ECE8]' : ''}`} onClick={() => setMobileView('map')} aria-pressed={mobileView === 'map'}><MapIcon size={14} /> מפה</button><button className={`${button} flex-1 ${mobileView === 'list' ? 'bg-[#D8ECE8]' : ''}`} onClick={() => setMobileView('list')} aria-pressed={mobileView === 'list'}><List size={14} /> גגות ובדיקה</button></div>
    <div className="relative flex min-h-0 flex-1">
      <aside aria-label="רשימת גגות" className={`${mobileView === 'list' ? 'flex' : 'hidden'} w-full min-h-0 shrink-0 flex-col border-l border-[#24463E]/15 bg-[#FFF4E2] lg:flex lg:w-[400px] xl:w-[440px]`}>
        <ScanFilterBar filters={filters} onChange={(next) => { setFilters(next); setVisible(PAGE) }} counts={{ filtered: filtered.length, total: rows.length, pvExcluded }} onSearchEnter={onSearchEnter} />
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3" aria-busy={loading}>
          {loading && <p role="status" className="flex items-center justify-center gap-2 py-3 text-xs text-[#24463E]"><Loader2 size={14} className="animate-spin" /> טוען גגות לאזור המפה…</p>}
          {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>הגגות לא נטענו. אין כרגע תוצאות עדכניות לאזור.</p><button className={`${button} mt-3`} onClick={reloadViewport}>ניסיון חוזר</button></div>}
          {!loading && !loadError && filtered.length === 0 && <div className="rounded-xl border border-dashed border-[#24463E]/25 p-5 text-center"><ScanSearch size={26} className="mx-auto mb-2 text-[#24463E]/55" /><h2 className="text-sm font-semibold">{zoomTooLow ? 'התקרבו לאזור לבדיקה' : rows.length ? 'אין גגות שתואמים לסינון' : 'עדיין אין גגות באזור המפה'}</h2><p className="mt-2 text-xs leading-relaxed text-[#27342F]/60">{zoomTooLow ? 'התקרבו במפה כדי לטעון את הגגות.' : rows.length ? 'אפשר לאפס את המסננים או לעבור לאזור אחר.' : 'בחרו אזור במפה והפעילו סריקה. היעדר תוצאות אינו מעיד שאין גגות.'}</p>{rows.length > 0 && <button className={`${button} mt-3`} onClick={() => setFilters(DEFAULT_FILTERS)}>איפוס מסננים</button>}</div>}
          {filtered.slice(0, visible).map((c) => <div key={c.id} className="space-y-2">
            <CandidateCard c={c} selected={selectedId === c.id} note={notes[noteKey(c)] ?? ''} compared={compared.some((row) => row.id === c.id)} compareDisabled={compared.length >= 3} canEdit={canEdit} working={!!working[c.id]} onSelect={() => setSelectedId(c.id)} onApprove={() => void approve(c)} onReject={(reason) => void reject(c, reason)} onProposal={() => { if (canQuote) navigate(`/admin/proposals/new?candidate_id=${encodeURIComponent(c.id)}`); else showToast('יצירת הצעה זמינה לתפקיד מנהל או מכירות', 'info') }} onCompareToggle={() => toggleCompare(c)} onNote={(text) => writeNote(c.id, text)} onFlyTo={() => flyTo(c)} />
            {selectedId === c.id && <><button onClick={() => setSelectedId(null)} className="flex items-center gap-1 px-2 py-1 text-xs text-[#24463E]"><X size={13} /> סגירת בדיקת הגג</button><RoofAssessment key={c.id} candidate={c} canEdit={canEdit} working={!!working[c.id]} onArea={(area) => correctArea(c, area)} onProposal={canQuote ? (kwp) => navigate(`/admin/proposals/new?candidate_id=${encodeURIComponent(c.id)}&screening_kwp=${kwp}`) : undefined} note={notes[noteKey(c)] ?? ''} onNote={(text) => writeNote(c.id, text)} /></>}
          </div>)}
          {filtered.length > visible && <button className={`${button} w-full`} onClick={() => setVisible((value) => value + PAGE)}>טעינת גגות נוספים · {filtered.length - visible} נותרו</button>}
        </div>
        <footer className="flex shrink-0 justify-between border-t border-[#24463E]/10 px-3 py-2 text-[11px] text-[#27342F]/60"><span>{ROLE_LABEL[role]}</span><span>נתוני האזור המוצג · בעלות דורשת אימות</span></footer>
      </aside>
      <section aria-label="מפת גגות" className={`${mobileView === 'map' ? 'block' : 'hidden'} relative min-h-0 min-w-0 flex-1 lg:block`}>
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        <div className="absolute left-14 right-3 top-3 flex flex-wrap items-center justify-end gap-2">
          <button className={`${button} shadow-sm`} onClick={() => mapRef.current?.fitBounds(KP.bounds, { padding: 35 })} disabled={!mapReady}><Crosshair size={14} /> קו פנגן</button>
          <button className={`${button} !border-[#24463E] !bg-[#24463E] !text-[#FFF4E2] shadow-sm`} onClick={() => { setJobsOpen(true); setMobileView('map') }} disabled={!mapReady || !canEdit}><ScanSearch size={15} /> סריקת האזור במפה</button>
        </div>
        {mapError && <div role="alert" className="absolute left-3 right-3 top-16 rounded-lg bg-[#FFF4E2] p-3 text-xs shadow-sm">חלק משכבות המפה לא נטענו. הרשימה זמינה; בדקו את החיבור לפני בדיקת המתאר.</div>}
        {zoomTooLow && <div className="absolute left-3 right-3 top-28 rounded-lg bg-[#24463E]/95 p-3 text-center text-xs text-[#FFF4E2]">התקרבו כדי לטעון גגות באזור</div>}
        <div className="pointer-events-none absolute bottom-8 right-3 rounded-lg bg-[#FFF4E2]/95 p-2.5 text-[10px] shadow-sm"><p className="mb-1.5 font-semibold">דירוג פוטנציאל · A הגבוה ביותר</p><div className="flex gap-3" dir="ltr">{Object.entries(GRADE_COLORS).map(([grade, color]) => <span key={grade} className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />{grade}</span>)}</div><p className="mt-1.5 text-[#27342F]/65">מתאר = גג / נקודה = מיקום בלבד</p></div>
        <CompareDrawer items={compared} onRemove={(id) => setCompared((prev) => prev.filter((c) => c.id !== id))} onClear={() => setCompared([])} />
      </section>
      {jobsOpen && <section dir="rtl" aria-label="סריקת אזור והיסטוריה" className="absolute inset-y-0 left-0 z-20 w-full max-w-md overflow-y-auto border-r border-[#24463E]/20 bg-[#FFF4E2] p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">סריקת אזור</h2><p className="mt-1 text-xs text-[#27342F]/60">מאתרים גגות במקורות המיפוי הזמינים.</p></div><button onClick={() => setJobsOpen(false)} className={button} aria-label="סגירת חלון הסריקות"><X size={16} /></button></div>
        <div className="mt-5 rounded-xl border border-[#24463E]/15 bg-white/60 p-4"><h3 className="text-sm font-semibold">האזור הנוכחי במפה</h3><p className="mt-2 text-xs leading-relaxed text-[#27342F]/65">הסריקה תתבצע בתוך גבולות המפה שמוצגים עכשיו. לעבודה מדויקת, התקרבו לשכונה או למתחם.</p><label className="mt-3 block text-xs">שטח מינימלי לזיהוי, מ״ר<input type="number" min="5" max="100000" value={minArea} onChange={(e) => setMinArea(e.target.value)} className="mt-1 w-full rounded-lg border border-[#24463E]/20 bg-white px-3 py-2 text-sm" dir="ltr" /></label>{!areaToScan && <p className="mt-3 text-xs text-amber-800">האזור רחב מדי לסריקה אחת. התקרבו במפה ופתחו שוב.</p>}<button onClick={() => void queueScan()} disabled={!canEdit || queuing || !areaToScan || !Number.isFinite(Number(minArea)) || Number(minArea) < 5 || Number(minArea) > 100000} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#24463E] px-3 text-sm font-medium text-[#FFF4E2] disabled:opacity-40">{queuing ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={16} />}{queuing ? 'מוסיף לתור…' : 'הפעלת סריקת גגות באזור'}</button><p className="mt-2 text-[11px] leading-relaxed text-[#27342F]/60">העיבוד מתבצע ברקע, בדרך כלל עד כ־10 דקות לתחילת העבודה. תוצאות המקורות אינן מבטיחות שכל גג קיים זוהה.</p></div>
        <h3 className="mt-5 text-sm font-semibold">סריקות אחרונות במאגר</h3>
        {jobsError && <p role="alert" className="mt-3 text-xs text-red-700">היסטוריית הסריקות לא נטענה. <button className="underline" onClick={() => void loadJobs()}>ניסיון חוזר</button></p>}
        {!jobsError && jobs.length === 0 && <p className="mt-3 text-xs text-[#27342F]/60">אין עדיין סריקות להצגה.</p>}
        <div className="mt-3 space-y-3">{jobs.map((job) => {
          const counts = job.counts as Record<string, unknown>
          return <article key={job.id} className="rounded-xl border border-[#24463E]/15 bg-white/60 p-3"><div className="flex items-center justify-between gap-2"><span className={`text-xs font-semibold ${job.status === 'failed' ? 'text-red-700' : 'text-[#24463E]'}`}>{STATUS_LABEL[job.status]}</span><time className="text-[10px] text-[#27342F]/55">{new Date(job.created_at).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</time></div>{job.status === 'done' && <p className="mt-2 text-xs">{Number(counts.inserted ?? 0).toLocaleString('he-IL')} גגות נוספו · {Number(counts.found ?? counts.fetched ?? 0).toLocaleString('he-IL')} רשומות נבדקו</p>}{counts.coverage === 'partial' && <p className="mt-2 text-xs leading-relaxed text-amber-800">כיסוי חלקי: מקור חסר, מתאר לא נתמך או מגבלת עיבוד. סרקו אזור קטן יותר והשלימו בדיקה במפה.</p>}{job.status === 'done' && counts.coverage !== 'partial' && <p className="mt-2 text-[11px] text-[#27342F]/60">המקורות הזמינים עובדו. נדרשת בדיקת כיסוי מול התצלום.</p>}{job.status === 'failed' && <p className="mt-2 text-xs text-red-700">לא התקבלו תוצאות מלאות. נסו אזור קטן יותר או סריקה חדשה.</p>}{job.bbox?.length === 4 && <button className="mt-2 text-xs font-medium text-[#24463E] underline underline-offset-4" onClick={() => { const b = job.bbox!; mapRef.current?.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 30 }); setJobsOpen(false); setMobileView('map') }}>הצגת אזור הסריקה</button>}</article>
        })}</div>
      </section>}
    </div>
  </div>
}
