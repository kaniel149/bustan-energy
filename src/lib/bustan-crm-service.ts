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
import { bustanSupabase } from './bustan-supabase'
import {
  normalizeCrmLayer,
  getOwnerDecisionDisplay,
  NEEDS_RESEARCH,
  type CrmLayer,
  type OwnerDecisionDisplay,
  type PropertyInput,
} from './owner-decision-layer'
import type { Property } from '../types'

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
    region: 'koh_phangan',
    title: p.name ?? p.id,
    location: p.area_name ?? '',
    lat: num(p.lat) ?? 0,
    lng: num(p.lon) ?? 0,
    area: num(p.roof_area_sqm),
    capacityKwp: lead.crm.estimated_kWp || undefined,
    solarScore: num(p.solar_potential_score),
    priority,
    category: p.property_type ?? undefined,
    ownerName: lead.display.legalOwner !== NEEDS_RESEARCH ? lead.display.legalOwner : undefined,
    phone: str(data.decisionMakerPhone),
    website: str(data.companyWebsite),
    email: str(data.decisionMakerEmail),
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
  return leads.map(mapLeadToProperty)
}
