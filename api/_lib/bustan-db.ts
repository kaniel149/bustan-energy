// ── Bustan REST helpers (separate Supabase project, `bustan` schema) ──────────
//
// The scan/enrich/outreach data lives in a DIFFERENT Supabase project from the
// main CRM (public schema, see supa.ts). It is reached via the BUSTAN_* env +
// PostgREST profile headers (Accept-Profile / Content-Profile = 'bustan').
// Mirrors the inline helpers in find-contact-core.ts / cron-detect-solar.ts,
// extracted here so the outreach crons + admin API share one source of truth.
//
// Contract intentionally matches supa.ts (bGet≈supaGetAll, bPost≈supaPost,
// bPatch≈supaPatch) so callers can swap import sources with minimal change.

const BUSTAN_URL = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const BUSTAN_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY!

function bustanHeaders(write = false): Record<string, string> {
  const h: Record<string, string> = { apikey: BUSTAN_KEY, Authorization: `Bearer ${BUSTAN_KEY}` }
  if (write) {
    h['Content-Type'] = 'application/json'
    h['Content-Profile'] = 'bustan'
  } else {
    h['Accept-Profile'] = 'bustan'
  }
  return h
}

/** GET all rows as array (empty array on any non-OK). */
export async function bGet<T = Record<string, unknown>>(path: string): Promise<T[]> {
  const r = await fetch(`${BUSTAN_URL}/rest/v1/${path}`, { headers: bustanHeaders(false) })
  return r.ok ? r.json() : []
}

/** POST (insert) row(s); returns inserted rows or null on failure/conflict. */
export async function bPost<T = Record<string, unknown>>(
  table: string,
  body: unknown,
): Promise<T[] | null> {
  const r = await fetch(`${BUSTAN_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...bustanHeaders(true), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  return r.ok ? r.json() : null
}

/** PATCH rows matching a filter path (`table?col=eq.val`); returns the Response. */
export async function bPatch(path: string, body: unknown): Promise<Response> {
  return fetch(`${BUSTAN_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...bustanHeaders(true), Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
}
