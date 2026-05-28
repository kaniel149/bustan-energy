import type { LeadResearchMetadata, OwnerDecisionLayer, Property, Region, RoofPriority } from '../types'
import { calculateGridProximity } from './solar-calc'

// All data now served locally from /public/data/

interface BuildingLocal {
  id: string
  type: string
  status: string
  region: string
  title: string
  location: string
  lat: number
  lng: number
  area: number
  usableArea: number
  capacityKwp: number
  panelCount: number
  annualKwh: number
  annualSavings: number
  epcCost: number
  solarScore: number
  priority: string
  category: string
  phone?: string
  website?: string
  email?: string
}

interface OwnerDecisionPropertyLocal {
  id: string
  name: string
  areaName?: string
  propertyType?: string
  roofAreaSqm?: number
  solarPotentialScore?: number
  highValueScore?: number
  leadScore?: number
  existingSolar?: boolean
  leadResearch?: LeadResearchMetadata
  ownerDecision?: OwnerDecisionLayer
}

interface OwnerDecisionPayload {
  properties?: OwnerDecisionPropertyLocal[]
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const firstText = (...values: unknown[]) => values.map(text).find(Boolean) || undefined
const normalizedKey = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, '')
const ownerDataUrl = '/data/bustan_owner_decision_properties.json'

const priorityRank: Record<RoofPriority, number> = { A: 4, B: 3, C: 2, D: 1 }

function priorityFromScore(score: number): RoofPriority {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  return 'D'
}

function strongerPriority(current?: RoofPriority, incoming?: RoofPriority): RoofPriority | undefined {
  if (!current) return incoming
  if (!incoming) return current
  return priorityRank[incoming] > priorityRank[current] ? incoming : current
}

function categoryFromPropertyType(type = ''): string {
  const clean = type.toLowerCase()
  if (clean.includes('restaurant') || clean.includes('cafe') || clean.includes('bar')) return 'restaurant'
  if (clean.includes('hotel') || clean.includes('lodging') || clean.includes('resort') || clean.includes('hostel')) return 'hospitality'
  if (clean.includes('retail') || clean.includes('shop')) return 'retail'
  if (clean.includes('warehouse') || clean.includes('workshop') || clean.includes('industrial')) return 'industrial'
  return 'commercial'
}

function regionFromLead(property: OwnerDecisionPropertyLocal, lat: number): Region {
  const area = `${property.areaName || ''}`.toLowerCase()
  if (area.includes('samui') || lat < 9.63) return 'koh_samui'
  if (area.includes('surat')) return 'surat_thani'
  return 'koh_phangan'
}

function buildOwnerLead(property: OwnerDecisionPropertyLocal): Property | null {
  const leadResearch = property.leadResearch || {}
  const lat = Number(leadResearch.latitude)
  const lng = Number(leadResearch.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const ownerDecision = property.ownerDecision || {}
  const area = Math.max(120, Number(property.roofAreaSqm) || 420)
  const usableArea = Math.round(area * 0.7)
  const capacityKwp = Math.round((usableArea / 2.6) * 0.55 * 10) / 10
  const panelCount = Math.max(1, Math.round((capacityKwp * 1000) / 550))
  const annualKwh = Math.round(capacityKwp * 1500)
  const annualSavings = Math.round(annualKwh * 5)
  const epcCost = Math.round(capacityKwp * 45000)
  const solarScore = Math.round(Number(property.solarPotentialScore || property.highValueScore || property.leadScore || 0))

  return {
    id: property.id,
    type: 'roof',
    status: 'private',
    region: regionFromLead(property, lat),
    title: property.name || 'Solar Intelligence lead',
    location: property.areaName || 'Koh Phangan',
    lat,
    lng,
    area,
    usableArea,
    capacityKwp,
    panelCount,
    annualKwh,
    annualSavings,
    epcCost,
    solarScore,
    priority: priorityFromScore(solarScore),
    category: categoryFromPropertyType(property.propertyType),
    ownerName: firstText(ownerDecision.legalOwnerName, ownerDecision.decisionMakerName, ownerDecision.tenantName, property.name),
    phone: firstText(ownerDecision.decisionMakerPhone, ownerDecision.operationalContactPhone),
    website: firstText(ownerDecision.companyWebsite),
    email: firstText(ownerDecision.decisionMakerEmail, ownerDecision.operationalContactEmail),
    ownerDecision,
    leadResearch,
    ownerResearchStatus: ownerDecision.researchStatus,
    sourceUrl: ownerDecision.sourceUrl,
  }
}

async function loadOwnerDecisionData(): Promise<Property[]> {
  try {
    const response = await fetch(ownerDataUrl)
    if (response.status === 404) return []
    if (!response.ok) throw new Error(`Owner decision data: ${response.status}`)
    const payload: OwnerDecisionPayload | OwnerDecisionPropertyLocal[] = await response.json()
    const records = Array.isArray(payload) ? payload : payload.properties || []
    return records.map(buildOwnerLead).filter((property): property is Property => Boolean(property))
  } catch (error) {
    console.warn('Owner decision data unavailable:', error)
    return []
  }
}

function mergeOwnerDecisionData(properties: Property[], ownerLeads: Property[]): Property[] {
  if (!ownerLeads.length) return properties

  const ownerByTitle = new Map<string, Property>()
  ownerLeads.forEach((lead) => {
    const key = normalizedKey(lead.title)
    if (key && !ownerByTitle.has(key)) ownerByTitle.set(key, lead)
  })
  const mergedLeadIds = new Set<string>()

  const merged = properties.map((property) => {
    const ownerLead = ownerByTitle.get(normalizedKey(property.title))
    if (!ownerLead) return property
    mergedLeadIds.add(ownerLead.id)

    return {
      ...property,
      ownerName: property.ownerName || ownerLead.ownerName,
      phone: property.phone || ownerLead.phone,
      website: property.website || ownerLead.website,
      email: property.email || ownerLead.email,
      solarScore: Math.max(property.solarScore || 0, ownerLead.solarScore || 0),
      priority: strongerPriority(property.priority, ownerLead.priority),
      category: property.category || ownerLead.category,
      ownerDecision: ownerLead.ownerDecision,
      leadResearch: ownerLead.leadResearch,
      ownerResearchStatus: ownerLead.ownerResearchStatus,
      sourceUrl: ownerLead.sourceUrl,
    }
  })

  return [...merged, ...ownerLeads.filter((lead) => !mergedLeadIds.has(lead.id))]
}

export async function loadGridData(): Promise<GeoJSON.FeatureCollection> {
  const response = await fetch('/data/grid_all.geojson')
  if (!response.ok) throw new Error(`Grid data: ${response.status}`)
  return response.json()
}

export async function loadRoofData(): Promise<Property[]> {
  // Load 21,724 buildings (Overture Maps satellite + existing rich data merged)
  const response = await fetch('/data/buildings_validated.json')
  if (!response.ok) throw new Error(`Roof data: ${response.status}`)
  const buildings: BuildingLocal[] = await response.json()

  const roofs = buildings.map((b) => ({
    id: b.id,
    type: 'roof' as const,
    status: (b.status || 'private') as Property['status'],
    region: (b.region || 'koh_phangan') as Region,
    title: b.title || 'Building',
    location: b.location || (b.region === 'koh_samui' ? 'Koh Samui' : 'Ko Phangan'),
    lat: b.lat,
    lng: b.lng,
    area: b.area,
    usableArea: b.usableArea,
    capacityKwp: b.capacityKwp,
    panelCount: b.panelCount,
    annualKwh: b.annualKwh,
    annualSavings: b.annualSavings,
    epcCost: b.epcCost,
    solarScore: b.solarScore,
    priority: b.priority as Property['priority'],
    category: b.category,
    phone: b.phone || undefined,
    website: b.website || undefined,
    email: b.email || undefined,
  }))

  const ownerLeads = await loadOwnerDecisionData()
  return mergeOwnerDecisionData(roofs, ownerLeads)
}

export async function loadLandData(): Promise<Property[]> {
  const response = await fetch('/data/land_data.geojson')
  if (!response.ok) throw new Error(`Land data: ${response.status}`)
  const geojson: GeoJSON.FeatureCollection = await response.json()

  return geojson.features
    .filter((f) => f.properties?.type === 'land')
    .map((f) => {
      const p = f.properties!
      const coords = getCentroid(f.geometry)
      const sizeStr = (p.size || '').replace(/[^\d.]/g, '')
      const sizeM2 = parseFloat(sizeStr) || undefined
      const priceStr = (p.price || '').replace(/[^\d.,฿\s]/g, '').replace(/,/g, '')
      const price = parseFloat(priceStr) || undefined

      return {
        id: p.id || `land_${Math.random().toString(36).slice(2)}`,
        type: 'land' as const,
        status: 'sale' as const,
        region: (p.location?.toLowerCase().includes('samui') ? 'koh_samui' : 'koh_phangan') as Region,
        title: p.title || 'Land Plot',
        location: p.location || 'Unknown',
        lat: coords[1],
        lng: coords[0],
        sizeM2: sizeM2,
        sizeRai: sizeM2 ? sizeM2 / 1600 : undefined,
        price: price,
        pricePerRai: price && sizeM2 ? price / (sizeM2 / 1600) : undefined,
        listingLink: p.link || undefined,
        ownerName: p.owner || undefined,
        phone: p.phone || undefined,
      }
    })
}

export function enrichWithGridProximity(
  properties: Property[],
  gridData: GeoJSON.FeatureCollection
): Property[] {
  const relevantGrid: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: gridData.features.filter((f) => {
      const ptype = (f.properties as Record<string, string>)?.power_type
      return ['substation', 'line', 'minor_line', 'cable', 'transformer'].includes(ptype)
    }),
  }

  return properties.map((p) => {
    if (p.type === 'land') {
      const proximity = calculateGridProximity(p.lng, p.lat, relevantGrid)
      return { ...p, gridProximity: proximity }
    }
    return p
  })
}

function getCentroid(geometry: GeoJSON.Geometry): [number, number] {
  if (geometry.type === 'Point') {
    return geometry.coordinates as [number, number]
  }
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0]
    const lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length
    const lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length
    return [lng, lat]
  }
  if (geometry.type === 'LineString') {
    const mid = Math.floor(geometry.coordinates.length / 2)
    return geometry.coordinates[mid] as [number, number]
  }
  return [0, 0]
}
