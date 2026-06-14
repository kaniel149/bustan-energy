/**
 * Grid proximity scoring for land (solar-farm) candidates.
 *
 * A ground-mount site is only worth pursuing if it can connect: parcels next to
 * a PEA substation or a transmission line score high, distant ones score low.
 * Computed client-side from the loaded grid GeoJSON (substations as points/
 * polygons, transmission lines as LineStrings). Grid data currently covers the
 * EEC + islands; outside that coverage `via` is null and callers show "no grid
 * data" rather than a misleading 0.
 */

export interface GridProximity {
  /** Metres to the nearest grid feature (substation or line). null = no grid data nearby. */
  distM: number | null
  via: 'substation' | 'line' | null
  /** 0–100; closer = higher. null when no grid data is available for the area. */
  score: number | null
}

const M_PER_DEG_LAT = 111_320

function metersBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const k = Math.cos((lat1 * Math.PI) / 180)
  const dx = (lon2 - lon1) * M_PER_DEG_LAT * k
  const dy = (lat2 - lat1) * M_PER_DEG_LAT
  return Math.hypot(dx, dy)
}

/** Distance (m) from point P to segment AB, equirectangular at P's latitude. */
function pointToSegmentM(
  plat: number, plon: number,
  alat: number, alon: number,
  blat: number, blon: number,
): number {
  const k = Math.cos((plat * Math.PI) / 180)
  const px = plon * M_PER_DEG_LAT * k, py = plat * M_PER_DEG_LAT
  const ax = alon * M_PER_DEG_LAT * k, ay = alat * M_PER_DEG_LAT
  const bx = blon * M_PER_DEG_LAT * k, by = blat * M_PER_DEG_LAT
  const abx = bx - ax, aby = by - ay
  const abLen2 = abx * abx + aby * aby
  if (abLen2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * abx + (py - ay) * aby) / abLen2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby))
}

/** Distance buckets → score. Mirrors how a developer ranks interconnection ease. */
function distToScore(distM: number): number {
  if (distM < 300) return 100
  if (distM < 1000) return 90
  if (distM < 2000) return 75
  if (distM < 5000) return 55
  if (distM < 10000) return 35
  if (distM < 20000) return 15
  return 5
}

/** Representative [lat, lon] points for a grid feature's geometry. */
function geomPoints(geom: GeoJSON.Geometry): Array<[number, number]> {
  switch (geom.type) {
    case 'Point': return [[geom.coordinates[1], geom.coordinates[0]]]
    case 'MultiPoint':
    case 'LineString':
      return (geom.coordinates as number[][]).map((c) => [c[1], c[0]])
    case 'Polygon':
      return (geom.coordinates[0] as number[][]).map((c) => [c[1], c[0]])
    default: return []
  }
}

function featureKind(f: GeoJSON.Feature): 'substation' | 'line' | null {
  const p = (f.properties ?? {}) as Record<string, unknown>
  const t = String(p.power_type ?? p.power ?? '').toLowerCase()
  if (t.includes('substation')) return 'substation'
  if (t === 'line' || t === 'minor_line' || t === 'cable') return 'line'
  return null
}

/**
 * Nearest substation / transmission line to a point. Substations weigh more
 * (an injection point beats a passing line), so a substation within 1.2× the
 * nearest line distance still wins the `via` label.
 */
export function computeGridProximity(
  lat: number,
  lon: number,
  grid: GeoJSON.FeatureCollection | null,
): GridProximity {
  if (!grid || !Number.isFinite(lat) || !Number.isFinite(lon)) return { distM: null, via: null, score: null }

  let subBest = Infinity
  let lineBest = Infinity

  for (const f of grid.features) {
    const kind = featureKind(f)
    if (!kind || !f.geometry) continue
    if (kind === 'substation') {
      for (const [glat, glon] of geomPoints(f.geometry)) {
        const d = metersBetween(lat, lon, glat, glon)
        if (d < subBest) subBest = d
      }
    } else {
      // line: point-to-segment over the polyline
      const pts = geomPoints(f.geometry)
      for (let i = 1; i < pts.length; i++) {
        const d = pointToSegmentM(lat, lon, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
        if (d < lineBest) lineBest = d
      }
    }
  }

  const hasSub = Number.isFinite(subBest)
  const hasLine = Number.isFinite(lineBest)
  if (!hasSub && !hasLine) return { distM: null, via: null, score: null }

  // Substation wins unless a line is meaningfully closer (×1.2 bias toward subs).
  let via: 'substation' | 'line'
  let distM: number
  if (hasSub && (!hasLine || subBest <= lineBest * 1.2)) { via = 'substation'; distM = subBest }
  else { via = 'line'; distM = lineBest }

  return { distM: Math.round(distM), via, score: distToScore(distM) }
}
