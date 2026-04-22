// ============================================================
// /api/admin-procurement
// CRUD for procurement_orders (internal BOMs).
//
// Routes (all admin-gated):
//   POST   /api/admin-procurement          → create new procurement order
//   GET    /api/admin-procurement          → list all orders
//   GET    /api/admin-procurement?id=X     → single order
//   GET    /api/admin-procurement?ref=X    → by proposal_ref
//   GET    /api/admin-procurement?lead=X   → by lead_id
//   PATCH  /api/admin-procurement?id=X     → update status/pricing/supplier
// ============================================================
export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_DOMAIN = '@energy-tm.com'
const EXTRA = ['k@kanielt.com']
const allowed = (e: string) => e.endsWith(ADMIN_DOMAIN) || EXTRA.includes(e)

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const user = await r.json()
  const email = user?.email?.toLowerCase()
  return email && allowed(email) ? email : null
}

function supaHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function supaGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supaHeaders() })
  if (!r.ok) return []
  return r.json()
}

async function supaInsert(table: string, body: any) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...supaHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`insert failed: ${r.status} ${txt.slice(0, 200)}`)
  }
  return r.json()
}

async function supaPatch(path: string, body: any) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...supaHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`patch failed: ${r.status} ${txt.slice(0, 200)}`)
  }
  return r.json()
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const email = await verifyAdmin(req)
    if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const ref = url.searchParams.get('ref')
    const lead = url.searchParams.get('lead')

    // ── GET ──
    if (req.method === 'GET') {
      if (id) {
        const rows = await supaGet(`procurement_orders?id=eq.${id}&select=*`)
        return Response.json({ ok: true, order: rows[0] || null })
      }
      if (ref) {
        const rows = await supaGet(
          `procurement_orders?proposal_ref=eq.${encodeURIComponent(ref)}&select=*&order=created_at.desc`
        )
        return Response.json({ ok: true, orders: rows })
      }
      if (lead) {
        const rows = await supaGet(
          `procurement_orders?lead_id=eq.${lead}&select=*&order=created_at.desc`
        )
        return Response.json({ ok: true, orders: rows })
      }
      // Default: list all
      const rows = await supaGet(
        `procurement_orders?select=*&order=created_at.desc&limit=500`
      )
      return Response.json({ ok: true, orders: rows })
    }

    // ── POST (create) ──
    if (req.method === 'POST') {
      const body = await req.json()
      const {
        proposal_ref,
        lead_id,
        bom_template,
        system_kwp,
        panels,
        panel_watt,
        battery_kwh = 0,
        bom_json,
        supplier_email_text,
        supplier_name,
        supplier_email,
        supplier_phone,
        estimated_thb,
        notes,
      } = body

      if (!bom_template || !panels || !panel_watt || !bom_json) {
        return Response.json({ ok: false, error: 'missing_required' }, { status: 400 })
      }

      const inserted = await supaInsert('procurement_orders', {
        proposal_ref: proposal_ref || null,
        lead_id: lead_id || null,
        bom_template,
        system_kwp,
        panels,
        panel_watt,
        battery_kwh,
        bom_json,
        supplier_email_text: supplier_email_text || null,
        supplier_name: supplier_name || null,
        supplier_email: supplier_email || null,
        supplier_phone: supplier_phone || null,
        estimated_thb: estimated_thb || null,
        notes: notes || null,
        status: 'draft',
        created_by: email,
      })

      const order = Array.isArray(inserted) ? inserted[0] : inserted
      return Response.json({ ok: true, order })
    }

    // ── PATCH (update) ──
    if (req.method === 'PATCH') {
      if (!id) return Response.json({ ok: false, error: 'missing_id' }, { status: 400 })
      const body = await req.json()

      // Whitelist of updatable fields
      const allowedFields = [
        'status', 'supplier_name', 'supplier_email', 'supplier_phone',
        'quoted_thb', 'actual_thb', 'notes',
        'sent_at', 'quoted_at', 'ordered_at', 'received_at', 'installed_at',
      ]
      const patch: Record<string, any> = {}
      for (const k of allowedFields) {
        if (k in body) patch[k] = body[k]
      }

      // Auto-set status timestamps
      if (patch.status && !(`${patch.status}_at` in patch)) {
        const ts = new Date().toISOString()
        if (patch.status === 'sent') patch.sent_at = ts
        else if (patch.status === 'quoted') patch.quoted_at = ts
        else if (patch.status === 'ordered') patch.ordered_at = ts
        else if (patch.status === 'received') patch.received_at = ts
        else if (patch.status === 'installed') patch.installed_at = ts
      }

      const updated = await supaPatch(`procurement_orders?id=eq.${id}`, patch)
      const order = Array.isArray(updated) ? updated[0] : updated
      return Response.json({ ok: true, order })
    }

    return new Response('Method not allowed', { status: 405 })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
