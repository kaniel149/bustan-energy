/**
 * /admin/scan — KP Solar Pro on the React map stack.
 *
 * Reads raw `scan_candidates` rows for the visible map bounds (bustan DB),
 * filters them with the pure scan-review helpers, draws grade-coloured roof
 * polygons on Esri imagery, and writes approvals/rejections through the same
 * RPCs the platform's CandidateReviewPanel uses.
 *
 * Auth: AdminLayout guarantees a main-project admin session, but the RPCs need
 * a *bustan* session (role admin/sales/engineer), so the page shows a compact
 * sign-in form until `bustanSupabase` has one.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Loader2 } from 'lucide-react'
import { TILE_SOURCES, TILE_MAXZOOM, TILE_ATTRIBUTION } from '../../components/Map/SolarMap'
import { REGIONS } from '../../lib/regions'
import { bustanSupabase, signInBustan } from '../../lib/bustan-supabase'
import { can, fetchCurrentRole } from '../../lib/bustan-permissions'
import type { Role } from '../../lib/bustan-permissions'
import {
  fetchScanCandidateRows, fetchScanCandidateById, promoteScanCandidate, rejectScanCandidate,
} from '../../lib/bustan-crm-service'
import type { ScanCandidate, RejectionReason } from '../../lib/bustan-crm-service'
import {
  applyScanFilters, toFeatureCollection, hasExistingSolar, loadNotes, saveNote, noteKey, DEFAULT_FILTERS,
} from '../../lib/scan-review'
import type { ScanFilters } from '../../lib/scan-review'
import { useAdminStore } from '../../lib/admin-store'
import { ScanFilterBar } from '../../components/admin/scan/ScanFilterBar'
import { CandidateCard } from '../../components/admin/scan/CandidateCard'
import { CompareDrawer } from '../../components/admin/scan/CompareDrawer'

type Bounds = [[number, number], [number, number]]
const KP = REGIONS.koh_phangan
const MIN_LOAD_ZOOM = 11
const PAGE = 200
const SRC = 'cands'

function boundsOf(map: maplibregl.Map): Bounds {
  const b = map.getBounds()
  return [[b.getWest(), b.getSouth()], [b.getEast(), b.getNorth()]]
}

// ── Bustan sign-in (inline) ─────────────────────────────────────────────────
function BustanSignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const ok = await signInBustan(email.trim(), password)
    setBusy(false)
    if (ok) onDone()
    else setError('Sign-in to the Bustan CRM failed')
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white/70 rounded-2xl border border-[#24463E]/15 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#27342F]">התחברות ל-Bustan CRM</h2>
        <p className="text-xs text-[#27342F]/60">אישור/דחייה של מועמדים דורשים סשן במסד ה-CRM (תפקיד admin/sales).</p>
        <input
          type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email" dir="ltr"
          className="w-full px-3 py-2 rounded-lg bg-white border border-[#24463E]/20 text-sm text-[#27342F]"
        />
        <input
          type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="password" dir="ltr"
          className="w-full px-3 py-2 rounded-lg bg-white border border-[#24463E]/20 text-sm text-[#27342F]"
        />
        {error && <p className="text-xs text-red-700">{error}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full py-2 rounded-lg bg-[#24463E] text-[#FFF4E2] text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'מתחבר…' : 'התחבר'}
        </button>
      </form>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function ScanCommandPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showToast = useAdminStore((s) => s.showToast)

  const [bustanReady, setBustanReady] = useState<boolean | null>(null)
  const [role, setRole] = useState<Role>('viewer')
  const canEdit = can(role, 'crm.edit')

  const [rows, setRows] = useState<ScanCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [zoomTooLow, setZoomTooLow] = useState(false)
  const [filters, setFilters] = useState<ScanFilters>(DEFAULT_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compare, setCompare] = useState<string[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [working, setWorking] = useState<Record<string, boolean>>({})
  const [visible, setVisible] = useState(PAGE)

  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const focusedRef = useRef(false)

  // ── Bustan session + role ────────────────────────────────────────────────
  const refreshRole = useCallback(async () => {
    const r = await fetchCurrentRole()
    setRole(r)
    setBustanReady(true)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = (await bustanSupabase?.auth.getSession()) ?? { data: { session: null } }
      if (!alive) return
      if (data.session) await refreshRole()
      else setBustanReady(false)
    })()
    return () => { alive = false }
  }, [refreshRole])

  useEffect(() => {
    queueMicrotask(() => setNotes(loadNotes()))
  }, [])

  // ── Data ─────────────────────────────────────────────────────────────────
  const load = useCallback(async (bounds: Bounds) => {
    setLoading(true)
    try {
      const data = await fetchScanCandidateRows(bounds)
      setRows(data)
      setVisible(PAGE)
    } catch (e) {
      showToast(`Failed to load candidates: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const filtered = useMemo(() => applyScanFilters(rows, filters), [rows, filters])
  const pvExcluded = useMemo(() => rows.filter((c) => c.status !== 'rejected' && hasExistingSolar(c)).length, [rows])
  const compared = useMemo(() => compare.map((id) => rows.find((c) => c.id === id)).filter((c): c is ScanCandidate => !!c), [compare, rows])

  // ── Map ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bustanReady || !containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          sat: { type: 'raster', tiles: TILE_SOURCES.esri, tileSize: 256, maxzoom: TILE_MAXZOOM.esri, attribution: TILE_ATTRIBUTION },
        },
        layers: [{ id: 'sat', type: 'raster', source: 'sat' }],
      },
      center: [100.0, 9.735],
      zoom: 12,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'cand-fill', type: 'fill', source: SRC, filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 },
      })
      map.addLayer({
        id: 'cand-line', type: 'line', source: SRC, filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
      })
      map.addLayer({
        id: 'cand-pt', type: 'circle', source: SRC, filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-color': ['get', 'color'], 'circle-radius': 6, 'circle-stroke-color': '#0b1a16', 'circle-stroke-width': 1 },
      })
      map.addLayer({
        id: 'cand-pv', type: 'circle', source: SRC, filter: ['==', ['get', 'pv'], true],
        paint: { 'circle-color': 'transparent', 'circle-radius': 9, 'circle-stroke-color': '#ff4444', 'circle-stroke-width': 2 },
      })
      map.addLayer({
        id: 'cand-selected', type: 'line', source: SRC, filter: ['==', ['get', 'id'], ''],
        paint: { 'line-color': '#ffffff', 'line-width': 3 },
      })
      for (const layer of ['cand-fill', 'cand-pt']) {
        map.on('click', layer, (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined
          if (id) setSelectedId(id)
        })
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      }
      setMapReady(true)
      void load(KP.bounds)
    })

    let timer: ReturnType<typeof setTimeout> | null = null
    map.on('moveend', () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (map.getZoom() < MIN_LOAD_ZOOM) { setZoomTooLow(true); return }
        setZoomTooLow(false)
        void load(boundsOf(map))
      }, 400)
    })

    return () => {
      if (timer) clearTimeout(timer)
      map.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [bustanReady, load])

  // Push filtered rows into the map source.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const src = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined
    src?.setData(toFeatureCollection(filtered))
  }, [filtered, mapReady])

  // Highlight the selection on the map + scroll its card into view.
  useEffect(() => {
    const map = mapRef.current
    if (map && mapReady && map.getLayer('cand-selected')) {
      map.setFilter('cand-selected', ['==', ['get', 'id'], selectedId ?? ''])
    }
    if (selectedId && listRef.current) {
      listRef.current.querySelector(`[data-candidate-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedId, mapReady])

  const flyTo = useCallback((c: ScanCandidate, zoom = 18) => {
    if (c.lat == null || c.lon == null) return
    mapRef.current?.flyTo({ center: [Number(c.lon), Number(c.lat)], zoom })
  }, [])

  // ?focus=<id> from the dashboard: fly + select after the first load.
  useEffect(() => {
    const id = searchParams.get('focus')
    if (!id || !mapReady || focusedRef.current) return
    focusedRef.current = true
    ;(async () => {
      const c = await fetchScanCandidateById(id).catch(() => null)
      if (!c) { showToast('Candidate not found', 'error'); return }
      setRows((prev) => (prev.some((r) => r.id === c.id) ? prev : [c, ...prev]))
      setSelectedId(c.id)
      flyTo(c, 17)
    })()
  }, [searchParams, mapReady, flyTo, showToast])

  // ── Actions ──────────────────────────────────────────────────────────────
  const setBusy = (id: string, v: boolean) => setWorking((w) => ({ ...w, [id]: v }))

  const approve = async (c: ScanCandidate) => {
    setBusy(c.id, true)
    try {
      const r = await promoteScanCandidate(c.id)
      if (!r.ok) {
        showToast(`Already in CRM (property ${r.property_id.slice(0, 8)}…)`, 'info')
      } else {
        showToast(`Approved → CRM (${r.property_id.slice(0, 8)}…)`, 'success')
      }
      setRows((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: 'added' } : x)))
    } catch (e) {
      showToast(`Approve failed: ${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setBusy(c.id, false)
    }
  }

  const reject = async (c: ScanCandidate, reason: RejectionReason) => {
    setBusy(c.id, true)
    const r = await rejectScanCandidate(c.id, reason)
    setBusy(c.id, false)
    if (!r.ok) { showToast(`Reject failed: ${r.error}`, 'error'); return }
    setRows((prev) => prev.filter((x) => x.id !== c.id))
    setCompare((prev) => prev.filter((id) => id !== c.id))
    if (selectedId === c.id) setSelectedId(null)
    showToast(`Rejected (${reason})`, 'success')
  }

  const toggleCompare = (id: string) =>
    setCompare((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]))

  const onSearchEnter = () => {
    const first = filtered[0]
    if (first) { setSelectedId(first.id); flyTo(first, 17) }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (bustanReady === null) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-[#24463E]" />
      </div>
    )
  }
  if (bustanReady === false) return <BustanSignIn onDone={() => void refreshRole()} />

  return (
    <div dir="ltr" className="h-full flex flex-col-reverse lg:flex-row min-h-0">
      {/* List panel */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col min-h-0 h-1/2 lg:h-full border-r border-[#24463E]/15 bg-[#FFF4E2]">
        <ScanFilterBar
          filters={filters}
          onChange={setFilters}
          counts={{ filtered: filtered.length, total: rows.length, pvExcluded }}
          onSearchEnter={onSearchEnter}
        />
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading && rows.length === 0 && (
            <p className="text-xs text-[#27342F]/50 text-center py-6">Loading candidates…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-[#27342F]/50 text-center py-6">
              {zoomTooLow ? 'התקרב כדי לטעון מועמדים' : 'No candidates match the filters'}
            </p>
          )}
          {filtered.slice(0, visible).map((c) => (
            <CandidateCard
              key={c.id}
              c={c}
              selected={c.id === selectedId}
              note={notes[noteKey(c)] ?? ''}
              compared={compare.includes(c.id)}
              compareDisabled={compare.length >= 3}
              canEdit={canEdit}
              working={!!working[c.id]}
              onSelect={() => setSelectedId(c.id)}
              onApprove={() => void approve(c)}
              onReject={(reason) => void reject(c, reason)}
              onProposal={() => navigate(`/admin/proposals/new?candidate_id=${c.id}`)}
              onCompareToggle={() => toggleCompare(c.id)}
              onNote={(text) => setNotes(saveNote(noteKey(c), text))}
              onFlyTo={() => flyTo(c)}
            />
          ))}
          {filtered.length > visible && (
            <button
              onClick={() => setVisible((v) => v + PAGE)}
              className="w-full py-2 rounded-lg border border-[#24463E]/20 text-xs text-[#24463E] hover:bg-[#24463E]/10"
            >
              Show more ({filtered.length - visible} left)
            </button>
          )}
        </div>
        <div className="px-3 py-1.5 border-t border-[#24463E]/10 text-[10px] text-[#27342F]/50 flex items-center justify-between">
          <span>role: {role}{canEdit ? '' : ' (read-only)'}</span>
          {loading && <Loader2 size={12} className="animate-spin" />}
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0 h-1/2 lg:h-full">
        {/* w-full h-full: maplibre CSS forces position:relative on its container, so inset-0 alone collapses to 0 height */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        {zoomTooLow && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-[#0b1a16]/80 text-[#FFF4E2] text-xs">
            התקרב כדי לטעון מועמדים
          </div>
        )}
        <CompareDrawer
          items={compared}
          onRemove={(id) => setCompare((prev) => prev.filter((x) => x !== id))}
          onClear={() => setCompare([])}
        />
      </div>
    </div>
  )
}
