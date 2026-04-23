// ── Supabase REST helpers (Edge-compatible, no SDK) ─────────

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const baseHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
})

/** GET first matching row, or null */
export async function supaGet(path: string): Promise<any | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!r.ok) return null
  const arr = await r.json()
  return Array.isArray(arr) && arr.length ? arr[0] : null
}

/** GET all rows as array */
export async function supaGetAll(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  return r.ok ? r.json() : []
}

/** POST (insert) row(s), returns json */
export async function supaPost(table: string, body: any): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...baseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  return r.ok ? r.json() : null
}

/** PATCH rows matching a filter path (table?col=eq.val) */
export async function supaPatch(path: string, body: any): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...baseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
}

/** UPSERT with conflict resolution */
export async function supaUpsert(
  table: string,
  body: any,
  onConflict = '',
): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${onConflict ? '?on_conflict=' + onConflict : ''}`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`supa ${table}: ${r.status} ${txt}`)
  }
  return r.json()
}
