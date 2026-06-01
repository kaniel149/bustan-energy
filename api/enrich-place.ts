// ============================================================
// /api/enrich-place
// Server-side proxy for Google Places / Static Maps.
// The GOOGLE_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY) env var
// NEVER leaves this handler — it is never written to any
// response body or log line.
//
// action=contact  GET/POST  lat, lng
//   Performs nearbysearch + place details and returns
//   { available, name?, phone?, website? }.
//   If no key is configured → { available: false }.
//
// action=satellite  GET  lat, lng, zoom?, size?
//   Fetches the Google Static Maps tile bytes server-side and
//   streams them back with correct Content-Type + cache header.
//   If no key is configured → 302 redirect to an OpenStreetMap
//   tile URL so <img src> still renders a map image.
// ============================================================
export const config = { runtime: 'edge' }

const GOOGLE_KEY =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_PLACES_API_KEY ||
  ''

function fallbackSatelliteUrl(lat: string, lng: string, zoom: string): string {
  // OpenStreetMap raster tile at the requested zoom centred on the coordinate.
  // This is a plain map, not satellite, but gives a usable placeholder with no
  // key required.  Clients can use it as an <img> fallback.
  const z = Math.min(Math.max(parseInt(zoom, 10) || 19, 1), 19)
  const latN = parseFloat(lat)
  const lngN = parseFloat(lng)
  // Convert lat/lng to OSM tile x/y
  const n = Math.pow(2, z)
  const xTile = Math.floor(((lngN + 180) / 360) * n)
  const latRad = (latN * Math.PI) / 180
  const yTile = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return `https://tile.openstreetmap.org/${z}/${xTile}/${yTile}.png`
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)

  // Support both GET params and POST JSON body
  let action: string
  let lat: string
  let lng: string
  let zoom: string
  let size: string

  if (req.method === 'POST') {
    let body: Record<string, string> = {}
    try {
      body = (await req.json()) as Record<string, string>
    } catch {
      return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }
    action = body.action || ''
    lat = body.lat || ''
    lng = body.lng || ''
    zoom = body.zoom || '19'
    size = body.size || '600x400'
  } else {
    action = url.searchParams.get('action') || ''
    lat = url.searchParams.get('lat') || ''
    lng = url.searchParams.get('lng') || ''
    zoom = url.searchParams.get('zoom') || '19'
    size = url.searchParams.get('size') || '600x400'
  }

  // ── Input validation ──────────────────────────────────────────────────────
  if (!action || !['contact', 'satellite'].includes(action)) {
    return Response.json({ ok: false, error: 'invalid_action' }, { status: 400 })
  }

  const latN = parseFloat(lat)
  const lngN = parseFloat(lng)
  if (isNaN(latN) || isNaN(lngN) || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
    return Response.json({ ok: false, error: 'invalid_coordinates' }, { status: 400 })
  }

  // Sanitize size param — must match NNNxNNN pattern, max 640x640
  const sizeMatch = /^(\d{1,4})x(\d{1,4})$/.exec(size)
  if (!sizeMatch) {
    return Response.json({ ok: false, error: 'invalid_size' }, { status: 400 })
  }
  const safeSize = `${Math.min(parseInt(sizeMatch[1], 10), 640)}x${Math.min(parseInt(sizeMatch[2], 10), 640)}`

  const safeZoom = Math.min(Math.max(parseInt(zoom, 10) || 19, 1), 21)

  // ── action=contact ────────────────────────────────────────────────────────
  // Uses Places API (New) — the legacy place/nearbysearch + place/details
  // endpoints are no longer enabled for new GCP projects. One searchNearby call
  // returns name + phone + website + types (no second details round-trip).
  // Requires the "Places API (New)" to be enabled on the key's GCP project.
  if (action === 'contact') {
    if (!GOOGLE_KEY) {
      return Response.json({ available: false })
    }

    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask':
            'places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.types',
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: { center: { latitude: latN, longitude: lngN }, radius: 50 },
          },
          maxResultCount: 1,
          rankPreference: 'DISTANCE',
        }),
      })

      if (!res.ok) {
        return Response.json({ available: false })
      }

      const data = (await res.json()) as {
        places?: Array<{
          displayName?: { text?: string }
          nationalPhoneNumber?: string
          internationalPhoneNumber?: string
          websiteUri?: string
          types?: string[]
        }>
      }

      const place = data.places?.[0]
      if (!place) {
        return Response.json({ available: false })
      }

      const phone =
        (place.internationalPhoneNumber || place.nationalPhoneNumber || '').replace(/\s/g, '') ||
        undefined

      return Response.json({
        available: true,
        name: place.displayName?.text,
        phone,
        website: place.websiteUri,
        types: place.types,
      })
    } catch {
      // Intentionally no error detail — do not leak key or internal state
      return Response.json({ available: false })
    }
  }

  // ── action=satellite ──────────────────────────────────────────────────────
  if (!GOOGLE_KEY) {
    // Redirect to OSM tile — <img src> will follow the 302 and render something
    return Response.redirect(fallbackSatelliteUrl(lat, lng, zoom), 302)
  }

  try {
    const staticUrl =
      `https://maps.googleapis.com/maps/api/staticmap` +
      `?center=${latN},${lngN}` +
      `&zoom=${safeZoom}` +
      `&size=${safeSize}` +
      `&maptype=satellite` +
      `&key=${GOOGLE_KEY}`

    const imgRes = await fetch(staticUrl)
    if (!imgRes.ok) {
      return Response.redirect(fallbackSatelliteUrl(lat, lng, zoom), 302)
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    const buf = await imgRes.arrayBuffer()

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache for 7 days — satellite tiles are static
        'Cache-Control': 'public, max-age=604800, immutable',
        'Content-Length': String(buf.byteLength),
      },
    })
  } catch {
    return Response.redirect(fallbackSatelliteUrl(lat, lng, zoom), 302)
  }
}
