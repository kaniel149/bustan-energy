// ============================================================
// /api/admin-procurement-send
// Send RFQ emails to suppliers, grouped by supplier.
//
// POST { order_id: string }
//   - Fetches order + order items + supplier emails
//   - Groups items by supplier_id
//   - Sends ONE email per supplier with their line items
//   - Also sends a summary to erez@energy-tm.com
//   - Logs each send in notification_log
//   - Transitions order status draft -> sent
//   - Returns { ok, sent: number, errors: string[] }
// ============================================================
export const config = { runtime: 'edge' }

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_KEY   = process.env.RESEND_API_KEY!
const FROM         = process.env.RESEND_FROM || 'TM Energy <procurement@energy-tm.com>'
const REPLY_TO     = 'erez@energy-tm.com'
const ADMIN_DOMAIN = '@energy-tm.com'
const EXTRA        = ['k@kanielt.com']

const allowed = (e: string) => e.endsWith(ADMIN_DOMAIN) || EXTRA.includes(e)

// ── Supabase helpers ──────────────────────────────────────────
function supaHeaders(): HeadersInit {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function supaGetAll(path: string): Promise<any[]> {
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
  return r.ok ? r.json() : null
}

async function supaPatch(path: string, body: any): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { ...supaHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  return r.ok ? r.json() : null
}

// ── Auth ──────────────────────────────────────────────────────
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

// ── Email via Resend ──────────────────────────────────────────
async function sendEmail(
  to: string[],
  subject: string,
  html: string,
  replyTo = REPLY_TO,
): Promise<{ id?: string; error?: string }> {
  if (!RESEND_KEY) return { error: 'RESEND_API_KEY not configured' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, reply_to: replyTo, subject, html }),
  })
  return res.json().catch((e: any) => ({ error: String(e) }))
}

// ── HTML builder for supplier RFQ email ──────────────────────
function buildSupplierEmail(opts: {
  supplierName: string
  orderRef: string
  poNumber: string
  clientSite: string
  items: any[]
}): string {
  const { supplierName, orderRef, poNumber, clientSite, items } = opts

  const rows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escHtml(item.sku || '-')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escHtml(item.description)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.qty}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">฿${Number(item.unit_price_thb || 0).toLocaleString('en-US')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">฿${Number(item.total_thb || item.qty * item.unit_price_thb || 0).toLocaleString('en-US')}</td>
        </tr>`,
    )
    .join('')

  return `
<div style="font-family:system-ui,sans-serif;max-width:680px;margin:0 auto;color:#111;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:28px 32px;border-radius:12px 12px 0 0;color:white;">
    <div style="color:#E8A820;font-weight:800;letter-spacing:2px;font-size:11px;margin-bottom:6px;">TM ENERGY · PROCUREMENT</div>
    <h1 style="margin:0;font-size:20px;">Request for Quotation</h1>
    <p style="margin:4px 0 0;opacity:.75;font-size:13px;">${escHtml(poNumber)} · ${escHtml(orderRef || 'Internal Order')}</p>
  </div>

  <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;">
    <p>Dear <strong>${escHtml(supplierName)}</strong>,</p>
    <p>We are requesting a quotation for the following items for a solar installation project at <strong>${escHtml(clientSite)}</strong>.</p>
    <p>Please reply with your best prices, availability and lead time. We aim to place the order within 3 business days.</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:13px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;font-weight:600;">SKU</th>
          <th style="padding:10px 12px;text-align:left;font-weight:600;">Description</th>
          <th style="padding:10px 12px;text-align:center;font-weight:600;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-weight:600;">Unit (Est.)</th>
          <th style="padding:10px 12px;text-align:right;font-weight:600;">Total (Est.)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p style="color:#6b7280;font-size:12px;">* Prices shown are our reference estimates — please provide your actual quotation.</p>

    <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;font-size:13px;">
      <strong>Delivery:</strong> Koh Phangan, Surat Thani 84280, Thailand<br>
      <strong>Reply to:</strong> ${REPLY_TO}<br>
      <strong>PO Ref:</strong> ${escHtml(poNumber)}
    </div>

    <p style="margin-top:24px;">Thank you for your prompt response.</p>
    <p><strong>TM Energy Procurement</strong><br>
    <a href="https://energy-tm.com" style="color:#E8A820;">energy-tm.com</a></p>
  </div>

  <div style="padding:16px 32px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;font-size:11px;color:#9ca3af;text-align:center;">
    TM Energy · Ko Phangan, Surat Thani 84280, Thailand
  </div>
</div>`
}

// ── Minimal HTML escape ───────────────────────────────────────
function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Log a send event to notification_log ─────────────────────
async function logNotification(opts: {
  event_type: string
  ref_id: string
  recipient: string
  subject: string
  status: 'sent' | 'failed'
  provider_id?: string
  error?: string
  metadata?: Record<string, any>
}): Promise<void> {
  await supaInsert('notification_log', {
    event_type:  opts.event_type,
    ref_id:      opts.ref_id,
    recipient:   opts.recipient,
    subject:     opts.subject,
    status:      opts.status,
    provider_id: opts.provider_id || null,
    error:       opts.error || null,
    metadata:    opts.metadata || {},
  })
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const adminEmail = await verifyAdmin(req)
    if (!adminEmail) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    // Validate input
    let body: any
    try {
      body = await req.json()
    } catch {
      return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 })
    }
    const { order_id } = body
    if (!order_id || typeof order_id !== 'string') {
      return Response.json({ ok: false, error: 'missing order_id' }, { status: 400 })
    }

    // ── Fetch order ───────────────────────────────────────────
    const orders = await supaGetAll(
      `procurement_orders?id=eq.${order_id}&select=*&limit=1`
    )
    if (!orders.length) {
      return Response.json({ ok: false, error: 'order_not_found' }, { status: 404 })
    }
    const order = orders[0]

    // Can only send from draft (or re-send from sent)
    if (!['draft', 'sent'].includes(order.status)) {
      return Response.json(
        { ok: false, error: `cannot send RFQ from status "${order.status}"` },
        { status: 400 }
      )
    }

    // ── Fetch order items ─────────────────────────────────────
    const items = await supaGetAll(
      `procurement_order_items?order_id=eq.${order_id}&select=*,suppliers(id,name,email,phone)`
    )

    const errors: string[] = []
    let sentCount = 0

    if (items.length > 0) {
      // ── Group items by supplier ───────────────────────────
      const bySupplier = new Map<string, { supplier: any; items: any[] }>()

      for (const item of items) {
        const sup = item.suppliers
        const key = sup?.id || '__no_supplier__'
        if (!bySupplier.has(key)) {
          bySupplier.set(key, { supplier: sup || null, items: [] })
        }
        // Strip nested supplier object from item before emailing
        const cleanItem = { ...item }
        delete cleanItem.suppliers
        bySupplier.get(key)!.items.push(cleanItem)
      }

      for (const [, group] of bySupplier) {
        const { supplier, items: groupItems } = group
        if (!supplier?.email) {
          errors.push(`Supplier "${supplier?.name || 'unknown'}" has no email — skipped`)
          continue
        }

        const subject = `RFQ — ${order.po_number || order_id.slice(0, 8)} · ${order.proposal_ref || 'Internal'}`
        const html = buildSupplierEmail({
          supplierName: supplier.name,
          orderRef: order.proposal_ref || order_id.slice(0, 8),
          poNumber: order.po_number || order_id.slice(0, 8),
          clientSite: 'Koh Phangan, Surat Thani 84280',
          items: groupItems,
        })

        const result = await sendEmail([supplier.email], subject, html)

        await logNotification({
          event_type:  'procurement_rfq',
          ref_id:      order_id,
          recipient:   supplier.email,
          subject,
          status:      result.error ? 'failed' : 'sent',
          provider_id: result.id,
          error:       result.error,
          metadata:    { po_number: order.po_number, supplier_id: supplier.id, item_count: groupItems.length },
        })

        if (result.error) {
          errors.push(`Failed to send to ${supplier.email}: ${result.error}`)
        } else {
          sentCount++
        }
      }
    } else {
      // No items in procurement_order_items — fall back to legacy supplier_email on order
      if (!order.supplier_email) {
        return Response.json(
          { ok: false, error: 'no_items_and_no_supplier_email: add items or set supplier_email on order' },
          { status: 400 }
        )
      }

      const subject = `RFQ — ${order.po_number || order_id.slice(0, 8)} · ${order.proposal_ref || 'Internal'}`
      const html = `
<div style="font-family:system-ui;max-width:620px;">
  <div style="background:linear-gradient(135deg,#0D2137,#132D4A);padding:24px;border-radius:12px 12px 0 0;color:white;">
    <div style="color:#E8A820;font-weight:800;letter-spacing:2px;font-size:11px;">TM ENERGY · PROCUREMENT</div>
    <h1 style="margin:8px 0 0;font-size:18px;">Request for Quotation — ${escHtml(order.po_number || order_id.slice(0, 8))}</h1>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
    <pre style="font-family:monospace;font-size:12px;white-space:pre-wrap;">${escHtml(order.supplier_email_text || '')}</pre>
    <p style="margin-top:20px;color:#6b7280;font-size:12px;">Reply to: ${REPLY_TO}</p>
  </div>
</div>`

      const result = await sendEmail([order.supplier_email], subject, html)

      await logNotification({
        event_type:  'procurement_rfq_legacy',
        ref_id:      order_id,
        recipient:   order.supplier_email,
        subject,
        status:      result.error ? 'failed' : 'sent',
        provider_id: result.id,
        error:       result.error,
        metadata:    { po_number: order.po_number },
      })

      if (result.error) {
        errors.push(`Failed to send to ${order.supplier_email}: ${result.error}`)
      } else {
        sentCount++
      }
    }

    // ── Update order status draft -> sent ─────────────────────
    if (sentCount > 0 && order.status === 'draft') {
      await supaPatch(`procurement_orders?id=eq.${order_id}`, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
    }

    return Response.json({
      ok: errors.length === 0 || sentCount > 0,
      sent: sentCount,
      errors,
      order_id,
    })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
