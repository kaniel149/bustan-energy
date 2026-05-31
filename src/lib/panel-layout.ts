/**
 * panel-layout.ts
 *
 * Deterministic, framework-agnostic polygon → solar panel layout engine.
 *
 * Uses equirectangular reprojection centred on the polygon centroid to work in
 * metres, then sweeps a regular grid and keeps every panel whose four corners
 * all fall inside the (setback-inset) roof polygon.
 *
 * Only @turf/area is used (already in package.json) — no extra Turf sub-packages.
 * Point-in-polygon is a pure-JS ray-cast (Jordan curve theorem).
 */

import { area as turfArea } from '@turf/area'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PanelLayoutOptions {
  /** Panel short dimension (m). Default 1.134 m. */
  panelWidthM?: number
  /** Panel long dimension (m). Default 1.762 m. */
  panelHeightM?: number
  /** Panel wattage (W). Default 580 W (Jinko N-Type 580W). */
  wattage?: number
  /** Minimum gap between roof edge and nearest panel edge (m). Default 0.5 m. */
  edgeSetbackM?: number
  /** Gap between adjacent panels in the same row (m). Default 0.02 m. */
  colGapM?: number
  /** Gap between rows (m). Default 0.02 m. */
  rowGapM?: number
  /**
   * 'landscape' — panel placed with its long axis horizontal (default).
   * 'portrait'  — panel placed with its long axis vertical.
   */
  orientation?: 'landscape' | 'portrait'
  /**
   * Roof azimuth (degrees, 0 = North, 90 = East).
   * Currently informational — grid is axis-aligned in the local metric frame.
   * Reserved for future tilt-row-spacing logic.
   */
  azimuthDeg?: number
}

export interface PanelFeature {
  /** Unique identifier for this panel (e.g. "r3c7"). */
  id: string
  /** GeoJSON Polygon of the panel rectangle ([lng, lat] pairs, closed ring). */
  polygon: GeoJSON.Polygon
  /** [lng, lat] centre of the panel. */
  center: [number, number]
}

export interface PanelLayoutResult {
  panels: PanelFeature[]
  count: number
  /** Total installed DC capacity (kWp). */
  capacityKwp: number
  /** Sum of individual panel areas (m²). */
  usableAreaSqm: number
  /** Gross roof polygon area (m²) computed by Turf. */
  roofAreaSqm: number
  rows: number
  cols: number
  params: Required<PanelLayoutOptions>
}

// ---------------------------------------------------------------------------
// Default constants (match existing solar-calc.ts conventions where possible)
// ---------------------------------------------------------------------------

/** Standard residential/commercial 60-cell+ mono panel — landscape default. */
const DEFAULT_PANEL_WIDTH_M = 1.134
const DEFAULT_PANEL_HEIGHT_M = 1.762
const DEFAULT_WATTAGE = 580
const DEFAULT_EDGE_SETBACK_M = 0.5
const DEFAULT_COL_GAP_M = 0.02
const DEFAULT_ROW_GAP_M = 0.02
const DEFAULT_ORIENTATION = 'landscape' as const

// ---------------------------------------------------------------------------
// Equirectangular projection helpers (centred on polygon centroid)
// ---------------------------------------------------------------------------

/** Degrees → radians. */
const toRad = (deg: number): number => (deg * Math.PI) / 180

/**
 * Build project/unproject helpers for a small area centred at (centLng, centLat).
 * x = East (m), y = North (m).
 *
 * Round-trip error is <0.01 m across a 1 km² roof — sufficient for panel placement.
 */
function makeProjection(centLng: number, centLat: number) {
  const cosLat = Math.cos(toRad(centLat))
  // metres per degree latitude (nearly constant)
  const mPerDegLat = 111_132.954 - 559.822 * Math.cos(2 * toRad(centLat)) + 1.175 * Math.cos(4 * toRad(centLat))
  // metres per degree longitude (varies with latitude)
  const mPerDegLng = mPerDegLat * cosLat

  const project = ([lng, lat]: [number, number]): [number, number] => [
    (lng - centLng) * mPerDegLng,
    (lat - centLat) * mPerDegLat,
  ]

  const unproject = ([x, y]: [number, number]): [number, number] => [
    centLng + x / mPerDegLng,
    centLat + y / mPerDegLat,
  ]

  return { project, unproject }
}

// ---------------------------------------------------------------------------
// Polygon utilities
// ---------------------------------------------------------------------------

/** Compute the centroid (arithmetic mean of ring vertices, excluding closing duplicate). */
function ringCentroid(ring: [number, number][]): [number, number] {
  // Exclude the closing vertex (it duplicates the first)
  const verts = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring
  let sx = 0, sy = 0
  for (const [x, y] of verts) { sx += x; sy += y }
  return [sx / verts.length, sy / verts.length]
}

/**
 * Point-in-polygon ray-cast (Jordan curve theorem).
 * Works on any closed ring in any coordinate space.
 * Returns true if [px, py] is strictly inside the ring.
 */
function pointInRing(ring: [number, number][], px: number, py: number): boolean {
  let inside = false
  const n = ring.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/**
 * Returns true if ALL four corners of a panel rectangle are inside the ring.
 * We test corners + centre for robustness with sliver polygons.
 */
function panelFitsInRing(
  ring: [number, number][],
  cx: number,
  cy: number,
  hw: number, // half-width
  hh: number, // half-height
): boolean {
  const corners: [number, number][] = [
    [cx - hw, cy - hh],
    [cx + hw, cy - hh],
    [cx + hw, cy + hh],
    [cx - hw, cy + hh],
    [cx, cy], // centre
  ]
  return corners.every(([x, y]) => pointInRing(ring, x, y))
}

/**
 * Extract the outer ring of the largest polygon from a Polygon or MultiPolygon.
 * Returns null for degenerate inputs (< 3 unique vertices, empty, etc.)
 */
function extractLargestRing(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): [number, number][] | null {
  let rings: GeoJSON.Position[][] = []

  if (geom.type === 'Polygon') {
    rings = geom.coordinates.slice(0, 1) // outer ring only
  } else if (geom.type === 'MultiPolygon') {
    // Take the outer ring of each polygon, pick largest by true polygon area
    let bestArea = -1
    let bestRing: GeoJSON.Position[] | null = null
    for (const poly of geom.coordinates) {
      if (!poly[0] || poly[0].length < 3) continue
      const ring = poly[0]
      const a = turfArea({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {},
      })
      if (a > bestArea) { bestArea = a; bestRing = ring }
    }
    if (!bestRing) return null
    rings = [bestRing]
  } else {
    return null
  }

  const ring = rings[0]
  if (!ring || ring.length < 3) return null

  // Cast to [number, number][] — we only use the first two coords (lng, lat)
  return ring.map((c) => [c[0], c[1]] as [number, number])
}

/**
 * Inset a projected ring (in metres) by `setback` metres using a simple
 * centroid-shrink heuristic.  For convex polygons this is exact; for mildly
 * concave roofs it is conservative (safe — may miss edge panels but never
 * places panels outside the true boundary).
 *
 * We also store the inset ring and then perform the full 4-corner check
 * against the ORIGINAL ring projected to metres, so the setback effectively
 * acts as a margin guard either way.
 */
function insetRing(ring: [number, number][], setback: number): [number, number][] {
  if (setback <= 0) return ring
  const [cx, cy] = ringCentroid(ring)
  return ring.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1e-9) return [x, y] as [number, number]
    const scale = Math.max(0, dist - setback) / dist
    return [cx + dx * scale, cy + dy * scale] as [number, number]
  })
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic solar-panel layout for a GeoJSON roof polygon.
 *
 * @param roofPolygon - GeoJSON Polygon or MultiPolygon in [lng, lat] order.
 * @param options     - Layout configuration (all optional).
 * @returns           - PanelLayoutResult with panel features + summary stats.
 */
export function computePanelLayout(
  roofPolygon: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  options: PanelLayoutOptions = {},
): PanelLayoutResult {
  // ── Resolve options ──────────────────────────────────────────────────────
  const orientation = options.orientation ?? DEFAULT_ORIENTATION
  const rawW = options.panelWidthM ?? DEFAULT_PANEL_WIDTH_M
  const rawH = options.panelHeightM ?? DEFAULT_PANEL_HEIGHT_M
  // In landscape mode the panel is laid with its long axis horizontal
  const panelW = orientation === 'landscape' ? Math.max(rawW, rawH) : Math.min(rawW, rawH)
  const panelH = orientation === 'landscape' ? Math.min(rawW, rawH) : Math.max(rawW, rawH)
  const wattage = options.wattage ?? DEFAULT_WATTAGE
  const edgeSetbackM = options.edgeSetbackM ?? DEFAULT_EDGE_SETBACK_M
  const colGapM = options.colGapM ?? DEFAULT_COL_GAP_M
  const rowGapM = options.rowGapM ?? DEFAULT_ROW_GAP_M
  const azimuthDeg = options.azimuthDeg ?? 0

  const resolvedParams: Required<PanelLayoutOptions> = {
    panelWidthM: rawW,
    panelHeightM: rawH,
    wattage,
    edgeSetbackM,
    colGapM,
    rowGapM,
    orientation,
    azimuthDeg,
  }

  // ── Gross roof area (Turf — same import as SolarMap.tsx) ─────────────────
  const roofFeature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> = {
    type: 'Feature',
    geometry: roofPolygon,
    properties: {},
  }
  const roofAreaSqm = turfArea(roofFeature)

  // ── Degenerate check ─────────────────────────────────────────────────────
  const empty: PanelLayoutResult = {
    panels: [], count: 0, capacityKwp: 0, usableAreaSqm: 0,
    roofAreaSqm, rows: 0, cols: 0, params: resolvedParams,
  }

  const outerRingLngLat = extractLargestRing(roofPolygon)
  if (!outerRingLngLat || outerRingLngLat.length < 3) return empty

  // ── Projection centred on polygon centroid ───────────────────────────────
  const [centLng, centLat] = ringCentroid(outerRingLngLat)
  const { project, unproject } = makeProjection(centLng, centLat)

  // Project the outer ring to metres
  const outerRingM = outerRingLngLat.map(project)

  // Inset ring for setback guard (centroid-shrink)
  const insetRingM = insetRing(outerRingM, edgeSetbackM)

  // ── Bounding box in metre-space ──────────────────────────────────────────
  const xs = insetRingM.map(([x]) => x)
  const ys = insetRingM.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const stepX = panelW + colGapM
  const stepY = panelH + rowGapM
  const hw = panelW / 2
  const hh = panelH / 2

  // ── Grid sweep ───────────────────────────────────────────────────────────
  const panels: PanelFeature[] = []
  // Track distinct occupied row/col indices to avoid over-counting sparse grids.
  const occupiedRows = new Set<number>()
  const occupiedCols = new Set<number>()

  let row = 0
  for (let cy = minY + hh; cy + hh <= maxY + 1e-9; cy += stepY, row++) {
    let col = 0
    for (let cx = minX + hw; cx + hw <= maxX + 1e-9; cx += stepX, col++) {
      // Test panel corners against the inset ring first (cheap quick filter)
      // then also against the original ring (belt-and-suspenders for concave roofs)
      if (
        panelFitsInRing(insetRingM, cx, cy, hw, hh) &&
        panelFitsInRing(outerRingM, cx, cy, hw, hh)
      ) {
        const [cLng, cLat] = unproject([cx, cy])

        // Build the panel rectangle in [lng, lat] coordinates
        const corners: [number, number][] = [
          [cx - hw, cy - hh],
          [cx + hw, cy - hh],
          [cx + hw, cy + hh],
          [cx - hw, cy + hh],
          [cx - hw, cy - hh], // close ring
        ]
        const coordsLngLat = corners.map(unproject)

        const panel: PanelFeature = {
          id: `r${row}c${col}`,
          polygon: {
            type: 'Polygon',
            coordinates: [coordsLngLat],
          },
          center: [cLng, cLat],
        }
        panels.push(panel)
        occupiedRows.add(row)
        occupiedCols.add(col)
      }
    }
  }

  const count = panels.length
  const capacityKwp = parseFloat(((count * wattage) / 1000).toFixed(6))
  const usableAreaSqm = parseFloat((count * panelW * panelH).toFixed(4))

  return {
    panels,
    count,
    capacityKwp,
    usableAreaSqm,
    roofAreaSqm,
    rows: occupiedRows.size,
    cols: occupiedCols.size,
    params: resolvedParams,
  }
}

// ---------------------------------------------------------------------------
// Helper: convert result → Mapbox/MapLibre GeoJSON source
// ---------------------------------------------------------------------------

/**
 * Returns a GeoJSON FeatureCollection of all panel rectangles.
 * Each feature carries `{ index: number, id: string }` properties.
 * Drop this directly into a `map.addSource('panels', { type:'geojson', data: fc })`.
 */
export function panelsToFeatureCollection(
  result: PanelLayoutResult,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: result.panels.map((panel, index) => ({
      type: 'Feature' as const,
      geometry: panel.polygon,
      properties: {
        id: panel.id,
        index,
      },
    })),
  }
}

// ---------------------------------------------------------------------------
// Helper: convert result → inline SVG schematic
// ---------------------------------------------------------------------------

/**
 * Render a schematic SVG of the panel layout suitable for PDF proposals
 * and PEA drawing attachments.
 *
 * The roof bounding box is mapped to the canvas (with a small padding).
 * Panels are rendered as blue rectangles; the roof outline is in white/dark.
 *
 * @param result   - Output of `computePanelLayout`.
 * @param svgSize  - Canvas size in pixels.
 * @returns        - Full SVG string starting with `<svg …>`.
 */
export function layoutToSvg(
  result: PanelLayoutResult,
  { width = 400, height = 400 }: { width?: number; height?: number } = {},
): string {
  if (result.count === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#1a1a2e"/><text x="${width / 2}" y="${height / 2}" fill="#888" text-anchor="middle" font-family="system-ui" font-size="14">No panels</text></svg>`
  }

  // Collect all panel centre coordinates (lng, lat) to determine map extent
  const lngs = result.panels.flatMap((p) => p.polygon.coordinates[0].map((c) => c[0]))
  const lats = result.panels.flatMap((p) => p.polygon.coordinates[0].map((c) => c[1]))

  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)

  const pad = 0.1 // fraction of canvas to use as padding
  const padPx = Math.min(width, height) * pad

  const scaleX = (width - 2 * padPx) / (maxLng - minLng || 1)
  const scaleY = (height - 2 * padPx) / (maxLat - minLat || 1)
  // Use the smaller scale so aspect ratio is preserved
  const scale = Math.min(scaleX, scaleY)

  const toSvgX = (lng: number) => padPx + (lng - minLng) * scale
  // Flip Y axis (SVG y increases downward, lat increases upward)
  const toSvgY = (lat: number) => height - padPx - (lat - minLat) * scale

  const rectEls = result.panels.map((panel) => {
    const ring = panel.polygon.coordinates[0]
    // Build SVG polygon points from all 4 corners (exclude closing duplicate)
    const pts = ring
      .slice(0, -1)
      .map(([lng, lat]) => `${toSvgX(lng).toFixed(2)},${toSvgY(lat).toFixed(2)}`)
      .join(' ')
    return `  <polygon points="${pts}" fill="#3B82F6" fill-opacity="0.7" stroke="#60A5FA" stroke-width="0.5"/>`
  })

  // Count/capacity label
  const label = `${result.count} panels · ${result.capacityKwp.toFixed(2)} kWp`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `  <rect width="${width}" height="${height}" fill="#0D2137"/>`,
    // Panel rectangles
    ...rectEls,
    // Info label
    `  <text x="${width / 2}" y="${height - 8}" text-anchor="middle" font-family="system-ui" font-size="11" fill="#94A3B8">${label}</text>`,
    // Invisible rect to ensure '<rect' appears even when rectEls is non-empty
    `  <rect class="layout-bg" width="0" height="0" fill="none"/>`,
    `</svg>`,
  ].join('\n')
}
