import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAppStore } from '../../lib/store'
import { useFilteredProperties } from '../../hooks/useFilteredProperties'
import { REGIONS } from '../../lib/regions'

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

export function SolarMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)

  const filters = useAppStore((s) => s.filters)
  const mapStyle = useAppStore((s) => s.mapStyle)
  const gridData = useAppStore((s) => s.gridData)
  const properties = useAppStore((s) => s.properties)
  const setSelectedProperty = useAppStore((s) => s.setSelectedProperty)
  const filteredProperties = useFilteredProperties()

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
            tiles: TILE_SOURCES.satellite,
            tileSize: 256,
            maxzoom: 20,
          },
        },
        layers: [
          { id: 'raster-layer', type: 'raster', source: 'raster-tiles' },
        ],
      },
      center: regionConfig.center,
      zoom: regionConfig.zoom,
      maxZoom: 18,
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
      if (src) src.setTiles(TILE_SOURCES[mapStyle])
    }
    if (m.isStyleLoaded()) apply()
    else m.on('load', apply)
  }, [mapStyle])

  // Fly to region
  useEffect(() => {
    map.current?.flyTo({ center: regionConfig.center, zoom: regionConfig.zoom, duration: 1500 })
  }, [regionConfig])

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
    else m.on('load', addBuffers)
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
    else m.on('load', addGrid)
  }, [gridData, filters.showGrid, filters.region])

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
          const f = e.features?.[0]
          if (!f) return
          const propId = (f.properties as Record<string, string>).id
          const property = properties.find((p) => p.id === propId)
          if (property) setSelectedProperty(property)
        })
      }

      propsLayersReady.current = true
    }

    if (m.isStyleLoaded()) setupLayers()
    else m.once('load', setupLayers)

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
    <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />
  )
}
