/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase REST payloads here are schemaless until generated DB types are wired in. */
// ============================================================
// /api/admin-procurement
// CRUD for procurement_orders (internal BOMs).
//
// Routes (all admin-gated):
//   POST   /api/admin-procurement          → create new procurement order (idempotent on proposal_ref)
//   GET    /api/admin-procurement          → list all orders
//   GET    /api/admin-procurement?id=X     → single order
//   GET    /api/admin-procurement?ref=X    → by proposal_ref
//   GET    /api/admin-procurement?lead=X   → by lead_id
//   PATCH  /api/admin-procurement?id=X     → update status/pricing/supplier
// ============================================================
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'
import { sha256hex } from './_lib/crypto.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const allowed = isAllowedAdmin

// BOM templates file path — relative to repo root at runtime (Vercel edge)
// We read it via fetch from the public path if available; otherwise fall back to null.
// The hash + snapshot are best-effort: if unavailable, we store empty.
const BOM_TEMPLATES_URL = process.env.BOM_TEMPLATES_URL || null

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

async function supaGet(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supaHeaders() })
  if (!r.ok) return []
  return r.json()
}

async function supaInsert(table: string, body: any): Promise<any> {
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

async function supaPatch(path: string, body: any): Promise<any> {
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

// ── Fetch BOM templates + compute hash (best-effort) ─────────
async function loadBomSnapshot(): Promise<{ snapshot: Record<string, any>; hash: string }> {
  if (!BOM_TEMPLATES_URL) return { snapshot: {}, hash: '' }
  try {
    const r = await fetch(BOM_TEMPLATES_URL)
    if (!r.ok) return { snapshot: {}, hash: '' }
    const text = await r.text()
    const hash = await sha256hex(text)
    let snapshot: Record<string, any> = {}
    try { snapshot = JSON.parse(text) } catch { /* ignore */ }
    return { snapshot, hash }
  } catch {
    return { snapshot: {}, hash: '' }
  }
}

function buildPriceSnapshot(
  bomJson: any,
  templateSnapshot: Record<string, any>,
  templateHash: string,
): Record<string, any> {
  const rows = Array.isArray(bomJson?.rows) ? bomJson.rows : []
  return {
    captured_at: new Date().toISOString(),
    bom_summary: bomJson?.summary || null,
    supplier_summary: bomJson?.supplier_summary || null,
    totals: bomJson?.totals || null,
    rows: rows.map((row: any) => ({
      category: row.category,
      sku: row.sku,
      qty: row.qty,
      unit_price_thb: row.unit_price_thb,
      subtotal_thb: row.subtotal_thb,
      benchmark_unit_price_thb: row.benchmark_unit_price_thb,
      price_status: row.price_status,
      supplier_name: row.supplier_name,
      supplier_source: row.supplier_source,
      supplier_sku: row.supplier_sku,
      supplier_valid_until: row.supplier_valid_until,
      supplier_url: row.supplier_url,
      price_note: row.price_note,
    })),
    template_hash: templateHash || null,
    template_snapshot: Object.keys(templateSnapshot || {}).length ? templateSnapshot : undefined,
  }
}

// ── Validate incoming BOM matches proposal values ─────────────
// Returns error string if mismatch, null if ok.
async function validateAgainstProposal(
  proposalRef: string,
  panels: number,
  panelWatt: number,
  systemKwp: number,
): Promise<string | null> {
  const rows = await supaGet(
    `proposals?ref_number=eq.${encodeURIComponent(proposalRef)}&select=panels,panel_watt,system_size_kwp&limit=1`
  )
  if (!rows.length) {
    // Proposal not found — warn but don't block (proposal may be deleted)
    return null
  }
  const p = rows[0]

  if (p.panels !== undefined && p.panels !== null) {
    if (Number(p.panels) !== panels) {
      return `panels mismatch: proposal has ${p.panels}, BOM has ${panels}`
    }
  }
  if (p.panel_watt !== undefined && p.panel_watt !== null) {
    if (Number(p.panel_watt) !== panelWatt) {
      return `panel_watt mismatch: proposal has ${p.panel_watt}W, BOM has ${panelWatt}W`
    }
  }
  if (p.system_size_kwp !== undefined && p.system_size_kwp !== null) {
    const propKwp = Number(p.system_size_kwp)
    const tolerance = propKwp * 0.001 // 0.1%
    if (Math.abs(propKwp - systemKwp) > tolerance) {
      return `system_kwp mismatch: proposal has ${propKwp} kWp, BOM has ${systemKwp} kWp (tolerance 0.1%)`
    }
  }

  return null
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const email = await verifyAdmin(req)
    if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const ref = url.searchParams.get('ref')
    const lead = url.searchParams.get('lead')

    // ── GET ──────────────────────────────────────────────────
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
      const rows = await supaGet(
        `procurement_orders?select=*&order=created_at.desc&limit=500`
      )
      return Response.json({ ok: true, orders: rows })
    }

    // ── POST (create — idempotent) ────────────────────────────
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

      // Input validation
      if (!bom_template || !panels || !panel_watt || !bom_json) {
        return Response.json({ ok: false, error: 'missing_required' }, { status: 400 })
      }
      if (typeof panels !== 'number' || panels <= 0) {
        return Response.json({ ok: false, error: 'panels must be a positive number' }, { status: 400 })
      }
      if (typeof panel_watt !== 'number' || panel_watt <= 0) {
        return Response.json({ ok: false, error: 'panel_watt must be a positive number' }, { status: 400 })
      }

      // ── Validate against proposal (if ref provided) ────────
      if (proposal_ref) {
        const mismatch = await validateAgainstProposal(
          proposal_ref,
          panels,
          panel_watt,
          system_kwp,
        )
        if (mismatch) {
          return Response.json({ ok: false, error: `proposal_mismatch: ${mismatch}` }, { status: 400 })
        }
      }

      // ── Idempotency: check for existing active order ───────
      if (proposal_ref) {
        const existing = await supaGet(
          `procurement_orders?proposal_ref=eq.${encodeURIComponent(proposal_ref)}&status=neq.cancelled&select=*&limit=1`
        )
        if (existing.length > 0) {
          // Idempotent: return existing order with 200
          // If bom_json changed, update BOM on the existing order (same proposal, refreshed calc)
          const existingOrder = existing[0]
          const bomChanged = JSON.stringify(existingOrder.bom_json) !== JSON.stringify(bom_json)
          if (bomChanged) {
            const { snapshot, hash } = await loadBomSnapshot()
            const priceSnapshot = buildPriceSnapshot(bom_json, snapshot, hash)
            const updated = await supaPatch(`procurement_orders?id=eq.${existingOrder.id}`, {
              bom_json,
              supplier_email_text: supplier_email_text || null,
              estimated_thb: estimated_thb || null,
              price_snapshot: priceSnapshot,
              bom_templates_hash: hash || null,
            })
            const order = Array.isArray(updated) ? updated[0] : updated
            return Response.json({ ok: true, order, idempotent: true, updated_bom: true })
          }
          return Response.json({ ok: true, order: existingOrder, idempotent: true })
        }
      }

      // ── Load BOM snapshot for new order ───────────────────
      const { snapshot, hash } = await loadBomSnapshot()
      const priceSnapshot = buildPriceSnapshot(bom_json, snapshot, hash)

      // ── Insert new order ───────────────────────────────────
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
        price_snapshot: priceSnapshot,
        bom_templates_hash: hash || null,
        notes: notes || null,
        status: 'draft',
        created_by: email,
        // po_number is set automatically by DB trigger
      })

      const order = Array.isArray(inserted) ? inserted[0] : inserted
      return Response.json({ ok: true, order })
    }

    // ── PATCH (update) ────────────────────────────────────────
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
        if (patch.status === 'sent')      patch.sent_at = ts
        else if (patch.status === 'quoted')   patch.quoted_at = ts
        else if (patch.status === 'ordered')  patch.ordered_at = ts
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
