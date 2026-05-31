// Google Places API enrichment for building owner data
// All Google API calls are proxied through /api/enrich-place (server-side).
// No Google key is present in the client bundle.

export interface EnrichmentResult {
  name?: string
  phone?: string
  website?: string
  category?: string
  rating?: number
  address?: string
  placeId?: string
  types?: string[]
}

const TYPE_TO_CATEGORY: Record<string, string> = {
  lodging: 'hospitality',
  hotel: 'hospitality',
  resort: 'hospitality',
  restaurant: 'restaurant',
  cafe: 'restaurant',
  bar: 'restaurant',
  store: 'retail',
  shopping_mall: 'retail',
  supermarket: 'retail',
  school: 'education',
  university: 'education',
  hospital: 'health',
  doctor: 'health',
  pharmacy: 'health',
  place_of_worship: 'temple',
  local_government_office: 'government',
  gym: 'commercial',
  bank: 'commercial',
  gas_station: 'commercial',
  car_repair: 'industrial',
  factory: 'industrial',
}

function classifyCategory(types: string[]): string {
  for (const t of types) {
    if (TYPE_TO_CATEGORY[t]) return TYPE_TO_CATEGORY[t]
  }
  if (types.includes('point_of_interest') || types.includes('establishment')) return 'commercial'
  return 'residential'
}

// Nearby Search — proxied server-side via /api/enrich-place?action=contact
export async function enrichFromPlaces(lat: number, lng: number): Promise<EnrichmentResult | null> {
  try {
    const res = await fetch(
      `/api/enrich-place?action=contact&lat=${lat}&lng=${lng}`
    )
    if (!res.ok) return null

    const data = await res.json() as {
      available: boolean
      name?: string
      phone?: string
      website?: string
      types?: string[]
    }

    if (!data.available) return null

    return {
      name: data.name,
      phone: data.phone,
      website: data.website,
      category: data.types ? classifyCategory(data.types) : undefined,
    }
  } catch (err) {
    console.error('Places enrichment failed:', err)
    return null
  }
}

// Batch enrichment using existing OpenStreetMap/Overture data (no API key needed)
export function enrichFromOSM(tags: Record<string, string>): Partial<EnrichmentResult> {
  return {
    name: tags.name || tags['name:en'] || tags['name:th'],
    phone: tags.phone || tags['contact:phone'],
    website: tags.website || tags['contact:website'],
    category: tags.tourism === 'hotel' ? 'hospitality'
      : tags.amenity === 'restaurant' ? 'restaurant'
      : tags.shop ? 'retail'
      : tags.amenity === 'school' ? 'education'
      : tags.amenity === 'hospital' ? 'health'
      : undefined,
  }
}

// Returns a RELATIVE proxy URL for the satellite image.
// Safe to use as <img src> — the server fetches Google / falls back to OSM tile.
// When used in a server-side context (e.g. admin-overlay-panels fetching the URL),
// the caller MUST make this absolute using window.location.origin before passing
// to the server.  See NewProposalPage.generateRoofPreview for the pattern.
export function getSatelliteImageUrl(lat: number, lng: number, zoom = 19, size = '600x400'): string {
  return `/api/enrich-place?action=satellite&lat=${lat}&lng=${lng}&zoom=${zoom}&size=${size}`
}

// Always true — the server decides whether a key is configured and returns
// { available: false } gracefully when it is not.
export function isEnrichmentAvailable(): boolean {
  return true
}
