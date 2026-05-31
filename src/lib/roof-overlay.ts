import { uploadProposalImage, proposalImagePath, resizeImage } from './storage'

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper — used by RoofImageUploader (manual drone path) and
// NewProposalPage (auto satellite path).
//
// Takes an image URL (satellite or drone), calls /api/admin-overlay-panels,
// decodes the returned base64, uploads the result to proposal-images storage,
// and returns the public URL.
//
// Two modes:
//   serverFetch: false (default) — same-origin / storage URLs:
//     client fetches + resizes to 768px, uploads small copy, sends storage URL
//     to the API.  Works for manual drone uploads (same-origin, no CORS issue).
//
//   serverFetch: true — remote provider URLs (Google Static Maps, Mapbox, etc.):
//     client does NOT fetch the URL (CORS-blocked for googleapis/mapbox), does
//     NOT embed the key-bearing URL into storage.  Instead, the raw provider URL
//     is passed directly to /api/admin-overlay-panels and the SERVER fetches it
//     (no CORS, API key never leaves server).
//
// Throws on auth/network/Gemini error so callers can catch and show a fallback.
// ─────────────────────────────────────────────────────────────────────────────
export async function generatePanelOverlay({
  imageUrl,
  proposalRef,
  panelCount,
  notes = '',
  serverFetch = false,
}: {
  imageUrl: string
  proposalRef: string
  panelCount: number
  notes?: string
  /** When true the server fetches the remote URL — avoids CORS and keeps
   *  key-bearing provider URLs off the client.  Use for satellite/map providers. */
  serverFetch?: boolean
}): Promise<string> {
  const { getSession } = await import('./admin-auth')
  const session = await getSession()
  const token = session?.access_token
  if (!token) throw new Error('לא מחובר — התחבר מחדש לאדמין')

  let apiImageUrl: string

  if (serverFetch) {
    // Remote provider URL — pass straight to the API; server handles the fetch.
    // Never attempt a client-side fetch (CORS-blocked for googleapis/mapbox).
    apiImageUrl = imageUrl
  } else {
    // Same-origin / storage URL — client fetches, resizes to 768px, uploads a
    // small copy, and sends the storage URL so the API can load it reliably.
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`image_fetch_failed: HTTP ${response.status}`)
    const origBlob = await response.blob()
    const origFile = new File([origBlob], 'roof.jpg', { type: origBlob.type || 'image/jpeg' })
    const smallFile = await resizeImage(origFile, 768, 0.80)
    const smallPath = proposalImagePath(proposalRef || 'draft', 'original') + '-ai-small'
    apiImageUrl = await uploadProposalImage(smallFile, smallPath)
  }

  const res = await fetch('/api/admin-overlay-panels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ image_url: apiImageUrl, panel_count: panelCount, notes }),
  })

  const rawText = await res.text()
  let data: { ok: boolean; image_base64?: string; error?: string; detail?: string }
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`HTTP ${res.status}: ${rawText.slice(0, 120)}`)
  }
  if (!data.ok || !data.image_base64) {
    throw new Error(data.error || data.detail || `overlay_failed (HTTP ${res.status})`)
  }

  // Decode base64 → Blob → upload to storage → return public URL
  const b64 = data.image_base64.replace(/^data:image\/\w+;base64,/, '')
  const byteChars = atob(b64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
  const panelBlob = new Blob([bytes], { type: 'image/jpeg' })
  const panelFile = new File([panelBlob], 'panels.jpg', { type: 'image/jpeg' })
  const panelPath = proposalImagePath(proposalRef || 'draft', 'panels')
  return uploadProposalImage(panelFile, panelPath)
}
