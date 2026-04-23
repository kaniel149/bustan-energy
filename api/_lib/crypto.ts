// ── Crypto helpers (Edge-compatible Web Crypto API) ──────────

export async function sha256hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Cryptographically secure 6-digit number (100000-999999).
 * Uses getRandomValues instead of Math.random.
 */
export function random6(): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String((arr[0] % 900000) + 100000)
}
