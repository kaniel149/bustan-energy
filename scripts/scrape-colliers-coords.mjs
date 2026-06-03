// One-time scrape of PRECISE per-listing coordinates from the DotProperty pages
// (each Colliers listing has a URL whose page embeds JSON-LD GeoCoordinates).
// Output: public/data/colliers-coords.json  ({ "<listing url>": {lat,lng} }).
// Respectful: browser UA, ~1.6s between requests, 1 retry, incremental checkpoints.
// Run: node scripts/scrape-colliers-coords.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MD = resolve(ROOT, 'public/data/colliers-listings.md')
const OUT = resolve(ROOT, 'public/data/colliers-coords.json')

const md = readFileSync(MD, 'utf8')
const urls = [...md.matchAll(/^- URL:\s*(https?:\/\/\S+)\s*$/gim)].map((m) => m[1].trim())
const unique = [...new Set(urls)]
console.log(`Listing URLs to scrape: ${unique.length}`)

let out = {}
try { out = JSON.parse(readFileSync(OUT, 'utf8')) } catch { /* fresh */ }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function fetchCoords(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, redirect: 'follow' })
      if (!r.ok) { if (attempt === 0) { await sleep(2500); continue } return null }
      const html = await r.text()
      const lat = html.match(/"latitude"\s*:\s*(-?\d{1,2}\.\d+)/)
      const lng = html.match(/"longitude"\s*:\s*(\d{2,3}\.\d+)/)
      if (lat && lng) {
        const la = +lat[1], lo = +lng[1]
        // sanity: Thailand bbox
        if (la > 5 && la < 21 && lo > 96 && lo < 106) return { lat: la, lng: lo }
      }
      return null
    } catch { if (attempt === 0) { await sleep(2500); continue } return null }
  }
  return null
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let done = 0, hit = 0
for (const url of unique) {
  if (out[url]) { done++; hit++; continue }
  const c = await fetchCoords(url)
  if (c) { out[url] = c; hit++ } else console.log('  no coords:', url.slice(-50))
  done++
  if (done % 10 === 0) { writeFileSync(OUT, JSON.stringify(out, null, 2)); console.log(`  ...${done}/${unique.length} (${hit} hit)`) }
  await sleep(1600)
}
writeFileSync(OUT, JSON.stringify(out, null, 2))
console.log(`Scraped precise coords: ${hit}/${unique.length} → ${OUT}`)
