// ── Supabase REST helpers (Edge-compatible, no SDK) ─────────

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

type Row = Record<string, JsonValue>

const baseHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
})

/** GET first matching row, or null */
export async function supaGet<T = Row>(path: string): Promise<T | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!r.ok) return null
  const arr: unknown = await r.json()
  return Array.isArray(arr) && arr.length ? (arr[0] as T) : null
}

/** GET all rows as array */
export async function supaGetAll<T = Row>(path: string): Promise<T[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  return r.ok ? r.json() : []
}

/** POST (insert) row(s), returns json */
export async function supaPost<T = Row>(table: string, body: unknown): Promise<T[] | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...baseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  return r.ok ? r.json() : null
}

/** PATCH rows matching a filter path (table?col=eq.val) */
export async function supaPatch(path: string, body: unknown): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...baseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
}

/** UPSERT with conflict resolution */
export async function supaUpsert<T = Row>(
  table: string,
  body: unknown,
  onConflict = '',
): Promise<T[]> {
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
