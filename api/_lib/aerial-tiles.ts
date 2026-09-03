// Esri World Imagery tile fetch + 3x3 stitch + footprint outline + metre crop.
// Ported from bustan-index/scripts/detect_solar_kp.py (verified on Ko Phangan, Aug 2026):
//   z19 returns a ~2.5 KB "no data" placeholder over the island; z18 is real (~13 KB).
//   Outlining the target footprint stops neighbours' panels from being attributed to it
//   (Treechart Hostel was flagged because of panels on a warehouse ~30 m north).
// Node runtime only (sharp) — do not import from an edge function.
import sharp, { type OverlayOptions } from 'sharp'

export const TILE_ZOOM = 18
export const MIN_TILE_BYTES = 4000
export const TILE_PX = 256
export const BLOCK_PX = TILE_PX * 3
export const ESRI_TILE = (z: number, y: number, x: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

export function lonLatToTile(lon: number, lat: number, z: number) {
  const n = 2 ** z
  const xf = ((lon + 180) / 360) * n
  const latR = (lat * Math.PI) / 180
  const yf = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n
  return { x: Math.floor(xf), y: Math.floor(yf), xf, yf }
}

export interface TileBlock { z: number; originX: number; originY: number; tiles: { x: number; y: number }[] }

export function tileBlockFor(lon: number, lat: number, z = TILE_ZOOM): TileBlock {
  const { x, y } = lonLatToTile(lon, lat, z)
  const tiles: { x: number; y: number }[] = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push({ x: x + dx, y: y + dy })
  return { z, originX: x - 1, originY: y - 1, tiles }
}

export function lonLatToBlockPx(lon: number, lat: number, b: TileBlock) {
  const { xf, yf } = lonLatToTile(lon, lat, b.z)
  return { px: (xf - b.originX) * TILE_PX, py: (yf - b.originY) * TILE_PX }
}

export function polygonToSvgPath(ring: number[][], b: TileBlock): string {
  const pts = ring.map(([lon, lat]) => {
    const { px, py } = lonLatToBlockPx(lon, lat, b)
    return `${Math.max(0, Math.min(BLOCK_PX, px)).toFixed(1)} ${Math.max(0, Math.min(BLOCK_PX, py)).toFixed(1)}`
  })
  return `M${pts.join(' L')} Z`
}

export function metresPerPixel(lat: number, z: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z
}

export function cropBoxForMetres(lon: number, lat: number, metres: number, b: TileBlock) {
  const { px, py } = lonLatToBlockPx(lon, lat, b)
  const half = metres / metresPerPixel(lat, b.z) / 2
  const left = Math.round(Math.max(0, Math.min(BLOCK_PX - 2 * half, px - half)))
  const top = Math.round(Math.max(0, Math.min(BLOCK_PX - 2 * half, py - half)))
  const size = Math.round(Math.min(2 * half, BLOCK_PX))
  return { left, top, width: size, height: size }
}

export async function fetchTile(z: number, y: number, x: number, timeoutMs = 10_000): Promise<Buffer> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(ESRI_TILE(z, y, x), { signal: ctl.signal })
    if (!r.ok) throw new Error(`esri_${r.status}`)
    if (!(r.headers.get('content-type') || '').startsWith('image/')) throw new Error('esri_not_image')
    const buf = Buffer.from(await r.arrayBuffer())
    // Placeholder tiles are valid JPEGs, just tiny and empty — size is the only
    // signal Esri gives us that this zoom has no imagery here.
    if (buf.byteLength < MIN_TILE_BYTES) throw new Error(`esri_tile_placeholder_${buf.byteLength}b`)
    return buf
  } finally { clearTimeout(t) }
}

/** 3x3 block, target footprint outlined in magenta, cropped to `cropMetres` around (lon,lat), 640px JPEG → base64. */
export async function buildOutlinedCrop(opts: { lon: number; lat: number; ring?: number[][] | null; cropMetres?: number; z?: number }) {
  const z = opts.z ?? TILE_ZOOM
  const b = tileBlockFor(opts.lon, opts.lat, z)
  const tiles = await Promise.all(b.tiles.map(t => fetchTile(z, t.y, t.x)))
  const composites: OverlayOptions[] = tiles.map((input, i) => ({ input, left: (i % 3) * TILE_PX, top: Math.floor(i / 3) * TILE_PX }))
  const outlined = Boolean(opts.ring && opts.ring.length >= 4)
  if (outlined) {
    const svg = `<svg width="${BLOCK_PX}" height="${BLOCK_PX}" xmlns="http://www.w3.org/2000/svg"><path d="${polygonToSvgPath(opts.ring!, b)}" fill="none" stroke="#ff00ff" stroke-width="3"/></svg>`
    composites.push({ input: Buffer.from(svg), left: 0, top: 0 })
  }
  const box = cropBoxForMetres(opts.lon, opts.lat, opts.cropMetres ?? 120, b)
  const jpeg = await sharp({ create: { width: BLOCK_PX, height: BLOCK_PX, channels: 3, background: '#000' } })
    .composite(composites).extract(box).resize(640, 640).jpeg({ quality: 85 }).toBuffer()
  return { base64: jpeg.toString('base64'), mime: 'image/jpeg', zoom: z, outlined }
}
