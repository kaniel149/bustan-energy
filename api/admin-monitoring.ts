// ============================================================
// /api/admin-monitoring
// CRUD for customer_systems + system_readings (monitoring MVP).
//
// Routes (all admin-gated via Supabase session Bearer token):
//   GET    /api/admin-monitoring                → systems + last 31 days of readings
//   POST   /api/admin-monitoring                → body { resource: 'system', ... } create system
//                                                  body { resource: 'reading', ... } upsert daily reading
//   PATCH  /api/admin-monitoring?id=X           → update system fields
// ============================================================
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'
import { supaGetAll, supaPost, supaUpsert } from './_lib/supa.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const INVERTER_BRANDS = ['huawei', 'solaredge', 'sungrow', 'growatt', 'other'] as const
const SYSTEM_STATUSES = ['active', 'paused', 'archived'] as const

interface SystemRow {
  id: string
  customer_name: string
  site_name: string
  [key: string]: unknown
}

interface ReadingRow {
  id: string
  system_id: string
  date: string
  kwh_produced: number
  expected_kwh: number | null
  source: string
}

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  const email = user?.email?.toLowerCase()
  return email && isAllowedAdmin(email) ? email : null
}

function bad(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status })
}

/** Pick only whitelisted, defined keys from a payload */
function pickSystemFields(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const fields = [
    'customer_name', 'customer_phone', 'customer_email',
    'site_name', 'system_kwp', 'inverter_brand', 'inverter_api_id',
    'install_date', 'status', 'notes',
  ]
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f] === '' ? null : body[f]
  }
  return out
}

function validateSystem(fields: Record<string, unknown>, requireAll: boolean): string | null {
  if (requireAll) {
    if (!fields.customer_name) return 'customer_name is required'
    if (!fields.site_name) return 'site_name is required'
    if (fields.system_kwp == null) return 'system_kwp is required'
  }
  if (fields.system_kwp != null && (typeof fields.system_kwp !== 'number' || !(fields.system_kwp > 0))) {
    return 'system_kwp must be a positive number'
  }
  if (fields.inverter_brand != null && !INVERTER_BRANDS.includes(fields.inverter_brand as typeof INVERTER_BRANDS[number])) {
    return `inverter_brand must be one of: ${INVERTER_BRANDS.join(', ')}`
  }
  if (fields.status != null && !SYSTEM_STATUSES.includes(fields.status as typeof SYSTEM_STATUSES[number])) {
    return `status must be one of: ${SYSTEM_STATUSES.join(', ')}`
  }
  return null
}

export default async function handler(req: Request): Promise<Response> {
  const adminEmail = await verifyAdmin(req)
  if (!adminEmail) return bad('unauthorized', 401)

  const url = new URL(req.url)

  // ── GET: systems + last 31 days of readings ──
  if (req.method === 'GET') {
    const since = new Date(Date.now() - 31 * 86400_000).toISOString().slice(0, 10)
    const [systems, readings] = await Promise.all([
      supaGetAll<SystemRow>('customer_systems?select=*&order=created_at.desc'),
      supaGetAll<ReadingRow>(
        `system_readings?select=*&date=gte.${since}&order=date.asc&limit=10000`,
      ),
    ])
    return Response.json({ ok: true, systems, readings })
  }

  // ── POST: create system OR upsert reading ──
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return bad('invalid JSON body')
    }

    if (body.resource === 'reading') {
      const { system_id, date, kwh_produced, expected_kwh } = body
      if (typeof system_id !== 'string' || !system_id) return bad('system_id is required')
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad('date must be YYYY-MM-DD')
      if (typeof kwh_produced !== 'number' || !(kwh_produced >= 0)) return bad('kwh_produced must be a number >= 0')
      if (expected_kwh != null && (typeof expected_kwh !== 'number' || !(expected_kwh >= 0))) {
        return bad('expected_kwh must be a number >= 0')
      }
      try {
        const rows = await supaUpsert<ReadingRow>(
          'system_readings',
          { system_id, date, kwh_produced, expected_kwh: expected_kwh ?? null, source: 'manual' },
          'system_id,date',
        )
        return Response.json({ ok: true, reading: rows[0] ?? null })
      } catch (e) {
        return bad(`reading upsert failed: ${e instanceof Error ? e.message : String(e)}`, 500)
      }
    }

    // default: create system
    const fields = pickSystemFields(body)
    const invalid = validateSystem(fields, true)
    if (invalid) return bad(invalid)
    const rows = await supaPost<SystemRow>('customer_systems', fields)
    if (!rows?.length) return bad('insert failed', 500)
    return Response.json({ ok: true, system: rows[0] })
  }

  // ── PATCH: update system ──
  if (req.method === 'PATCH') {
    const id = url.searchParams.get('id')
    if (!id) return bad('id query param is required')
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return bad('invalid JSON body')
    }
    const fields = pickSystemFields(body)
    if (!Object.keys(fields).length) return bad('no updatable fields provided')
    const invalid = validateSystem(fields, false)
    if (invalid) return bad(invalid)

    const r = await fetch(`${SUPABASE_URL}/rest/v1/customer_systems?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(fields),
    })
    if (!r.ok) {
      const txt = await r.text()
      return bad(`update failed: ${r.status} ${txt.slice(0, 200)}`, 500)
    }
    const rows = await r.json()
    return Response.json({ ok: true, system: rows[0] ?? null })
  }

  return bad('method not allowed', 405)
}
