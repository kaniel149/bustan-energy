/**
 * Bustan CRM / Solar Intelligence read layer.
 *
 * Fetches the seeded lead data from the dedicated `bustan` schema
 * (project ygoiaabzkuvdsyyduvhv) and maps it into:
 *   - `BustanLead` — property + owner_decision + crm_pipeline + derived CRM layer
 *   - `Property`   — the SPA's map/domain model (for SolarMap / the store)
 *
 * Derivations (reachability, lead_score, next_action, priority/kWp fallbacks)
 * are recomputed at read time via the ported owner-decision layer. Stored
 * crm_pipeline values (stage, priority, estimated_kwp…) take precedence; only
 * missing values are derived.
 *
 * Pure mapping functions (`buildOwnerLayer`, `toPropertyInput`, `mapLeadToProperty`,
 * `rowsToLeads`) are exported separately from the network fetch so they can be
 * unit-tested against real-data fixtures with no I/O.
 */
import { STANDARD_PANEL_WATT } from './constants'
import { bustanSupabase } from './bustan-supabase'
import {
  normalizeCrmLayer,
  getOwnerDecisionDisplay,
  NEEDS_RESEARCH,
  type CrmLayer,
  type OwnerDecisionDisplay,
  type PropertyInput,
} from './owner-decision-layer'
import { regionFromLead } from './region-utils'
import type { Property, ScanRequest, RoofPriority } from '../types'

export interface BustanPropertyRow {
  id: string
  name: string | null
  area_name: string | null
  property_type: string | null
  roof_area_sqm: number | null
  solar_potential_score: number | null
  existing_solar: boolean | null
  map_x: number | null
  map_y: number | null
  lat: number | null
  lon: number | null
  roof_geom: GeoJSON.Polygon | GeoJSON.MultiPolygon | null
  // Populated by bustan-migrations/005_roof_meta.sql (optional until migration runs)
  roof_orientation?: string | null
  roof_tilt_deg?: number | null
  roof_shading?: string | null
  roof_usable_area_sqm?: number | null
  roof_analysis_confidence?: number | null
  roof_analysis_json?: Record<string, unknown> | null
}

export interface BustanOwnerRow {
  property_id: string
  legal_owner_name: string | null
  decision_maker_name: string | null
  research_status: string | null
  source_url: string | null
  data: Record<string, unknown> | null
}

export interface BustanPipelineRow {
  property_id: string
  stage: string | null
  priority: string | null
  estimated_kwp: number | null
  estimated_annual_thb: number | null
  next_action: string | null
  assigned_to: string | null
  last_verified_at: string | null
  source_confidence: string | null
}

export interface BustanLead {
  property: BustanPropertyRow
  owner: BustanOwnerRow | null
  pipeline: BustanPipelineRow | null
  /** Full owner-decision layer (top-level columns merged over the data jsonb). */
  ownerLayer: Record<string, unknown>
  /** Recomputed CRM layer (reachability, lead_score, priority, kWp, next_action…). */
  crm: CrmLayer
  /** Display-ready owner/decision-maker strings. */
  display: OwnerDecisionDisplay
}

const num = (v: unknown): number | undefined => {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}
const str = (v: unknown): string | undefined => {
  const s = v == null ? '' : String(v).trim()
  return s || undefined
}

/** Merge owner_decision top-level columns over the `data` jsonb into one layer. */
export function buildOwnerLayer(owner: BustanOwnerRow | null | undefined): Record<string, unknown> {
  const data = (owner?.data ?? {}) as Record<string, unknown>
  return {
    ...data,
    legalOwnerName: owner?.legal_owner_name ?? data.legalOwnerName ?? '',
    decisionMakerName: owner?.decision_maker_name ?? data.decisionMakerName ?? '',
    researchStatus: owner?.research_status ?? data.researchStatus ?? '',
    sourceUrl: owner?.source_url ?? data.sourceUrl ?? '',
  }
}

/** Shape a joined row set into the `PropertyInput` expected by the CRM logic. */
export function toPropertyInput(
  property: BustanPropertyRow,
  owner: BustanOwnerRow | null,
  pipeline: BustanPipelineRow | null,
): PropertyInput {
  const ownerLayer = buildOwnerLayer(owner)
  const crm: Record<string, unknown> = pipeline
    ? {
        stage: pipeline.stage,
        priority: pipeline.priority,
        estimated_kWp: pipeline.estimated_kwp,
        estimated_annual_thb: pipeline.estimated_annual_thb,
        next_action: pipeline.next_action,
        assigned_to: pipeline.assigned_to,
        last_verified_at: pipeline.last_verified_at,
        source_confidence: pipeline.source_confidence,
      }
    : {}
  return {
    id: property.id,
    name: property.name ?? '',
    areaName: property.area_name ?? '',
    propertyType: property.property_type ?? '',
    roofAreaSqm: property.roof_area_sqm ?? 0,
    solarPotentialScore: property.solar_potential_score ?? 0,
    existingSolar: Boolean(property.existing_solar),
    ownerDecision: ownerLayer,
    crm,
  }
}

/** Join + map raw rows into enriched leads (pure — used by fetch and by tests). */
export function rowsToLeads(
  properties: BustanPropertyRow[],
  owners: BustanOwnerRow[],
  pipelines: BustanPipelineRow[],
): BustanLead[] {
  const ownerBy = new Map(owners.map((o) => [o.property_id, o]))
  const pipeBy = new Map(pipelines.map((p) => [p.property_id, p]))
  return properties.map((property) => {
    const owner = ownerBy.get(property.id) ?? null
    const pipeline = pipeBy.get(property.id) ?? null
    const input = toPropertyInput(property, owner, pipeline)
    return {
      property,
      owner,
      pipeline,
      ownerLayer: input.ownerDecision as Record<string, unknown>,
      crm: normalizeCrmLayer(input),
      display: getOwnerDecisionDisplay(input.ownerDecision as Record<string, unknown>),
    }
  })
}

/** Map an enriched lead into the SPA `Property` type for the map / store. */
export function mapLeadToProperty(lead: BustanLead): Property {
  const p = lead.property
  const data = (lead.owner?.data ?? {}) as Record<string, unknown>
  const priority = (['A', 'B', 'C'] as const).includes(lead.crm.priority as 'A' | 'B' | 'C')
    ? (lead.crm.priority as 'A' | 'B' | 'C')
    : undefined
  return {
    id: p.id,
    type: 'roof',
    status: 'private',
    region: regionFromLead({ areaName: p.area_name }, num(p.lat) ?? 0, num(p.lon) ?? undefined),
    title: p.name ?? p.id,
    location: p.area_name ?? '',
    lat: num(p.lat) ?? 0,
    lng: num(p.lon) ?? 0,
    area: num(p.roof_area_sqm),
    roofGeom: p.roof_geom ?? undefined,
    capacityKwp: lead.crm.estimated_kWp || undefined,
    panelCount: lead.crm.estimated_kWp != null
      ? Math.round(lead.crm.estimated_kWp * 1000 / STANDARD_PANEL_WATT)
      : undefined,
    solarScore: num(p.solar_potential_score),
    existingSolar: Boolean(p.existing_solar),
    priority,
    category: p.property_type ?? undefined,
    ownerName: lead.display.legalOwner !== NEEDS_RESEARCH ? lead.display.legalOwner : undefined,
    phone: str(data.decisionMakerPhone),
    website: str(data.companyWebsite),
    email: str(data.decisionMakerEmail),
    // Roof-analysis metadata (populated once 005_roof_meta migration runs; safe
    // to read before that — columns are undefined / null until the migration runs).
    roofOrientation: str(p.roof_orientation) ?? undefined,
    roofTiltDeg: num(p.roof_tilt_deg) ?? undefined,
    roofShading: str(p.roof_shading) ?? undefined,
    roofUsableAreaSqm: num(p.roof_usable_area_sqm) ?? undefined,
    roofAnalysisConfidence: num(p.roof_analysis_confidence) ?? undefined,
  }
}

/**
 * Fetch all Bustan leads from the dedicated `bustan` schema. RLS-gated:
 * returns [] when not authenticated or the client is unconfigured.
 */
export async function fetchBustanLeads(): Promise<BustanLead[]> {
  if (!bustanSupabase) return []
  const [propsRes, ownersRes, pipeRes] = await Promise.all([
    bustanSupabase.from('properties').select('*'),
    bustanSupabase.from('owner_decision').select('*'),
    bustanSupabase.from('crm_pipeline').select('*'),
  ])
  if (propsRes.error) throw propsRes.error
  if (ownersRes.error) throw ownersRes.error
  if (pipeRes.error) throw pipeRes.error
  return rowsToLeads(
    (propsRes.data ?? []) as BustanPropertyRow[],
    (ownersRes.data ?? []) as BustanOwnerRow[],
    (pipeRes.data ?? []) as BustanPipelineRow[],
  )
}

/** Convenience: fetch leads already mapped to SPA `Property[]` for the map/store. */
export async function fetchBustanProperties(): Promise<Property[]> {
  const leads = await fetchBustanLeads()
  return leads.map(mapLeadToProperty).filter((prop) => {
    const validLat = Number.isFinite(prop.lat) && !(prop.lat === 0 && prop.lng === 0)
    const validLng = Number.isFinite(prop.lng)
    if (!validLat || !validLng) {
      console.warn(`[bustan] dropped property ${prop.id} with invalid coords (${prop.lat}, ${prop.lng})`)
      return false
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Writes — update crm_pipeline. The `trg_log_crm_change` trigger writes an
// activity_log row (actor = auth.uid()) automatically on every change, so the
// client never writes the audit trail itself. RLS enforces who may write.
// ---------------------------------------------------------------------------

export interface WriteResult {
  ok: boolean
  error?: string
}

const NOT_CONNECTED: WriteResult = { ok: false, error: 'Not connected to the Bustan database' }

/** Fields a user may edit on a lead's pipeline row. */
export interface CrmPipelinePatch {
  stage?: string
  priority?: string
  next_action?: string
  assigned_to?: string | null
  estimated_kwp?: number
  estimated_annual_thb?: number
  source_confidence?: string
}

/**
 * Apply a patch to a lead's crm_pipeline row. Uses upsert on property_id so
 * that a missing pipeline row is created rather than silently dropped (a plain
 * UPDATE matching 0 rows returns ok:true with no data written).
 */
export async function updateLeadPipeline(
  propertyId: string,
  patch: CrmPipelinePatch,
): Promise<WriteResult> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { error } = await bustanSupabase
    .from('crm_pipeline')
    .upsert({ property_id: propertyId, ...patch }, { onConflict: 'property_id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Move a lead to a new pipeline stage (logs a stage_change activity row). */
export function updateLeadStage(propertyId: string, stage: string): Promise<WriteResult> {
  return updateLeadPipeline(propertyId, { stage })
}

/** Reassign a lead's owner (assigned_to). Pass null to unassign. */
export function assignLead(propertyId: string, assignedTo: string | null): Promise<WriteResult> {
  return updateLeadPipeline(propertyId, { assigned_to: assignedTo })
}

// ---------------------------------------------------------------------------
// Roof analysis (P4) — types imported inline to avoid a circular dep on the
// api/ folder. Mirrors RoofAnalysis from api/admin-analyze-roof.ts.
// ---------------------------------------------------------------------------

export interface RoofAnalysisInput {
  orientation: string
  tilt_deg_estimate: number
  shading: string
  usable_area_m2: number
  confidence: number
  /** Whether solar panels are already visibly installed on the roof (from Gemini).
   *  Persisted to bustan.properties.existing_solar via 006_existing_solar migration.
   *  Optional for backward compatibility — defaults to null (no-op on the column). */
  has_existing_solar?: boolean
  // The full analysis blob is stored as-is in roof_analysis_json; callers may
  // pass a richer object (e.g. RoofAnalysisResult) — extra fields are preserved.
}

/**
 * Persist the last Gemini roof-analysis result to bustan.properties via the
 * role-checked SECURITY DEFINER RPC `bustan.save_roof_meta`.
 *
 * Requires bustan-migrations/005_roof_meta.sql to be applied to project
 * ygoiaabzkuvdsyyduvhv. Returns { ok: false } if the migration has not run yet
 * (the RPC will not exist; the error is surfaced to the caller for logging only).
 *
 * NOTE: kWp / financial logic (owner-decision-layer.ts) is NOT touched here.
 * The stored values are for reference; reconciliation is explicitly deferred.
 */
export async function saveRoofMeta(
  propertyId: string,
  analysis: RoofAnalysisInput,
): Promise<WriteResult> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { error } = await bustanSupabase.rpc('save_roof_meta', {
    p_id: propertyId,
    p_orientation: analysis.orientation ?? null,
    p_tilt: analysis.tilt_deg_estimate ?? null,
    p_shading: analysis.shading ?? null,
    p_usable: analysis.usable_area_m2 ?? null,
    p_confidence: analysis.confidence ?? null,
    p_json: analysis as unknown as Record<string, unknown>,
    p_existing_solar: analysis.has_existing_solar ?? null,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Persist a drawn/edited roof footprint. Writes roof_geom + recomputed
 * roof_area_sqm (m²) + crm_pipeline.estimated_kwp via the role-checked
 * SECURITY DEFINER RPC `bustan.save_roof_geom` (admin/sales/engineer only;
 * RLS/role errors are returned, never swallowed). See bustan-migrations/002.
 */
export async function updateRoofGeom(
  propertyId: string,
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  areaSqm: number,
  estimatedKwp: number,
): Promise<WriteResult> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { error } = await bustanSupabase.rpc('save_roof_geom', {
    p_id: propertyId,
    p_geom: geom as unknown as Record<string, unknown>,
    p_area: areaSqm,
    p_kwp: estimatedKwp,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Confirm an offline-detected roof candidate → insert a new lead (property +
 * 'new' pipeline row + pending owner_decision) via the role-checked
 * SECURITY DEFINER RPC `bustan.insert_detected_roof` (admin/sales/engineer).
 * Idempotent on the candidate id. See bustan-migrations/003.
 */
export async function confirmDetectedRoof(c: Property): Promise<WriteResult & { id?: string }> {
  if (!bustanSupabase) return NOT_CONNECTED
  const payload = {
    id: c.id,
    title: c.title,
    location: c.location,
    category: c.category,
    area: c.area,
    solarScore: c.solarScore,
    lat: c.lat,
    lng: c.lng,
    capacityKwp: c.capacityKwp,
    priority: c.priority,
    roofGeom: c.roofGeom ?? null,
  }
  const { data, error } = await bustanSupabase.rpc('insert_detected_roof', {
    p: payload as unknown as Record<string, unknown>,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: typeof data === 'string' ? data : c.id }
}

// --- Scan candidates (P4 review layer) -------------------------------------

/**
 * Raw scan_candidate row as returned by PostgREST (after 010_land_scan migration).
 * Includes both roof-specific and land-specific columns; unused columns are null.
 */
export interface ScanCandidate {
  id: string
  scan_request_id: string | null
  name: string | null
  area_name: string | null
  property_type: string | null
  lat: number | null
  lon: number | null
  // Roof columns
  roof_geom: GeoJSON.Polygon | null
  roof_area_sqm: number | null
  solar_potential_score: number | null
  estimated_kwp: number | null
  priority: string | null
  status: 'pending' | 'added' | 'rejected'
  created_at: string | null
  // Added in 010_land_scan
  kind: 'roof' | 'land'
  land_area_m2: number | null
  area_rai: number | null
  estimated_mwp: number | null
  tier: 'commercial' | 'farm' | 'utility' | null
  landuse: string | null
  land_geom: GeoJSON.Polygon | null
  // Added by cron (backend agent) — existing PV detection
  existing_solar: boolean | null
  solar_check_confidence: number | null
  solar_checked_at: string | null
}

/**
 * Fetch all pending scan candidates. Maps each row to a `Property` so the
 * existing roofCandidates review layer (SolarMap store) can render and
 * interact with them without any new types.
 *
 * Mapping notes:
 *   type derived from kind ('roof' | 'land').
 *   id   = candidate UUID (used by setScanCandidateStatus / confirmDetectedRoof).
 *   title / location from name / area_name.
 *   area / capacityKwp / solarScore / priority / category / roofGeom from candidate columns.
 *   Land candidates: sizeM2 / sizeRai / capacityKwp (from estimated_mwp×1000) also populated.
 *   lng maps from the column `lon` (PostgREST returns the column name as-is).
 */
/**
 * Location of the highest-kWp pending roof candidate (globally). Used to
 * auto-land the user on a region that actually has scanned work when their home
 * region is empty. Returns null if nothing pending.
 */
export async function fetchTopPendingCandidateLocation(): Promise<{ lat: number; lon: number } | null> {
  if (!bustanSupabase) return null
  const { data, error } = await bustanSupabase
    .from('scan_candidates')
    .select('lat,lon')
    .eq('status', 'pending')
    .eq('kind', 'roof')
    .order('estimated_kwp', { ascending: false, nullsFirst: false })
    .limit(1)
  if (error) return null
  const row = (data ?? [])[0] as { lat: number | null; lon: number | null } | undefined
  if (!row || row.lat == null || row.lon == null) return null
  return { lat: Number(row.lat), lon: Number(row.lon) }
}

/**
 * Fetch pending scan candidates. With 14k+ pending across regions, PostgREST's
 * 1000-row default would silently truncate — so pass the active region's
 * `bounds` ([[minLng,minLat],[maxLng,maxLat]]) to scope the query to that region
 * and raise the cap to 5000. Without bounds it loads up to 5000 (legacy behaviour).
 */
export async function fetchScanCandidates(
  bounds?: [[number, number], [number, number]],
): Promise<Property[]> {
  if (!bustanSupabase) return []
  let q = bustanSupabase
    .from('scan_candidates')
    .select('*')
    .eq('status', 'pending')
  if (bounds) {
    const [[minLng, minLat], [maxLng, maxLat]] = bounds
    q = q.gte('lat', minLat).lte('lat', maxLat).gte('lon', minLng).lte('lon', maxLng)
  }
  // Highest-value first so the 5000 cap (if hit in a dense region) keeps the
  // biggest roofs rather than an arbitrary slice.
  const { data, error } = await q.order('estimated_kwp', { ascending: false, nullsFirst: false }).limit(5000)
  if (error) throw error
  const seen = new Set<string>()
  const candidates: Property[] = []

  for (const row of (data ?? []) as ScanCandidate[]) {
    const lat = num(row.lat) ?? 0
    const lng = num(row.lon) ?? 0

    // Guard: drop candidates with non-finite or [0,0] coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      console.warn(`[scan] dropped candidate ${row.id} with invalid coords (${lat}, ${lng})`)
      continue
    }

    // Proximity dedup: quantize to ~1e-4 (~11m) for roofs, ~1e-3 (~111m) for land
    const dedupPrecision = row.kind === 'land' ? 1e3 : 1e4
    const dedupKey = `${Math.round(lat * dedupPrecision)},${Math.round(lng * dedupPrecision)}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)

    const capacityKwp = row.kind === 'land' && row.estimated_mwp != null
      ? num(row.estimated_mwp * 1000)   // MWp → kWp for the common capacity field
      : num(row.estimated_kwp)

    candidates.push({
      id: row.id,
      type: (row.kind === 'land' ? 'land' : 'roof') as 'roof' | 'land',
      status: 'private' as const,
      region: regionFromLead({ areaName: row.area_name }, lat, lng),
      title: row.name ?? row.id,
      location: row.area_name ?? '',
      lat,
      lng,
      // Roof-specific
      area: row.kind === 'roof' ? num(row.roof_area_sqm) : undefined,
      capacityKwp,
      panelCount: capacityKwp != null ? Math.round(capacityKwp * 1000 / STANDARD_PANEL_WATT) : undefined,
      solarScore: num(row.solar_potential_score),
      priority: (['A', 'B', 'C', 'D'] as const).includes(row.priority as 'A' | 'B' | 'C' | 'D')
        ? (row.priority as 'A' | 'B' | 'C' | 'D')
        : undefined,
      // category: landuse string for land, property_type for roof
      category: row.kind === 'land' ? (row.landuse ?? row.property_type ?? undefined) : (row.property_type ?? undefined),
      // Reuse roofGeom to carry land_geom for land candidates — the existing
      // cand-fill / cand-outline map layers read roofGeom via buildRoofFeature,
      // so land polygons render without any new map layer code.
      roofGeom: row.kind === 'land'
        ? (row.land_geom ?? undefined)
        : (row.roof_geom ?? undefined),
      // Land-specific (mapped to Property.sizeM2 / sizeRai / tier fields)
      sizeM2: row.kind === 'land' ? (num(row.land_area_m2) ?? undefined) : undefined,
      sizeRai: row.kind === 'land' ? (num(row.area_rai) ?? undefined) : undefined,
      tier: row.kind === 'land' ? (row.tier ?? undefined) : undefined,
      // Existing PV detection (backend cron populates these; null = not checked yet)
      existingSolar: row.existing_solar === true ? true : row.existing_solar === false ? false : undefined,
      roofAnalysisConfidence: num(row.solar_check_confidence) ?? undefined,
      solarCheckedAt: row.solar_checked_at ?? undefined,
    })
  }

  return candidates
}

/**
 * Update a scan candidate's status to 'added' or 'rejected' via the
 * SECURITY DEFINER RPC `bustan.set_scan_candidate_status` (role-gated:
 * admin/sales/engineer). Call this BEFORE confirmDetectedRoof when promoting
 * a candidate to a lead so the candidate row reflects the decision.
 */
export async function setScanCandidateStatus(
  id: string,
  status: 'added' | 'rejected',
): Promise<WriteResult> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { error } = await bustanSupabase.rpc('set_scan_candidate_status', {
    p_id: id,
    p_status: status,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Reasons an operator can give when rejecting a roof candidate. */
export type RejectionReason = 'has_pv' | 'not_a_roof' | 'too_small' | 'other'

/**
 * Reject a candidate WITH a reason (global learning). Spatial reasons
 * (not_a_roof / too_small / other) seed a global `scan_exclusions` row so the
 * scan worker never re-surfaces that spot for any scanner. 'has_pv' relies on
 * the existing existing_solar detection instead. RPC: bustan.reject_scan_candidate.
 */
export async function rejectScanCandidate(
  id: string,
  reason: RejectionReason,
): Promise<WriteResult> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { error } = await bustanSupabase.rpc('reject_scan_candidate', {
    p_id: id,
    p_reason: reason,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Re-apply learned lessons to the CURRENT pending list: bulk-rejects pending
 * roof candidates that (a) have existing PV, or (b) sit within ~30 m of a
 * location you previously rejected. RPC: bustan.apply_learned_filters → count.
 */
export async function applyLearnedFilters(): Promise<WriteResult & { removed?: number }> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { data, error } = await bustanSupabase.rpc('apply_learned_filters')
  if (error) return { ok: false, error: error.message }
  return { ok: true, removed: typeof data === 'number' ? data : 0 }
}

/**
 * Correct a ROOF candidate's area during review (the detected footprint is
 * sometimes wrong). The SECURITY DEFINER RPC `bustan.update_scan_candidate_area`
 * (role-gated admin/sales/engineer) writes roof_area_sqm and recomputes
 * estimated_kwp + priority with the scan worker's formula, returning the new
 * values so the UI can update without a refetch.
 */
export async function updateScanCandidateArea(
  id: string,
  areaSqm: number,
): Promise<WriteResult & { areaSqm?: number; kwp?: number; priority?: RoofPriority }> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { data, error } = await bustanSupabase.rpc('update_scan_candidate_area', {
    p_id: id,
    p_area_sqm: areaSqm,
  })
  if (error) return { ok: false, error: error.message }
  // RPC returns a single-row table: [{ id, roof_area_sqm, estimated_kwp, priority }]
  const row = Array.isArray(data) ? data[0] : data
  const prio = typeof row?.priority === 'string' ? row.priority : undefined
  return {
    ok: true,
    areaSqm: row?.roof_area_sqm != null ? Number(row.roof_area_sqm) : areaSqm,
    kwp: row?.estimated_kwp != null ? Number(row.estimated_kwp) : undefined,
    priority: (['A', 'B', 'C', 'D'] as const).includes(prio as RoofPriority)
      ? (prio as RoofPriority)
      : undefined,
  }
}

// --- On-demand scan engine (P4) --------------------------------------------

export interface ScanFilters {
  propertyType?: string
  minRoofM2?: number
  commercialOnly?: boolean
}

export type ScanType = 'roof' | 'land'

/**
 * Queue an on-demand area scan (role-checked admin/sales/engineer via the
 * create_scan_request RPC). A worker picks up the 'queued' row, acquires
 * buildings (roof) or landuse polygons (land), scores/dedups, and inserts
 * scan_candidates for operator review.
 *
 * @param scanType - 'roof' (default) queries OSM buildings; 'land' queries
 *   OSM landuse polygons for ground-mount farm/utility sizing.
 */
export async function createScanRequest(
  area: GeoJSON.Polygon,
  bbox: number[],
  filters: ScanFilters = {},
  scanType: ScanType = 'roof',
): Promise<WriteResult & { id?: string }> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { data, error } = await bustanSupabase.rpc('create_scan_request', {
    p_area: area as unknown as Record<string, unknown>,
    p_bbox: bbox,
    p_filters: filters as unknown as Record<string, unknown>,
    p_scan_type: scanType,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: typeof data === 'string' ? data : undefined }
}

/** Recent scan requests (newest first) for the status panel. */
export async function fetchScanRequests(): Promise<ScanRequest[]> {
  if (!bustanSupabase) return []
  const { data, error } = await bustanSupabase
    .from('scan_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as ScanRequest[]
}

// --- Site survey (engineer/admin) -----------------------------------------

export interface SiteSurvey {
  property_id: string
  roof_photos: boolean
  pea_bill: boolean
  battery_space: boolean
  shading: string
  access: string
  main_board: string
  notes: string
  recommendation: 'go' | 'maybe' | 'no-go' | ''
}

export async function fetchSurvey(propertyId: string): Promise<SiteSurvey | null> {
  if (!bustanSupabase) return null
  const { data, error } = await bustanSupabase
    .from('site_surveys')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()
  if (error || !data) return null
  return data as SiteSurvey
}

export async function upsertSurvey(survey: SiteSurvey): Promise<WriteResult> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { error } = await bustanSupabase.from('site_surveys').upsert(survey, { onConflict: 'property_id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// --- O&M monitoring (engineer/admin, stage=won) ---------------------------

export interface OmSite {
  property_id: string
  commissioned_at: string | null
  monitoring_status: 'online' | 'offline' | 'alert' | ''
  last_reading_kwh: number | null
  performance_ratio: number | null
  next_maintenance: string | null
  notes: string
}

export async function fetchOmSite(propertyId: string): Promise<OmSite | null> {
  if (!bustanSupabase) return null
  const { data, error } = await bustanSupabase
    .from('om_sites')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()
  if (error || !data) return null
  return data as OmSite
}

export async function upsertOmSite(site: OmSite): Promise<WriteResult> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { error } = await bustanSupabase.from('om_sites').upsert(site, { onConflict: 'property_id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// --- Activity log (read-only audit trail) ---------------------------------

export interface ActivityRow {
  id: number
  property_id: string
  actor: string | null
  action: string
  field: string | null
  old_value: string | null
  new_value: string | null
  at: string
}

// --- Owner-decision writes ---------------------------------------------------

/**
 * Patch the owner_decision row for a property.
 *
 * Only the fields passed in the patch are written; unspecified fields are
 * untouched (Supabase upsert with onConflict='property_id').
 *
 * Used by the owner-research accelerator to stamp `research_status` and
 * `source_url` when a rep starts manual registry research. Owner NAME fields
 * (legal_owner_name, decision_maker_name) stay editable by the rep directly
 * in the CRM; this function does not touch them unless explicitly passed.
 */
export interface OwnerDecisionPatch {
  research_status?: string
  source_url?: string
  legal_owner_name?: string
  decision_maker_name?: string
  data?: Record<string, unknown>
}

export async function updateOwnerDecision(
  propertyId: string,
  patch: OwnerDecisionPatch,
): Promise<WriteResult> {
  if (!bustanSupabase) return NOT_CONNECTED
  const { error } = await bustanSupabase
    .from('owner_decision')
    .upsert({ property_id: propertyId, ...patch }, { onConflict: 'property_id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Most recent activity_log entries (append-only, written by the DB trigger). */
export async function fetchActivityLog(limit = 50): Promise<ActivityRow[]> {
  if (!bustanSupabase) return []
  const { data, error } = await bustanSupabase
    .from('activity_log')
    .select('*')
    .order('at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as ActivityRow[]
}
