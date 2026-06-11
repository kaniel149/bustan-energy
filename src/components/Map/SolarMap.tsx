import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { area as turfArea } from '@turf/area'
import { useAppStore } from '../../lib/store'
import { useFilteredProperties } from '../../hooks/useFilteredProperties'
import { REGIONS } from '../../lib/regions'
import { updateRoofGeom, confirmDetectedRoof, createScanRequest, fetchScanRequests, setScanCandidateStatus } from '../../lib/bustan-crm-service'
import { useToastStore } from '../../lib/toast-store'
import { useBustanStore } from '../../lib/bustan-store'
import { can } from '../../lib/bustan-permissions'
import { computePanelLayout, panelsToFeatureCollection } from '../../lib/panel-layout'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

const TILE_SOURCES: Record<string, string[]> = {
  sentinel2024: [
    'https://a.tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    'https://b.tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    'https://c.tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    'https://d.tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
  ],
  mapbox: [
    `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${MAPBOX_TOKEN}`,
  ],
  satellite: [
    'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
  ],
  esri: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ],
  street: [
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  ],
}

// Resolve the tile URLs for a style id, with safe fallbacks:
// - mapbox needs a token; without it fall back to the EOX Sentinel-2 layer
// - any unknown style falls back to Google satellite (never undefined → no crash)
function resolveTiles(style: string): string[] {
  if (style === 'mapbox' && !MAPBOX_TOKEN) return TILE_SOURCES.sentinel2024
  return TILE_SOURCES[style] ?? TILE_SOURCES.satellite
}

type LayerMouseEventType = 'click' | 'mouseenter' | 'mouseleave' | 'mousemove'
type LayerMouseHandler = (event: maplibregl.MapLayerMouseEvent) => void

// Creates a GeoJSON circle polygon around a center point
function createCircle(center: [number, number], radiusKm: number, points = 64): GeoJSON.Feature {
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = radiusKm / (111.32 * Math.cos(center[1] * Math.PI / 180))
    const dy = radiusKm / 110.574
    coords.push([center[0] + dx * Math.cos(angle), center[1] + dy * Math.sin(angle)])
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  }
}

// Build a FeatureCollection of circles at given radius for all substation points
function buildBufferFeatures(
  gridFeatures: GeoJSON.Feature[],
  radiusKm: number
): GeoJSON.FeatureCollection {
  const circles: GeoJSON.Feature[] = []
  for (const f of gridFeatures) {
    const props = f.properties as Record<string, string>
    if (props?.power_type !== 'substation') continue
    const geom = f.geometry
    if (geom.type !== 'Point') continue
    const [lng, lat] = (geom as GeoJSON.Point).coordinates
    circles.push(createCircle([lng, lat], radiusKm))
  }
  return { type: 'FeatureCollection', features: circles }
}

// Validates that a GeoJSON Polygon/MultiPolygon is structurally sound:
// has at least one ring with ≥4 coordinates, all of which are finite numbers.
function isValidRoofGeometry(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
  const rings = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat(1)
  if (!rings || rings.length === 0) return false
  for (const ring of rings) {
    if (!ring || ring.length < 4) return false
    for (const coord of ring) {
      if (!Array.isArray(coord) || coord.length < 2 || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) return false
    }
  }
  return true
}

// Build a roof footprint feature for a property.
// Uses persisted roofGeom (P2+) when present; otherwise synthesizes a square
// footprint sized by roof area (m²) centered on the property — an interim
// read-only overlay until real geometry is drawn/detected.
function buildRoofFeature(p: {
  id: string; lat: number; lng: number; area?: number; solarScore?: number
  priority?: string; title: string; roofGeom?: GeoJSON.Polygon | GeoJSON.MultiPolygon
}): GeoJSON.Feature | null {
  const props = {
    id: p.id,
    title: p.title,
    solarScore: p.solarScore || 0,
    priority: p.priority || 'B',
    synthetic: p.roofGeom ? 0 : 1,
  }
  if (p.roofGeom) {
    if (!isValidRoofGeometry(p.roofGeom)) {
      console.error('[SolarMap] invalid roof geometry for', p.id)
      return null
    }
    return { type: 'Feature', geometry: p.roofGeom, properties: props }
  }
  const area = Number(p.area)
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null
  const side = Math.sqrt(Number.isFinite(area) && area > 0 ? area : 100) // m; default ~10x10m
  const half = side / 2
  const dLat = half / 110574
  const dLng = half / (111320 * Math.cos((p.lat * Math.PI) / 180))
  const ring: [number, number][] = [
    [p.lng - dLng, p.lat - dLat],
    [p.lng + dLng, p.lat - dLat],
    [p.lng + dLng, p.lat + dLat],
    [p.lng - dLng, p.lat + dLat],
    [p.lng - dLng, p.lat - dLat],
  ]
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: props }
}

export function SolarMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const filters = useAppStore((s) => s.filters)
  const mapStyle = useAppStore((s) => s.mapStyle)
  const gridData = useAppStore((s) => s.gridData)
  const properties = useAppStore((s) => s.properties)
  const selectedProperty = useAppStore((s) => s.selectedProperty)
  const setSelectedProperty = useAppStore((s) => s.setSelectedProperty)
  const drawRoofFor = useAppStore((s) => s.drawRoofFor)
  const setDrawRoofFor = useAppStore((s) => s.setDrawRoofFor)
  const scanAreaDrawing = useAppStore((s) => s.scanAreaDrawing)
  const setScanAreaDrawing = useAppStore((s) => s.setScanAreaDrawing)
  const setProperties = useAppStore((s) => s.setProperties)
  const roofCandidates = useAppStore((s) => s.roofCandidates)
  const reviewCandidate = useAppStore((s) => s.reviewCandidate)
  const setReviewCandidate = useAppStore((s) => s.setReviewCandidate)
  const removeRoofCandidate = useAppStore((s) => s.removeRoofCandidate)
  const showToast = useToastStore((s) => s.showToast)
  const setScanRequests = useAppStore((s) => s.setScanRequests)
  const role = useBustanStore((s) => s.role)
  const canScan = can(role, 'survey.edit') || can(role, 'crm.edit')
  const filteredProperties = useFilteredProperties()
  const fittedRegion = useRef<string | null>(null)
  const isDrawingRef = useRef(false)
  const finishRef = useRef<null | (() => void)>(null)
  // Separate finish ref for the scan-area draw mode
  const scanFinishRef = useRef<null | (() => void)>(null)
  const [drawVertexCount, setDrawVertexCount] = useState(0)
  const [scanAreaVertexCount, setScanAreaVertexCount] = useState(0)
  const [savingRoof, setSavingRoof] = useState(false)
  const [confirmingCand, setConfirmingCand] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showPanelLayout, setShowPanelLayout] = useState(true)
  // Roof/Land toggle for the scan-area draw mode
  const [scanType, setScanType] = useState<'roof' | 'land'>('roof')

  // Enters the draw-scan-area mode — the user draws a polygon, then on finish
  // we build the GeoJSON + bbox and queue the scan. The actual scan submission
  // happens inside the useEffect that drives this mode (scanAreaDrawing === true).
  const handleScanArea = () => {
    if (!map.current) return
    setScanAreaDrawing(true)
  }

  const handleConfirmCandidate = async () => {
    if (!reviewCandidate) return
    setConfirmingCand(true)
    // Mark candidate as 'added' before promoting — best-effort, non-blocking
    setScanCandidateStatus(reviewCandidate.id, 'added').catch((err) => { console.warn('[SolarMap] failed to mark candidate added:', err) })
    const res = await confirmDetectedRoof(reviewCandidate)
    setConfirmingCand(false)
    if (!res.ok) { showToast(res.error || 'Failed to confirm roof', 'error'); return }
    const promoted = { ...reviewCandidate, id: res.id || reviewCandidate.id }
    setProperties([...useAppStore.getState().properties, promoted])
    removeRoofCandidate(reviewCandidate.id)
    setReviewCandidate(null)
    // Select + fly to the new lead so it's immediately visible on the map (saved
    // to the map AND the CRM); the PropertySidebar opens for owner research / quote.
    setSelectedProperty(promoted)
    if (map.current && Number.isFinite(promoted.lat) && Number.isFinite(promoted.lng)) {
      map.current.flyTo({ center: [promoted.lng, promoted.lat], zoom: 17, duration: 800 })
    }
    showToast('Lead added — saved to the map + CRM', 'success')
  }
  const handleRejectCandidate = async () => {
    if (!reviewCandidate) return
    // Mark candidate as 'rejected' in the DB before removing from the review queue
    await setScanCandidateStatus(reviewCandidate.id, 'rejected').catch(() => { /* ignore */ })
    removeRoofCandidate(reviewCandidate.id)
    setReviewCandidate(null)
  }

  const regionConfig = REGIONS[filters.region]

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: resolveTiles(mapStyle),
            tileSize: 256,
            maxzoom: 20,
            attribution: '© Mapbox © Maxar · Esri · EOX Sentinel-2 cloudless · © OpenStreetMap',
          },
        },
        layers: [
          { id: 'raster-layer', type: 'raster', source: 'raster-tiles' },
        ],
      },
      center: regionConfig.center,
      zoom: regionConfig.zoom,
      maxZoom: 20,
      minZoom: 7,
    })

    m.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.current = m

    return () => { m.remove(); map.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch tile source
  useEffect(() => {
    const m = map.current
    if (!m) return
    const apply = () => {
      const src = m.getSource('raster-tiles') as maplibregl.RasterTileSource
      if (src) src.setTiles(resolveTiles(mapStyle))
    }
    if (m.isStyleLoaded()) apply()
    else m.once('load', apply)
  }, [mapStyle])

  // Fly to region
  useEffect(() => {
    map.current?.flyTo({ center: regionConfig.center, zoom: regionConfig.zoom, duration: 1500 })
  }, [regionConfig])

  // Fit map to all visible leads once per region (after data loads)
  useEffect(() => {
    const m = map.current
    if (!m || filteredProperties.length === 0) return
    if (fittedRegion.current === filters.region) return
    const fit = () => {
      const bounds = new maplibregl.LngLatBounds()
      for (const p of filteredProperties) bounds.extend([p.lng, p.lat])
      if (!bounds.isEmpty()) {
        m.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 })
        fittedRegion.current = filters.region
      }
    }
    if (m.isStyleLoaded()) fit()
    else m.once('load', fit)
  }, [filteredProperties, filters.region])

  // Fly to the selected property (list/sidebar ↔ map sync)
  useEffect(() => {
    const m = map.current
    if (!m || !selectedProperty) return
    m.flyTo({
      center: [selectedProperty.lng, selectedProperty.lat],
      zoom: Math.max(m.getZoom(), 16),
      duration: 1200,
    })
  }, [selectedProperty])

  // Buffer zones layer (below grid + properties)
  useEffect(() => {
    const m = map.current
    if (!m || !gridData) return

    const addBuffers = () => {
      // Cleanup previous buffer layers/sources
      for (const id of ['buffer-5km', 'buffer-2km', 'buffer-500m']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      for (const id of ['buf-src-5km', 'buf-src-2km', 'buf-src-500m']) {
        if (m.getSource(id)) m.removeSource(id)
      }

      if (!filters.showBufferZones) return

      const regionFeatures = gridData.features.filter(
        (f) => (f.properties as Record<string, string>)?.region === filters.region
      )

      // 5km — orange (rendered first, bottom)
      m.addSource('buf-src-5km', {
        type: 'geojson',
        data: buildBufferFeatures(regionFeatures, 5),
      })
      m.addLayer({
        id: 'buffer-5km',
        type: 'fill',
        source: 'buf-src-5km',
        paint: {
          'fill-color': '#E87D20',
          'fill-opacity': 0.04,
        },
      })

      // 2km — yellow
      m.addSource('buf-src-2km', {
        type: 'geojson',
        data: buildBufferFeatures(regionFeatures, 2),
      })
      m.addLayer({
        id: 'buffer-2km',
        type: 'fill',
        source: 'buf-src-2km',
        paint: {
          'fill-color': '#E8A820',
          'fill-opacity': 0.06,
        },
      })

      // 500m — green (topmost buffer, below properties)
      m.addSource('buf-src-500m', {
        type: 'geojson',
        data: buildBufferFeatures(regionFeatures, 0.5),
      })
      m.addLayer({
        id: 'buffer-500m',
        type: 'fill',
        source: 'buf-src-500m',
        paint: {
          'fill-color': '#2ED89A',
          'fill-opacity': 0.08,
        },
      })
    }

    if (m.isStyleLoaded()) addBuffers()
    else m.once('load', addBuffers)
  }, [gridData, filters.showBufferZones, filters.region])

  // Grid layer
  useEffect(() => {
    const m = map.current
    if (!m || !gridData) return

    const addGrid = () => {
      // Cleanup
      for (const id of ['grid-lines', 'grid-substations', 'grid-transformers', 'grid-towers']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      if (m.getSource('grid-src')) m.removeSource('grid-src')

      if (!filters.showGrid) return

      const regionGrid: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: gridData.features.filter(
          (f) => (f.properties as Record<string, string>)?.region === filters.region
        ),
      }

      m.addSource('grid-src', { type: 'geojson', data: regionGrid })

      m.addLayer({
        id: 'grid-lines', type: 'line', source: 'grid-src',
        filter: ['in', ['get', 'power_type'], ['literal', ['line', 'minor_line', 'cable']]],
        paint: {
          'line-color': ['match', ['get', 'power_type'],
            'line', '#ff8800', 'minor_line', '#ffcc00', 'cable', '#00aaff', '#888'],
          'line-width': ['match', ['get', 'power_type'],
            'line', 3, 'cable', 2.5, 'minor_line', 2, 1],
          'line-opacity': 0.85,
        },
      })

      m.addLayer({
        id: 'grid-substations', type: 'circle', source: 'grid-src',
        filter: ['==', ['get', 'power_type'], 'substation'],
        paint: {
          'circle-radius': 9, 'circle-color': '#ff4444',
          'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
        },
      })

      m.addLayer({
        id: 'grid-transformers', type: 'circle', source: 'grid-src',
        filter: ['==', ['get', 'power_type'], 'transformer'],
        paint: {
          'circle-radius': 5, 'circle-color': '#ff44ff',
          'circle-stroke-color': '#fff', 'circle-stroke-width': 1,
        },
      })

      m.addLayer({
        id: 'grid-towers', type: 'circle', source: 'grid-src',
        filter: ['in', ['get', 'power_type'], ['literal', ['tower', 'pole', 'portal']]],
        paint: { 'circle-radius': 2, 'circle-color': '#888', 'circle-opacity': 0.4 },
        minzoom: 13,
      })

      // Grid click popup
      m.on('click', 'grid-substations', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as Record<string, string>
        new maplibregl.Popup({ offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-family:system-ui;font-size:13px">
            <strong>${p.name || 'Substation'}</strong>
            ${p.voltage ? `<br><span style="color:#aaa">${parseInt(p.voltage)/1000}kV</span>` : ''}
          </div>`)
          .addTo(m)
      })
      m.on('mouseenter', 'grid-substations', () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'grid-substations', () => { m.getCanvas().style.cursor = '' })
    }

    if (m.isStyleLoaded()) addGrid()
    else m.once('load', addGrid)
  }, [gridData, filters.showGrid, filters.region])

  // Roof-polygon overlay (read-only) — P1
  const roofHandlers = useRef<Array<{ type: LayerMouseEventType; layer: string; handler: LayerMouseHandler }>>([])
  useEffect(() => {
    const m = map.current
    if (!m) return

    const ROOF_LAYERS = ['roofs-fill', 'roofs-outline', 'roofs-outline-synthetic']

    const setup = () => {
      // Cleanup previous layers/source + handlers
      for (const { type, layer, handler } of roofHandlers.current) m.off(type, layer, handler)
      roofHandlers.current = []
      for (const id of ROOF_LAYERS) { if (m.getLayer(id)) m.removeLayer(id) }
      if (m.getSource('roofs-src')) m.removeSource('roofs-src')

      if (!filters.showRoofDetection) return

      const features = filteredProperties
        .filter((p) => p.type === 'roof')
        .map((p) => buildRoofFeature(p))
        .filter((f): f is GeoJSON.Feature => f !== null)

      if (features.length === 0) return

      m.addSource('roofs-src', { type: 'geojson', data: { type: 'FeatureCollection', features } })

      // Keep roof polygons beneath the lead markers / clusters
      const beforeId = ['cluster-glow', 'props-roofs-glow', 'props-land-glow', 'clusters']
        .find((id) => m.getLayer(id))
      const safeBeforeId = beforeId && m.getLayer(beforeId) ? beforeId : undefined

      // Fill — color ramp by solar potential score (0..100)
      m.addLayer({
        id: 'roofs-fill', type: 'fill', source: 'roofs-src',
        paint: {
          'fill-color': ['interpolate', ['linear'], ['get', 'solarScore'],
            0, '#FF3D00', 50, '#FF9100', 75, '#FFD600', 90, '#00E676'],
          'fill-opacity': 0.35,
        },
      }, safeBeforeId)

      // Outline — solid for real geometry, dashed for synthetic interim footprints
      // (line-dasharray is not data-driven in MapLibre, so use two filtered layers)
      m.addLayer({
        id: 'roofs-outline', type: 'line', source: 'roofs-src',
        filter: ['==', ['get', 'synthetic'], 0],
        paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.85 },
      }, safeBeforeId)
      m.addLayer({
        id: 'roofs-outline-synthetic', type: 'line', source: 'roofs-src',
        filter: ['==', ['get', 'synthetic'], 1],
        paint: { 'line-color': '#ffffff', 'line-width': 1.5, 'line-opacity': 0.7, 'line-dasharray': [2, 2] },
      }, safeBeforeId)

      const on = (type: LayerMouseEventType, layer: string, handler: LayerMouseHandler) => {
        m.on(type, layer, handler)
        roofHandlers.current.push({ type, layer, handler })
      }
      on('mouseenter', 'roofs-fill', () => { m.getCanvas().style.cursor = 'pointer' })
      on('mouseleave', 'roofs-fill', () => { m.getCanvas().style.cursor = '' })
      on('click', 'roofs-fill', (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        if (isDrawingRef.current) return
        const f = e.features?.[0]
        if (!f) return
        const propId = (f.properties as Record<string, string>).id
        const property = properties.find((p) => p.id === propId)
        if (property) setSelectedProperty(property)
      })
    }

    if (m.isStyleLoaded()) setup()
    else m.once('load', setup)
    m.on('style.load', setup)

    return () => {
      m.off('style.load', setup)
      if (!m) return
      for (const { type, layer, handler } of roofHandlers.current) m.off(type, layer, handler)
      roofHandlers.current = []
    }
  }, [filteredProperties, filters.showRoofDetection, properties, setSelectedProperty])

  // Detected-roof candidate layer (review) — P3
  const candHandlers = useRef<Array<{ type: LayerMouseEventType; layer: string; handler: LayerMouseHandler }>>([])
  useEffect(() => {
    const m = map.current
    if (!m) return

    const CAND_LAYERS = ['cand-fill', 'cand-outline']

    const setup = () => {
      for (const { type, layer, handler } of candHandlers.current) m.off(type, layer, handler)
      candHandlers.current = []
      for (const id of CAND_LAYERS) { if (m.getLayer(id)) m.removeLayer(id) }
      if (m.getSource('cand-src')) m.removeSource('cand-src')

      if (!filters.showRoofDetection || roofCandidates.length === 0) return

      const features = roofCandidates
        .map((c) => buildRoofFeature(c))
        .filter((f): f is GeoJSON.Feature => f !== null)
      if (features.length === 0) return

      m.addSource('cand-src', { type: 'geojson', data: { type: 'FeatureCollection', features } })
      const candBeforeId = ['cluster-glow', 'props-roofs-glow', 'props-land-glow', 'clusters'].find((id) => m.getLayer(id))
      const safeCandBeforeId = candBeforeId && m.getLayer(candBeforeId) ? candBeforeId : undefined
      m.addLayer({
        id: 'cand-fill', type: 'fill', source: 'cand-src',
        paint: { 'fill-color': '#C026D3', 'fill-opacity': 0.3 },
      }, safeCandBeforeId)
      m.addLayer({
        id: 'cand-outline', type: 'line', source: 'cand-src',
        paint: { 'line-color': '#E879F9', 'line-width': 1.5, 'line-dasharray': [2, 2] },
      }, safeCandBeforeId)

      const on = (type: LayerMouseEventType, layer: string, handler: LayerMouseHandler) => {
        m.on(type, layer, handler)
        candHandlers.current.push({ type, layer, handler })
      }
      on('mouseenter', 'cand-fill', () => { m.getCanvas().style.cursor = 'pointer' })
      on('mouseleave', 'cand-fill', () => { m.getCanvas().style.cursor = '' })
      on('click', 'cand-fill', (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        if (isDrawingRef.current) return
        const f = e.features?.[0]
        if (!f) return
        const id = (f.properties as Record<string, string>).id
        const cand = roofCandidates.find((c) => c.id === id)
        if (cand) setReviewCandidate(cand)
      })
    }

    if (m.isStyleLoaded()) setup()
    else m.once('load', setup)
    m.on('style.load', setup)

    return () => {
      m.off('style.load', setup)
      if (!m) return
      for (const { type, layer, handler } of candHandlers.current) m.off(type, layer, handler)
      candHandlers.current = []
    }
  }, [roofCandidates, filters.showRoofDetection, setReviewCandidate])

  // Roof draw mode — P2 (custom polygon: click vertices, double-click/Finish to save)
  useEffect(() => {
    const m = map.current
    if (!m || !drawRoofFor) { isDrawingRef.current = false; return }

    const propertyId = drawRoofFor
    const vertices: [number, number][] = []
    isDrawingRef.current = true
    setDrawVertexCount(0)

    const DRAW_LAYERS = ['draw-fill', 'draw-line', 'draw-vertices']

    const render = () => {
      const features: GeoJSON.Feature[] = []
      if (vertices.length >= 2) {
        features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: vertices }, properties: {} })
      }
      if (vertices.length >= 3) {
        features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...vertices, vertices[0]]] }, properties: {} })
      }
      for (const v of vertices) {
        features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: v }, properties: {} })
      }
      const src = m.getSource('draw-src') as maplibregl.GeoJSONSource | undefined
      if (src) src.setData({ type: 'FeatureCollection', features })

      // Live panel-layout preview while drawing (only when >= 3 vertices)
      const plSrc = m.getSource('panel-layout-src') as maplibregl.GeoJSONSource | undefined
      if (plSrc && vertices.length >= 3) {
        try {
          const drawPoly: GeoJSON.Polygon = { type: 'Polygon', coordinates: [[...vertices, vertices[0]]] }
          const fc = panelsToFeatureCollection(computePanelLayout(drawPoly))
          plSrc.setData(fc)
        } catch {
          plSrc.setData({ type: 'FeatureCollection', features: [] })
        }
      } else if (plSrc) {
        plSrc.setData({ type: 'FeatureCollection', features: [] })
      }
    }

    const finish = async () => {
      // ── P1: Polygon validation ──────────────────────────────────────────
      if (vertices.length < 3) {
        showToast('Add at least 3 points to form a roof', 'info')
        return
      }

      // Deduplicate: count distinct vertices (rounded to ~1 cm precision)
      const key = ([lng, lat]: [number, number]) =>
        `${lng.toFixed(7)},${lat.toFixed(7)}`
      const distinctCount = new Set(vertices.map(key)).size
      if (distinctCount < 3) {
        showToast('Polygon has fewer than 3 distinct vertices — redraw the roof', 'error')
        return
      }

      const polygon: GeoJSON.Polygon = { type: 'Polygon', coordinates: [[...vertices, vertices[0]]] }
      const areaSqm = Math.round(turfArea({ type: 'Feature', geometry: polygon, properties: {} }))

      // Reject slivers and degenerate shapes (< 4 m²)
      if (areaSqm < 4) {
        showToast('Polygon area is too small — draw a larger roof outline', 'error')
        return
      }

      // ── P2: Geometry-aware capacity via fitted panel count ──────────────
      let fittedKwp = 0
      let fittedCount = 0
      try {
        const layout = computePanelLayout(polygon)
        fittedCount = layout.count
        // capacityKwp is count × 0.58 kWp (580 W panels, from panel-layout.ts)
        fittedKwp = parseFloat(layout.capacityKwp.toFixed(2))
      } catch {
        // Degenerate polygon that passes area check — fall back to area estimate
        fittedKwp = Math.round(areaSqm * 0.10)
        fittedCount = 0
      }

      setSavingRoof(true)
      const res = await updateRoofGeom(propertyId, polygon, areaSqm, fittedKwp)
      setSavingRoof(false)
      if (!res.ok) { showToast(res.error || 'Failed to save roof', 'error'); return }

      const updated = useAppStore.getState().properties.map((p) =>
        p.id === propertyId
          ? { ...p, roofGeom: polygon, area: areaSqm, capacityKwp: fittedKwp, panelCount: fittedCount }
          : p)
      setProperties(updated)

      const countLabel = fittedCount > 0 ? ` · ${fittedCount} panels` : ''
      showToast(`Roof saved · ${areaSqm.toLocaleString()} m²${countLabel} · ${fittedKwp} kWp`, 'success')
      setDrawRoofFor(null)
    }

    const onClick = (e: maplibregl.MapMouseEvent) => {
      vertices.push([e.lngLat.lng, e.lngLat.lat])
      setDrawVertexCount(vertices.length)
      render()
    }
    const onDblClick = (e: maplibregl.MapMouseEvent) => { e.preventDefault(); void finish() }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setDrawRoofFor(null)
      else if (ev.key === 'Enter') void finish()
    }
    // expose finish for the on-map "Finish" button via a ref hook
    finishRef.current = finish

    const setup = () => {
      for (const id of DRAW_LAYERS) { if (m.getLayer(id)) m.removeLayer(id) }
      if (m.getSource('draw-src')) m.removeSource('draw-src')
      m.addSource('draw-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({ id: 'draw-fill', type: 'fill', source: 'draw-src', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#00E676', 'fill-opacity': 0.25 } })
      m.addLayer({ id: 'draw-line', type: 'line', source: 'draw-src', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#00E676', 'line-width': 2 } })
      m.addLayer({ id: 'draw-vertices', type: 'circle', source: 'draw-src', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#00E676', 'circle-stroke-width': 2 } })
    }
    if (m.isStyleLoaded()) setup()
    else m.once('load', setup)

    // Clear any existing panel-layout data that may have been set for a selected
    // property — the render() function will repopulate it live as vertices are added.
    const clearLayoutSrc = () => {
      const plSrc = m.getSource('panel-layout-src') as maplibregl.GeoJSONSource | undefined
      if (plSrc) plSrc.setData({ type: 'FeatureCollection', features: [] })
    }
    if (m.isStyleLoaded()) clearLayoutSrc()
    else m.once('load', clearLayoutSrc)

    m.doubleClickZoom.disable()
    m.getCanvas().style.cursor = 'crosshair'
    m.on('click', onClick)
    m.on('dblclick', onDblClick)
    window.addEventListener('keydown', onKey)

    return () => {
      isDrawingRef.current = false
      finishRef.current = null
      m.off('click', onClick)
      m.off('dblclick', onDblClick)
      window.removeEventListener('keydown', onKey)
      m.doubleClickZoom.enable()
      m.getCanvas().style.cursor = ''
      for (const id of DRAW_LAYERS) { if (m.getLayer(id)) m.removeLayer(id) }
      if (m.getSource('draw-src')) m.removeSource('draw-src')
      setDrawVertexCount(0)
    }
  }, [drawRoofFor, setProperties, setDrawRoofFor, showToast])

  // ── Scan-area draw mode ────────────────────────────────────────────────────
  // Mirrors the roof-draw machinery but finalises into a createScanRequest call.
  // Source/layers use 'scan-draw-src', 'scan-draw-fill', 'scan-draw-line',
  // 'scan-draw-vertices' to avoid colliding with the roof draw mode.
  // The user clicks vertices, double-clicks or presses Enter to finish (>=3 pts),
  // or presses Esc / clicks Cancel to abort.
  useEffect(() => {
    const m = map.current
    if (!m || !scanAreaDrawing) return

    const vertices: [number, number][] = []
    // Mark a generic "some draw mode is active" so map click handlers on leads/candidates
    // don't fire during vertex placement.
    isDrawingRef.current = true
    setScanAreaVertexCount(0)

    const SCAN_DRAW_LAYERS = ['scan-draw-fill', 'scan-draw-line', 'scan-draw-vertices']

    const render = () => {
      const features: GeoJSON.Feature[] = []
      if (vertices.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: vertices },
          properties: {},
        })
      }
      if (vertices.length >= 3) {
        features.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[...vertices, vertices[0]]] },
          properties: {},
        })
      }
      for (const v of vertices) {
        features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: v }, properties: {} })
      }
      const src = m.getSource('scan-draw-src') as maplibregl.GeoJSONSource | undefined
      if (src) src.setData({ type: 'FeatureCollection', features })
    }

    const finish = async () => {
      if (vertices.length < 3) {
        showToast('Add at least 3 points to define the scan area', 'info')
        return
      }

      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[...vertices, vertices[0]]],
      }

      // Compute bbox [minLng, minLat, maxLng, maxLat]
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
      for (const [lng, lat] of vertices) {
        if (lng < minLng) minLng = lng
        if (lat < minLat) minLat = lat
        if (lng > maxLng) maxLng = lng
        if (lat > maxLat) maxLat = lat
      }
      const bbox = [minLng, minLat, maxLng, maxLat]

      setScanning(true)
      const res = await createScanRequest(polygon, bbox, {}, scanType)
      setScanning(false)

      // Exit draw mode before showing feedback
      setScanAreaDrawing(false)

      if (!res.ok) {
        showToast(res.error || 'Failed to queue scan', 'error')
        return
      }
      showToast(`${scanType === 'land' ? 'Land' : 'Roof'} scan queued — candidates appear for review (up to 10 min)`, 'success')
      fetchScanRequests().then(setScanRequests).catch(() => { /* ignore */ })
    }

    scanFinishRef.current = finish

    const onClick = (e: maplibregl.MapMouseEvent) => {
      vertices.push([e.lngLat.lng, e.lngLat.lat])
      setScanAreaVertexCount(vertices.length)
      render()
    }
    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault()
      void finish()
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setScanAreaDrawing(false)
      else if (ev.key === 'Enter') void finish()
    }

    const setup = () => {
      for (const id of SCAN_DRAW_LAYERS) { if (m.getLayer(id)) m.removeLayer(id) }
      if (m.getSource('scan-draw-src')) m.removeSource('scan-draw-src')
      m.addSource('scan-draw-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      // Orange/amber palette to visually distinguish scan-area draw from the green roof-draw
      m.addLayer({
        id: 'scan-draw-fill', type: 'fill', source: 'scan-draw-src',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#F59E0B', 'fill-opacity': 0.15 },
      })
      m.addLayer({
        id: 'scan-draw-line', type: 'line', source: 'scan-draw-src',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#F59E0B', 'line-width': 2, 'line-dasharray': [4, 2] },
      })
      m.addLayer({
        id: 'scan-draw-vertices', type: 'circle', source: 'scan-draw-src',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 5, 'circle-color': '#ffffff',
          'circle-stroke-color': '#F59E0B', 'circle-stroke-width': 2,
        },
      })
    }

    if (m.isStyleLoaded()) setup()
    else m.once('load', setup)

    m.doubleClickZoom.disable()
    m.getCanvas().style.cursor = 'crosshair'
    m.on('click', onClick)
    m.on('dblclick', onDblClick)
    window.addEventListener('keydown', onKey)

    return () => {
      isDrawingRef.current = false
      scanFinishRef.current = null
      m.off('click', onClick)
      m.off('dblclick', onDblClick)
      window.removeEventListener('keydown', onKey)
      m.doubleClickZoom.enable()
      m.getCanvas().style.cursor = ''
      for (const id of SCAN_DRAW_LAYERS) { if (m.getLayer(id)) m.removeLayer(id) }
      if (m.getSource('scan-draw-src')) m.removeSource('scan-draw-src')
      setScanAreaVertexCount(0)
    }
  }, [scanAreaDrawing, setScanAreaDrawing, setScanRequests, showToast, scanType])

  // ── Panel-layout preview overlay ─────────────────────────────────────────
  // Renders filled panel rectangles on the selected property's roof polygon.
  // Source: 'panel-layout-src'  Layers: 'panel-layout-fill', 'panel-layout-outline'
  // Scoped to the single selected property only (never all properties).
  // During draw mode the draw-mode render() feeds this source live; on selection
  // change we recompute from the persisted roofGeom.
  useEffect(() => {
    const m = map.current
    if (!m) return

    const PANEL_LAYERS = ['panel-layout-fill', 'panel-layout-outline']

    const setup = () => {
      // Always tear down first to handle style reloads cleanly
      for (const id of PANEL_LAYERS) { if (m.getLayer(id)) m.removeLayer(id) }
      if (m.getSource('panel-layout-src')) m.removeSource('panel-layout-src')

      // Add source with an empty collection — data is set below
      m.addSource('panel-layout-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // Semi-transparent dark-blue fill for each panel rectangle
      m.addLayer({
        id: 'panel-layout-fill',
        type: 'fill',
        source: 'panel-layout-src',
        layout: { visibility: showPanelLayout ? 'visible' : 'none' },
        paint: {
          'fill-color': '#1E40AF',
          'fill-opacity': 0.55,
        },
      })

      // Thin bright-blue border around each panel
      m.addLayer({
        id: 'panel-layout-outline',
        type: 'line',
        source: 'panel-layout-src',
        layout: { visibility: showPanelLayout ? 'visible' : 'none' },
        paint: {
          'line-color': '#60A5FA',
          'line-width': 0.8,
          'line-opacity': 0.9,
        },
      })

      // Populate from the selected property's persisted roofGeom (if any)
      // Skip when draw mode is active — render() feeds the source live instead
      if (!drawRoofFor && selectedProperty?.roofGeom) {
        try {
          const fc = panelsToFeatureCollection(
            computePanelLayout(selectedProperty.roofGeom),
          )
          ;(m.getSource('panel-layout-src') as maplibregl.GeoJSONSource).setData(fc)
        } catch (err) {
          console.error('[SolarMap] panel layout failed:', err)
          showToast('Panel layout could not be computed for this roof', 'error')
        }
      }
    }

    if (m.isStyleLoaded()) setup()
    else m.once('load', setup)

    // Re-run setup on style reload (raster tile switches clear all sources/layers)
    m.on('style.load', setup)

    return () => {
      m.off('style.load', setup)
      if (!m) return
      for (const id of PANEL_LAYERS) { if (m.getLayer(id)) m.removeLayer(id) }
      if (m.getSource('panel-layout-src')) m.removeSource('panel-layout-src')
    }
  }, [selectedProperty, showPanelLayout, drawRoofFor, showToast])

  // Track if layers have been set up (to avoid re-creating on data-only changes)
  const propsLayersReady = useRef(false)
  const eventHandlers = useRef<Array<{ type: LayerMouseEventType; layer: string; handler: LayerMouseHandler }>>([])

  // Properties layer with clustering
  useEffect(() => {
    const m = map.current
    if (!m) return

    const PROP_LAYERS = ['cluster-glow', 'clusters', 'cluster-count', 'props-roofs-glow', 'props-roofs', 'props-land-glow', 'props-land']

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: filteredProperties.map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          type: p.type,
          priority: p.priority || 'B',
          title: p.title,
          category: p.category || '',
          solarScore: p.solarScore || 0,
          capacityKwp: p.capacityKwp || 0,
          gridGrade: p.gridProximity?.grade || '',
        },
      })),
    }

    // If source exists, just update data (no flicker)
    const existingSource = m.getSource('props-src') as maplibregl.GeoJSONSource | undefined
    if (existingSource && propsLayersReady.current) {
      existingSource.setData(geojson)
      return
    }

    const setupLayers = () => {
      // Remove old layers/source if they exist
      for (const id of PROP_LAYERS) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      if (m.getSource('props-src')) m.removeSource('props-src')

      // Remove old event handlers
      for (const { type, layer, handler } of eventHandlers.current) {
        m.off(type, layer, handler)
      }
      eventHandlers.current = []

      if (filteredProperties.length === 0) {
        propsLayersReady.current = false
        return
      }

      m.addSource('props-src', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 16,
        clusterRadius: 60,
        clusterProperties: {
          totalKwp: ['+', ['get', 'capacityKwp']],
          countA: ['+', ['case', ['==', ['get', 'priority'], 'A'], 1, 0]],
          countB: ['+', ['case', ['==', ['get', 'priority'], 'B'], 1, 0]],
          countC: ['+', ['case', ['==', ['get', 'priority'], 'C'], 1, 0]],
          countD: ['+', ['case', ['==', ['get', 'priority'], 'D'], 1, 0]],
        },
      })

      // Cluster outer glow
      m.addLayer({
        id: 'cluster-glow', type: 'circle', source: 'props-src',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#2ED89A', 50, '#E8A820', 200, '#E87D20', 1000, '#E85D3A'],
          'circle-radius': ['step', ['get', 'point_count'], 25, 50, 32, 200, 40, 1000, 55],
          'circle-opacity': 0.25,
          'circle-blur': 0.5,
        },
      })

      // Cluster circles
      m.addLayer({
        id: 'clusters', type: 'circle', source: 'props-src',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#2ED89A', 50, '#E8A820', 200, '#E87D20', 1000, '#E85D3A'],
          'circle-radius': ['step', ['get', 'point_count'], 18, 50, 24, 200, 32, 1000, 42],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9,
        },
      })

      // Cluster count labels
      m.addLayer({
        id: 'cluster-count', type: 'symbol', source: 'props-src',
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
        paint: { 'text-color': '#ffffff' },
      })

      // Roof marker glow (dark halo for visibility against satellite)
      m.addLayer({
        id: 'props-roofs-glow', type: 'circle', source: 'props-src',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'roof']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 14, 18, 20],
          'circle-color': '#000000',
          'circle-opacity': 0.4,
          'circle-blur': 0.6,
        },
      })

      // Roof markers
      m.addLayer({
        id: 'props-roofs', type: 'circle', source: 'props-src',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'roof']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 16, 10, 18, 16],
          'circle-color': ['match', ['get', 'priority'], 'A', '#00E676', 'B', '#FFD600', 'C', '#FF9100', 'D', '#FF3D00', '#FFD600'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 2.5, 18, 3],
          'circle-opacity': 0.95,
        },
      })

      // Land marker glow
      m.addLayer({
        id: 'props-land-glow', type: 'circle', source: 'props-src',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'land']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 8, 16, 16, 18, 22],
          'circle-color': '#000000',
          'circle-opacity': 0.4,
          'circle-blur': 0.6,
        },
      })

      // Land markers
      m.addLayer({
        id: 'props-land', type: 'circle', source: 'props-src',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'type'], 'land']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 12, 18, 18],
          'circle-color': ['match', ['get', 'gridGrade'], 'A', '#00E676', 'B', '#FFD600', 'C', '#FF9100', 'D', '#FF3D00', '#E8A820'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 16, 3, 18, 4],
          'circle-opacity': 0.95,
        },
      })

      // --- Event handlers (tracked for cleanup) ---
      const on = (type: LayerMouseEventType, layer: string, handler: LayerMouseHandler) => {
        m.on(type, layer, handler)
        eventHandlers.current.push({ type, layer, handler })
      }

      // Cluster click → zoom in
      on('click', 'clusters', (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        if (!features.length) return
        const clusterId = features[0].properties!.cluster_id
        const source = m.getSource('props-src') as maplibregl.GeoJSONSource
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          m.easeTo({ center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number], zoom })
        })
      })
      on('mouseenter', 'clusters', () => { m.getCanvas().style.cursor = 'pointer' })
      on('mouseleave', 'clusters', () => { m.getCanvas().style.cursor = '' })

      // Property hover + click
      for (const layerId of ['props-roofs', 'props-land']) {
        on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer' })
        on('mouseleave', layerId, () => {
          m.getCanvas().style.cursor = ''
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null }
        })

        on('mousemove', layerId, (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          const f = e.features?.[0]
          if (!f) return
          const p = f.properties as Record<string, string>
          if (popupRef.current) popupRef.current.remove()
          popupRef.current = new maplibregl.Popup({ offset: 12, closeButton: false, closeOnClick: false })
            .setLngLat(e.lngLat)
            .setHTML(`<div style="font-family:system-ui;font-size:12px;max-width:180px">
              <strong>${p.title}</strong>
              ${p.type === 'roof' ? `<br><span style="color:#00E676">Grade ${p.priority}</span> · ${parseFloat(p.capacityKwp).toFixed(0)} kWp` : ''}
              ${p.gridGrade ? `<br><span style="color:#FFD600">Grid: ${p.gridGrade}</span>` : ''}
            </div>`)
            .addTo(m)
        })

        on('click', layerId, (e: maplibregl.MapMouseEvent & { features?: GeoJSON.Feature[] }) => {
          if (isDrawingRef.current) return
          const f = e.features?.[0]
          if (!f) return
          const propId = (f.properties as Record<string, string>).id
          // Look up in filteredProperties (includes the merged Colliers properties)
          // — `properties` alone excludes Colliers, so their markers couldn't be selected.
          const property = filteredProperties.find((p) => p.id === propId)
          if (property) setSelectedProperty(property)
        })
      }

      propsLayersReady.current = true
    }

    if (m.isStyleLoaded()) setupLayers()
    // 'idle' (not 'load') — 'load' only fires once per map lifetime, so on a
    // region switch (when isStyleLoaded() can momentarily report false during the
    // fitBounds + layer re-render cascade) a 'load' listener would never fire and
    // the markers would never rebuild. 'idle' fires after the next render settles.
    else m.once('idle', setupLayers)

    return () => {
      // Clean up event handlers on unmount
      if (!m) return
      for (const { type, layer, handler } of eventHandlers.current) {
        m.off(type, layer, handler)
      }
      eventHandlers.current = []
      propsLayersReady.current = false
    }
  }, [filteredProperties, properties, setSelectedProperty])

  return (
    <>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
      {canScan && !drawRoofFor && !scanAreaDrawing && !reviewCandidate && (
        <div className="absolute top-32 left-4 z-20 flex items-center gap-2">
          {/* Roof / Land type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-white/10 bg-[#0D2137]/90 backdrop-blur-xl shadow-lg">
            <button
              onClick={() => setScanType('roof')}
              className={`px-2.5 py-2 text-[11px] font-semibold transition-colors ${
                scanType === 'roof'
                  ? 'bg-[#F59E0B]/20 text-[#FCD34D]'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Scan for rooftops"
            >
              🏠 Roof
            </button>
            <button
              onClick={() => setScanType('land')}
              className={`px-2.5 py-2 text-[11px] font-semibold transition-colors border-l border-white/10 ${
                scanType === 'land'
                  ? 'bg-[#2ED89A]/20 text-[#2ED89A]'
                  : 'text-white/40 hover:text-white/70'
              }`}
              title="Scan for land plots"
            >
              🌾 Land
            </button>
          </div>
          <button
            onClick={handleScanArea}
            disabled={scanning}
            title={`Draw a polygon to scan for ${scanType === 'land' ? 'land plots' : 'rooftops'}`}
            aria-label="Draw scan area"
            className="px-3 py-2 rounded-xl bg-[#0D2137]/90 backdrop-blur-xl border border-[#F59E0B]/40 text-[#FCD34D] text-xs font-semibold flex items-center gap-2 hover:bg-[#F59E0B]/15 transition-colors disabled:opacity-50 shadow-lg"
          >
            {scanning ? 'Queuing…' : '⊕ Draw scan area'}
          </button>
        </div>
      )}
      {scanAreaDrawing && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#0D2137]/95 backdrop-blur-xl rounded-xl border border-[#F59E0B]/40 px-4 py-2.5 flex items-center gap-3 shadow-xl">
          <span className="text-white/80 text-xs">
            {scanType === 'land' ? '🌾' : '🏠'} <span className={`font-semibold ${scanType === 'land' ? 'text-[#2ED89A]' : 'text-[#FCD34D]'}`}>{scanType === 'land' ? 'Land' : 'Roof'} scan</span>
            {' '}· <strong className="text-[#FCD34D]">{scanAreaVertexCount}</strong> point{scanAreaVertexCount === 1 ? '' : 's'}
            <span className="text-white/40"> — click to add vertices, double-click / Enter to finish</span>
          </span>
          <button
            onClick={() => scanFinishRef.current?.()}
            disabled={scanning || scanAreaVertexCount < 3}
            className="px-3 py-1 rounded-lg bg-[#F59E0B]/20 text-[#FCD34D] text-xs font-semibold disabled:opacity-40 hover:bg-[#F59E0B]/30 transition-colors"
          >
            {scanning ? 'Queuing…' : 'Scan'}
          </button>
          <button
            onClick={() => setScanAreaDrawing(false)}
            className="px-3 py-1 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {drawRoofFor && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#0D2137]/95 backdrop-blur-xl rounded-xl border border-[#00E676]/30 px-4 py-2.5 flex items-center gap-3 shadow-xl">
          <span className="text-white/80 text-xs">
            Drawing roof · <strong className="text-[#00E676]">{drawVertexCount}</strong> point{drawVertexCount === 1 ? '' : 's'}
            <span className="text-white/40"> — click to add, double-click / Enter to finish</span>
          </span>
          <button
            onClick={() => finishRef.current?.()}
            disabled={savingRoof || drawVertexCount < 3}
            className="px-3 py-1 rounded-lg bg-[#00E676]/20 text-[#00E676] text-xs font-semibold disabled:opacity-40 hover:bg-[#00E676]/30 transition-colors"
          >
            {savingRoof ? 'Saving…' : 'Finish'}
          </button>
          <button
            onClick={() => setDrawRoofFor(null)}
            className="px-3 py-1 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {/* Panel-layout toggle — visible when a property with a roof polygon is selected */}
      {selectedProperty?.roofGeom && !drawRoofFor && !scanAreaDrawing && !reviewCandidate && (
        <button
          onClick={() => setShowPanelLayout((v) => !v)}
          title={showPanelLayout ? 'Hide panel layout' : 'Show panel layout'}
          aria-pressed={showPanelLayout}
          className={`absolute top-44 left-4 z-20 px-3 py-2 rounded-xl bg-[#0D2137]/90 backdrop-blur-xl border text-xs font-semibold flex items-center gap-2 shadow-lg transition-colors ${
            showPanelLayout
              ? 'border-[#1E40AF]/70 text-[#60A5FA] hover:bg-[#1E40AF]/20'
              : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'
          }`}
        >
          {showPanelLayout ? 'Panels on' : 'Panels off'}
        </button>
      )}
      {reviewCandidate && !drawRoofFor && !scanAreaDrawing && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#0D2137]/95 backdrop-blur-xl rounded-xl border border-[#C026D3]/40 px-4 py-2.5 flex items-center gap-3 shadow-xl">
          <span className="text-white/80 text-xs max-w-xs flex items-center gap-1.5 flex-wrap">
            <span className="shrink-0">{reviewCandidate.type === 'land' ? '🌾' : '🏠'}</span>
            <strong className="text-[#E879F9] truncate max-w-[140px]">{reviewCandidate.title}</strong>
            {reviewCandidate.type === 'land' ? (
              <>
                {reviewCandidate.sizeRai != null && (
                  <span className="text-white/40 shrink-0"> · {reviewCandidate.sizeRai.toFixed(1)} rai</span>
                )}
                {reviewCandidate.capacityKwp != null && (
                  <span className="text-white/40 shrink-0"> · {(reviewCandidate.capacityKwp / 1000).toFixed(1)} MWp</span>
                )}
                {reviewCandidate.tier === 'farm' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E8A820]/20 text-[#E8A820] border border-[#E8A820]/30 shrink-0">Farm ≤9MW</span>
                )}
                {reviewCandidate.tier === 'utility' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">Utility / DC-scale</span>
                )}
                {reviewCandidate.tier === 'commercial' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">Commercial</span>
                )}
              </>
            ) : (
              <>
                {reviewCandidate.area ? <span className="text-white/40 shrink-0"> · {Math.round(reviewCandidate.area).toLocaleString()} m²</span> : null}
                {reviewCandidate.capacityKwp ? <span className="text-white/40 shrink-0"> · {Math.round(reviewCandidate.capacityKwp)} kWp</span> : null}
              </>
            )}
          </span>
          <button
            onClick={handleConfirmCandidate}
            disabled={confirmingCand}
            className="px-3 py-1 rounded-lg bg-[#C026D3]/25 text-[#E879F9] text-xs font-semibold disabled:opacity-40 hover:bg-[#C026D3]/35 transition-colors"
          >
            {confirmingCand ? 'Saving…' : 'Add lead'}
          </button>
          <button
            onClick={() => void handleRejectCandidate()}
            disabled={confirmingCand}
            className="px-3 py-1 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      )}
    </>
  )
}
