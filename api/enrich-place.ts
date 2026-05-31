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
  if (action === 'contact') {
    if (!GOOGLE_KEY) {
      return Response.json({ available: false })
    }

    try {
      const nearbyUrl =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${latN},${lngN}&radius=30&key=${GOOGLE_KEY}`

      const nearbyRes = await fetch(nearbyUrl)
      if (!nearbyRes.ok) {
        return Response.json({ available: false })
      }

      const nearbyData = await nearbyRes.json() as {
        results?: Array<{ name?: string; place_id?: string; types?: string[] }>
      }

      if (!nearbyData.results?.length) {
        return Response.json({ available: false })
      }

      const place = nearbyData.results[0]

      let phone: string | undefined
      let website: string | undefined

      if (place.place_id) {
        const detailUrl =
          `https://maps.googleapis.com/maps/api/place/details/json` +
          `?place_id=${encodeURIComponent(place.place_id)}` +
          `&fields=formatted_phone_number,international_phone_number,website` +
          `&key=${GOOGLE_KEY}`

        const detailRes = await fetch(detailUrl)
        if (detailRes.ok) {
          const detailData = await detailRes.json() as {
            result?: {
              international_phone_number?: string
              formatted_phone_number?: string
              website?: string
            }
          }
          phone = detailData.result?.international_phone_number?.replace(/\s/g, '')
            || detailData.result?.formatted_phone_number?.replace(/\s/g, '')
          website = detailData.result?.website
        }
      }

      return Response.json({
        available: true,
        name: place.name,
        phone,
        website,
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
