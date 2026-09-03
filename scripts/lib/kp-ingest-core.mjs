// Pure transforms for the Aug-2026 Ko Phangan island scan → bustan.scan_candidates rows.
// Inputs live in bustan-index/roof-scanner/ (buildings_data.js, footprint_quality_merged.json,
// solar_detected.json, unmapped_roofs.json). No I/O here — see ../ingest-kp-scan.mjs.
export const DEDUP_DEG = 0.00025 // ~28 m, same as api/cron-process-scans.ts

export function parseBuildingsJs(src) {
  const start = src.indexOf('['); const end = src.lastIndexOf(']')
  return JSON.parse(src.slice(start, end + 1))
}

function priorityFromKwp(kwp) { return kwp >= 100 ? 'A' : kwp >= 30 ? 'B' : kwp >= 10 ? 'C' : 'D' }

export function buildOsmRecords(buildings, footprintQuality, solarDetected) {
  return buildings.map(b => {
    const id = String(b.i)
    const fq = footprintQuality[id]; const sd = solarDetected[id]
    // Same rule as kp-solar-pro.html correctedKwp(): only an adjudicated parcel/compound downgrades.
    const adjudicatedDowngrade = Boolean(fq && fq.src === 'adjudicated' && (fq.k === 'parcel' || fq.k === 'compound'))
    const kwp = adjudicatedDowngrade ? Math.round(b.kw * fq.roof_pct) / 100 : b.kw
    let existing_solar = null, solar_check_confidence = null, panel_coverage_pct = null, solar_checked_at = null
    if (sd && !sd.err) {
      solar_check_confidence = sd.c; panel_coverage_pct = sd.p ?? null; solar_checked_at = new Date().toISOString()
      if (sd.s === true && sd.c >= 0.5) existing_solar = true
      else if (sd.s === false && sd.c >= 0.5) existing_solar = false
    }
    return {
      external_source: 'osm', external_id: id, kind: 'roof', status: 'pending',
      name: b.n || null, category: b.c || null, phone: b.ph || null, website: b.w || null,
      lat: b.la, lon: b.lo, roof_area_sqm: b.a,
      roof_geom: Array.isArray(b.poly) && b.poly.length >= 4 ? { type: 'Polygon', coordinates: [b.poly] } : null,
      estimated_kwp: kwp, estimated_kwp_raw: b.kw,
      priority: adjudicatedDowngrade ? priorityFromKwp(kwp) : (b.pr || priorityFromKwp(kwp)),
      solar_potential_score: b.s ?? null,
      footprint_class: fq?.k ?? null, roof_pct: fq?.roof_pct ?? null, footprint_confidence: fq?.c ?? null,
      existing_solar, solar_check_confidence, panel_coverage_pct, solar_checked_at,
    }
  })
}

export function buildUnmappedRecords(unmapped) {
  return unmapped.map(u => ({
    external_source: 'esri-2026',
    external_id: `${u.tile.join('-')}-${u.lat}-${u.lon}`,
    kind: 'roof', status: 'pending', name: null,
    lat: u.lat, lon: u.lon, roof_area_sqm: u.roof_m2, estimated_kwp: u.kwp, estimated_kwp_raw: u.kwp,
    priority: priorityFromKwp(u.kwp), roof_geom: null, footprint_class: null,
  }))
}

export function matchExisting(rec, existing) {
  const byId = existing.find(e => e.external_id && e.external_id === rec.external_id && e.external_source === rec.external_source)
  if (byId) return byId
  return existing.find(e => e.lat != null && e.lon != null &&
    Math.abs(e.lat - rec.lat) < DEDUP_DEG && Math.abs(e.lon - rec.lon) < DEDUP_DEG) ?? null
}
