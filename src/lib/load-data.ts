import type { Property, Region } from '../types'
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

  return buildings.map((b) => ({
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
