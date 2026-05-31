/**
 * ColliersMap.tsx
 *
 * Mapbox-GL (via maplibre-gl) map view for the Colliers Thailand portfolio.
 * Renders one circle marker per geocoded listing, colored by tier.
 * Click → popup with listing details.
 * Filters applied upstream via the `listings` prop (already filtered).
 *
 * Token: VITE_MAPBOX_TOKEN (same env var as SolarMap).
 * Map style: Mapbox satellite tiles (same as SolarMap mapbox source).
 */

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { CollierListing } from '../../lib/colliers'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAPBOX_TOKEN: string = import.meta.env.VITE_MAPBOX_TOKEN || ''

/** Bangkok center — most listings are in Thailand */
const THAILAND_CENTER: [number, number] = [100.5018, 13.7563]
const INITIAL_ZOOM = 7

/** Tier hex colors — must mirror TIER_CONFIG in ColliersPortfolio.tsx */
const TIER_COLOR: Record<'A' | 'B' | 'C' | 'D', string> = {
  A: '#2ED89A',
  B: '#E8A820',
  C: '#E87D20',
  D: '#E85D3A',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtThb(n: number | null): string {
  if (n === null) return '—'
  return '฿' + n.toLocaleString('en-US')
}

function fmtSqm(n: number | null): string {
  if (n === null) return '—'
  return n.toLocaleString('en-US') + ' m²'
}

function buildPopupHtml(l: CollierListing): string {
  const tierColor = TIER_COLOR[l.tier]
  const sourceLink = l.url
    ? `<a href="${l.url}" target="_blank" rel="noopener noreferrer"
         style="color:${tierColor};font-size:10px;display:block;margin-top:6px;">
         DotProperty listing ↗
       </a>`
    : ''
  return `
    <div style="font-family:system-ui;font-size:12px;min-width:200px;max-width:240px;color:#e2e8f0;line-height:1.5">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
        <span style="
          background:${tierColor}22;
          color:${tierColor};
          border:1px solid ${tierColor}55;
          border-radius:4px;
          padding:1px 6px;
          font-size:10px;
          font-weight:700;
          letter-spacing:0.05em;
          text-transform:uppercase;
        ">Tier ${l.tier}</span>
        <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">${l.assetType || '—'}</span>
      </div>
      <p style="font-weight:600;font-size:13px;margin:0 0 4px;color:#f1f5f9;line-height:1.3">${l.name || '—'}</p>
      <p style="margin:0 0 2px;color:#94a3b8;font-size:11px">${l.locationRaw || '—'}</p>
      <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;font-size:11px">
        <span style="color:#64748b">Listing</span>
        <span style="color:#e2e8f0;text-transform:capitalize">${l.listing}</span>
        <span style="color:#64748b">Area</span>
        <span style="color:#e2e8f0">${fmtSqm(l.areaSqm)}</span>
        <span style="color:#64748b">Price</span>
        <span style="color:#e2e8f0">${fmtThb(l.priceThb)}</span>
        <span style="color:#64748b">Est. kWp*</span>
        <span style="color:${tierColor};font-weight:600">${l.estKwp > 0 ? l.estKwp.toLocaleString('en-US') : '—'}</span>
      </div>
      <p style="font-size:9px;color:#475569;margin-top:6px">* Preliminary demo estimate</p>
      ${sourceLink}
    </div>
  `
}

function buildGeoJSON(
  listings: CollierListing[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = listings
    .filter((l): l is CollierListing & { lat: number; lng: number } =>
      l.lat !== undefined && l.lng !== undefined,
    )
    .map((l) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [l.lng, l.lat] },
      properties: {
        id: l.id,
        tier: l.tier,
        color: TIER_COLOR[l.tier],
        name: l.name,
        assetType: l.assetType,
        listing: l.listing,
        locationRaw: l.locationRaw,
        areaSqm: l.areaSqm,
        priceThb: l.priceThb,
        estKwp: l.estKwp,
        url: l.url,
      },
    }))
  return { type: 'FeatureCollection', features }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ColliersMapProps {
  /** Already-filtered listings from useColliersPortfolio */
  listings: CollierListing[]
  /** Total count before filtering (for the geocoded note) */
  totalCount: number
}

export function ColliersMap({ listings, totalCount }: ColliersMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const layersReadyRef = useRef(false)

  const geocodedTotal = listings.filter((l) => l.lat !== undefined).length

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'base-tiles': {
            type: 'raster',
            tiles: MAPBOX_TOKEN
              ? [`https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${MAPBOX_TOKEN}`]
              : [
                  'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                  'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                ],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [{ id: 'base-layer', type: 'raster', source: 'base-tiles' }],
      },
      center: THAILAND_CENTER,
      zoom: INITIAL_ZOOM,
    })

    m.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    mapRef.current = m

    return () => {
      popupRef.current?.remove()
      m.remove()
      mapRef.current = null
      layersReadyRef.current = false
    }
  }, [])

  // Update markers whenever filtered listings change
  useEffect(() => {
    const m = mapRef.current
    if (!m) return

    const geojson = buildGeoJSON(listings)

    const applyData = () => {
      // If source already exists, just update the data (no flicker)
      const existingSrc = m.getSource('colliers-src') as maplibregl.GeoJSONSource | undefined
      if (existingSrc && layersReadyRef.current) {
        existingSrc.setData(geojson)
        return
      }

      // Remove previous layers/source on re-setup
      for (const id of ['colliers-glow', 'colliers-markers']) {
        if (m.getLayer(id)) m.removeLayer(id)
      }
      if (m.getSource('colliers-src')) m.removeSource('colliers-src')

      m.addSource('colliers-src', { type: 'geojson', data: geojson })

      // Soft glow halo beneath each marker
      m.addLayer({
        id: 'colliers-glow',
        type: 'circle',
        source: 'colliers-src',
        paint: {
          'circle-radius': 14,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.18,
          'circle-blur': 0.7,
        },
      })

      // Solid marker
      m.addLayer({
        id: 'colliers-markers',
        type: 'circle',
        source: 'colliers-src',
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.95,
        },
      })

      // Hover cursor
      m.on('mouseenter', 'colliers-markers', () => {
        m.getCanvas().style.cursor = 'pointer'
      })
      m.on('mouseleave', 'colliers-markers', () => {
        m.getCanvas().style.cursor = ''
      })

      // Click → popup
      m.on('click', 'colliers-markers', (e) => {
        const f = e.features?.[0]
        if (!f || f.geometry.type !== 'Point') return
        const coords = f.geometry.coordinates as [number, number]

        // Look up the full listing object to build rich popup
        const id = (f.properties as Record<string, string>).id
        const listing = listings.find((l) => l.id === id)
        if (!listing) return

        popupRef.current?.remove()
        popupRef.current = new maplibregl.Popup({ offset: 12, maxWidth: '260px' })
          .setLngLat(coords)
          .setHTML(buildPopupHtml(listing))
          .addTo(m)
      })

      layersReadyRef.current = true

      // Fit map to geocoded markers on first render (if any exist)
      if (geojson.features.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        for (const f of geojson.features) {
          const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates
          bounds.extend([lng, lat])
        }
        if (!bounds.isEmpty()) {
          m.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 800 })
        }
      }
    }

    if (m.isStyleLoaded()) applyData()
    else m.once('load', applyData)
  }, [listings])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10" style={{ height: '560px' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Geocode note */}
      <div className="absolute bottom-10 left-3 z-10 bg-[#0D2137]/85 backdrop-blur-md rounded-lg px-3 py-1.5 text-[10px] text-white/50 pointer-events-none">
        {geocodedTotal} of {totalCount} listings geocoded (district-level, approximate)
        {listings.length < totalCount && (
          <span className="text-white/35"> · {totalCount - listings.length} hidden by filters</span>
        )}
      </div>

      {/* Tier legend */}
      <div className="absolute top-3 left-3 z-10 bg-[#0D2137]/85 backdrop-blur-md rounded-lg px-3 py-2 flex flex-col gap-1">
        {(Object.entries(TIER_COLOR) as [keyof typeof TIER_COLOR, string][]).map(([tier, color]) => (
          <div key={tier} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-white/60">Tier {tier}</span>
          </div>
        ))}
      </div>

      {geocodedTotal === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-white/30 text-sm bg-[#0D2137]/70 backdrop-blur-sm rounded-xl px-5 py-3">
            No geocoded listings match current filters
          </p>
        </div>
      )}
    </div>
  )
}
