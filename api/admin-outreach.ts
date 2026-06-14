// ============================================================
// /api/admin-outreach — approval queue API.
// GET  ?status=draft            → list messages (default draft)
// POST { action, id|ids, body } → approve | skip | edit | bulk_approve
// Auth: Supabase session bearer + isAllowedAdmin (admin-stats pattern).
// ============================================================
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'
import { bGet, bPatch } from './_lib/bustan-db.js'

// SUPABASE_URL/KEY here are used ONLY to verify the admin session against the
// main project's auth (users live in the main project). The outreach_messages
// data lives in the separate bustan project, reached via bGet/bPatch.
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface AuthUser {
  email?: string
}

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const user = (await r.json()) as AuthUser
  const email = user?.email?.toLowerCase()
  return email && isAllowedAdmin(email) ? email : null
}

const VALID_STATUSES = ['draft', 'approved', 'sent', 'replied', 'bounced', 'skipped'] as const

interface ActionBody {
  action: 'approve' | 'skip' | 'edit' | 'bulk_approve'
  id?: string
  ids?: string[]
  body?: string
  subject?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req: Request): Promise<Response> {
  const admin = await verifyAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') || 'draft'
    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return Response.json({ ok: false, error: 'bad_status' }, { status: 400 })
    }
    const rows = await bGet(
      `outreach_messages?status=eq.${status}` +
        `&select=id,property_id,channel,language,recipient,subject,body,facts,status,created_at,sent_at` +
        `&order=created_at.desc&limit=200`,
    )
    return Response.json({ ok: true, rows })
  }

  if (req.method === 'POST') {
    const b = ((await req.json().catch(() => null)) as ActionBody | null)
    if (!b?.action) return Response.json({ ok: false, error: 'bad_request' }, { status: 400 })
    const now = new Date().toISOString()

    if (b.action === 'approve' && b.id && UUID_RE.test(b.id)) {
      await bPatch(`outreach_messages?id=eq.${b.id}&status=eq.draft`, {
        status: 'approved', approved_by: admin, approved_at: now,
      })
      return Response.json({ ok: true })
    }
    if (
      b.action === 'bulk_approve' &&
      Array.isArray(b.ids) &&
      b.ids.length > 0 &&
      b.ids.length <= 200 &&
      b.ids.every((i) => UUID_RE.test(i))
    ) {
      const list = b.ids.map((i) => `"${i}"`).join(',')
      await bPatch(`outreach_messages?id=in.(${list})&status=eq.draft`, {
        status: 'approved', approved_by: admin, approved_at: now,
      })
      return Response.json({ ok: true, count: b.ids.length })
    }
    if (b.action === 'skip' && b.id && UUID_RE.test(b.id)) {
      await bPatch(`outreach_messages?id=eq.${b.id}&status=eq.draft`, { status: 'skipped' })
      return Response.json({ ok: true })
    }
    if (
      b.action === 'edit' &&
      b.id &&
      UUID_RE.test(b.id) &&
      typeof b.body === 'string' &&
      b.body.trim()
    ) {
      await bPatch(`outreach_messages?id=eq.${b.id}&status=eq.draft`, {
        body: b.body,
        ...(typeof b.subject === 'string' ? { subject: b.subject } : {}),
      })
      return Response.json({ ok: true })
    }
    return Response.json({ ok: false, error: 'bad_action' }, { status: 400 })
  }

  return Response.json({ ok: false, error: 'method_not_allowed' }, { status: 405 })
}
