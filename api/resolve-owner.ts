/**
 * /api/resolve-owner — Reverse-geocode a rooftop lat/lng via OSM Nominatim.
 *
 * POST { lat: number, lng: number }
 * → { address: string, raw?: {...} }
 * → { error: string }  (never throws; always returns a JSON response)
 *
 * Nominatim usage policy compliance:
 *   - Single on-demand lookup only (NOT batch / cron / background).
 *   - Proper User-Agent header identifying the application and contact email.
 *   - Accept-Language set to prefer Thai + English results.
 *   - Timeout: 8 s hard limit to avoid hanging edge function slots.
 *   - No result caching at this layer (Vercel edge CDN caches per route config).
 *
 * Reference: https://operations.osmfoundation.org/policies/nominatim/
 */
export const config = { runtime: 'edge' }

interface ResolveOwnerBody {
  lat?: unknown
  lng?: unknown
}

interface NominatimResponse {
  display_name?: string
  address?: Record<string, string>
  error?: string
  [key: string]: unknown
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse'

// Identify the app + contact so Nominatim can reach us if there's an abuse concern.
const USER_AGENT = 'solar-intelligence/1.0 (k@kanielt.com)'

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // Allow cross-origin calls from the SPA (same Vercel project).
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS pre-flight.
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // Parse and validate body.
  let body: ResolveOwnerBody
  try {
    body = (await req.json()) as ResolveOwnerBody
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const lat = typeof body.lat === 'string' ? parseFloat(body.lat) : body.lat
  const lng = typeof body.lng === 'string' ? parseFloat(body.lng) : body.lng

  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
    return jsonResponse({ error: 'lat and lng must be finite numbers' }, 400)
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return jsonResponse({ error: 'lat/lng out of valid range' }, 400)
  }

  // Build Nominatim reverse-geocode URL.
  const url = new URL(NOMINATIM_BASE)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  // Prefer Thai first, fall back to English — useful for Ko Phangan addresses.
  url.searchParams.set('accept-language', 'th,en')
  // Include the full address breakdown in the response.
  url.searchParams.set('addressdetails', '1')

  // Nominatim policy: include a valid User-Agent and an email contact.
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), 8000)

  let nominatimData: NominatimResponse
  try {
    const nominatimRes = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'th,en',
        Accept: 'application/json',
      },
      signal: abortController.signal,
    })
    clearTimeout(timeout)

    if (!nominatimRes.ok) {
      return jsonResponse(
        { error: `Nominatim returned HTTP ${nominatimRes.status}` },
        502,
      )
    }

    nominatimData = (await nominatimRes.json()) as NominatimResponse
  } catch (err: unknown) {
    clearTimeout(timeout)
    const message = err instanceof Error ? err.message : 'Unknown fetch error'
    const isTimeout = message.includes('abort') || message.includes('signal')
    return jsonResponse(
      { error: isTimeout ? 'Nominatim request timed out (8 s)' : `Nominatim fetch failed: ${message}` },
      502,
    )
  }

  // Nominatim returns `{ "error": "Unable to geocode" }` for ocean / no-result.
  if (nominatimData.error) {
    return jsonResponse({ error: `Nominatim: ${nominatimData.error}` }, 404)
  }

  const address = nominatimData.display_name ?? ''

  return jsonResponse({
    address,
    // Return the raw breakdown so the frontend can pull specific fields
    // (road, suburb, city, etc.) without re-parsing the display_name.
    raw: nominatimData,
  })
}
