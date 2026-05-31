// One-time forward-geocode of the Colliers listing locations (district-level)
// via OSM Nominatim → public/data/colliers-geocodes.json  ({ locationRaw: {lat,lng} }).
// Respects Nominatim policy: proper User-Agent + 1.1s between requests, single run.
// Run: node scripts/geocode-colliers.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MD = resolve(ROOT, 'public/data/colliers-listings.md')
const OUT = resolve(ROOT, 'public/data/colliers-geocodes.json')

const md = readFileSync(MD, 'utf8')
const locs = [...md.matchAll(/^- Location\/address:\s*(.+)$/gim)].map((m) => m[1].trim())
const unique = [...new Set(locs)].filter((s) => s && !/^unknown/i.test(s))
console.log(`Unique locations to geocode: ${unique.length}`)

// Clean a locationRaw into a Nominatim-friendly query. Returns null for
// malformed source lines (e.g. a stray "- URL:" value) which can't be geocoded.
// Strips a building-name prefix before an em/en-dash so Nominatim resolves the
// district, e.g. "Athenee Tower — Lumphini, Pathum Wan, Bangkok" → "Lumphini, Pathum Wan, Bangkok".
function cleanForQuery(loc) {
  if (/https?:\/\/|^-?\s*URL/i.test(loc)) return null
  let s = loc
  const dash = s.match(/[—–]\s*(.+)$/) // text after an em/en-dash = the real location
  if (dash) s = dash[1]
  s = s.trim().replace(/\s+/g, ' ')
  if (!s) return null
  return /thailand/i.test(s) ? s : `${s}, Thailand`
}

// Reuse any prior run so re-runs are incremental.
let out = {}
try { out = JSON.parse(readFileSync(OUT, 'utf8')) } catch { /* fresh */ }

let done = 0, hit = 0
for (const loc of unique) {
  if (out[loc]) { done++; hit++; continue }
  const cleaned = cleanForQuery(loc)
  if (!cleaned) { done++; console.log('  skip (malformed):', loc); continue }
  const q = encodeURIComponent(cleaned)
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${q}&limit=1&countrycodes=th`
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'solar-intelligence/1.0 (k@kanielt.com)', 'Accept-Language': 'en' } })
    const j = await r.json()
    if (Array.isArray(j) && j[0]) { out[loc] = { lat: +j[0].lat, lng: +j[0].lon }; hit++ }
    else console.log('  no result:', loc)
  } catch (e) { console.log('  err:', loc, e.message) }
  done++
  if (done % 10 === 0) writeFileSync(OUT, JSON.stringify(out, null, 2)) // checkpoint
  await new Promise((res) => setTimeout(res, 1100))
}
writeFileSync(OUT, JSON.stringify(out, null, 2))
console.log(`Geocoded ${hit}/${unique.length} → ${OUT}`)
