/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase REST payloads here are schemaless until generated DB types are wired in. */
// ============================================================
// /api/admin-pea-sign
// POST — save digital signature for a PEA document.
// Body: { document_id, signer_role, signer_name, signer_id_number?,
//         signer_pe_license?, signature_data }
// Validates Thai 13-digit ID checksum when provided.
// ============================================================
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const allowed = isAllowedAdmin

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

/**
 * Validate Thai national ID (13-digit Luhn-like checksum).
 * Returns true if valid, false if invalid format/checksum.
 */
function validateThaiId(id: string): boolean {
  const digits = id.replace(/\D/g, '')
  if (digits.length !== 13) return false
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (13 - i)
  }
  const check = (11 - (sum % 11)) % 10
  return check === parseInt(digits[12], 10)
}

async function supaGet(path: string): Promise<any | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!r.ok) return null
  const arr = await r.json()
  return Array.isArray(arr) && arr.length ? arr[0] : null
}

async function supaPost(table: string, body: any): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`supaPost ${table}: ${r.status} ${txt}`)
  }
  return r.json()
}

async function supaPatch(path: string, body: any): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
}

interface SignBody {
  document_id: string
  signer_role: 'owner' | 'engineer' | 'witness'
  signer_name: string
  signer_id_number?: string
  signer_pe_license?: string
  signature_data: string // base64 PNG data URL
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const email = await verifyAdmin(req)
  if (!email) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as Partial<SignBody>

    // ── Input validation ──────────────────────────────────────
    if (!body.document_id) {
      return Response.json({ ok: false, error: 'document_id required' }, { status: 400 })
    }
    if (!body.signer_role || !['owner', 'engineer', 'witness'].includes(body.signer_role)) {
      return Response.json({ ok: false, error: 'signer_role must be owner, engineer, or witness' }, { status: 400 })
    }
    if (!body.signer_name?.trim()) {
      return Response.json({ ok: false, error: 'signer_name required' }, { status: 400 })
    }
    if (!body.signature_data?.startsWith('data:image/')) {
      return Response.json({ ok: false, error: 'signature_data must be a base64 PNG data URL' }, { status: 400 })
    }
    // Validate Thai ID if provided — allow non-Thai IDs (passport etc.) to pass with warning
    let idWarning: string | null = null
    if (body.signer_id_number) {
      const digits = body.signer_id_number.replace(/\D/g, '')
      if (digits.length === 13 && !validateThaiId(body.signer_id_number)) {
        return Response.json({ ok: false, error: 'Thai ID checksum invalid — please re-enter the 13-digit ID' }, { status: 422 })
      }
      if (digits.length !== 13 && body.signer_id_number.length < 6) {
        return Response.json({ ok: false, error: 'ID number too short — provide Thai 13-digit ID or passport number' }, { status: 422 })
      }
      if (digits.length !== 13) {
        idWarning = 'Non-Thai ID format — not validated with checksum'
      }
    }
    // PE license required for engineer role
    if (body.signer_role === 'engineer' && !body.signer_pe_license?.trim()) {
      return Response.json({ ok: false, error: 'signer_pe_license required for engineer role' }, { status: 400 })
    }

    // ── Verify document exists ────────────────────────────────
    const doc = await supaGet(
      `pea_documents?id=eq.${encodeURIComponent(body.document_id)}&select=id,signed_by_owner,signed_by_engineer&limit=1`,
    )
    if (!doc) {
      return Response.json({ ok: false, error: 'document not found' }, { status: 404 })
    }

    // Get IP address
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

    // ── Insert signature record ───────────────────────────────
    const sigRow = await supaPost('pea_signatures', {
      document_id: body.document_id,
      signer_role: body.signer_role,
      signer_name: body.signer_name.trim(),
      signer_id_number: body.signer_id_number?.trim() || null,
      signer_pe_license: body.signer_pe_license?.trim() || null,
      signature_data: body.signature_data,
      signed_at: new Date().toISOString(),
      ip_address: ip,
    })

    const sigId = Array.isArray(sigRow) && sigRow[0] ? sigRow[0].id : null

    // ── Update pea_documents signed flags ─────────────────────
    const updateFields: Record<string, any> = {}
    if (body.signer_role === 'owner') {
      updateFields.signed_by_owner = true
    } else if (body.signer_role === 'engineer') {
      updateFields.signed_by_engineer = true
      updateFields.engineer_pe_license = body.signer_pe_license
    }

    if (Object.keys(updateFields).length > 0) {
      await supaPatch(
        `pea_documents?id=eq.${encodeURIComponent(body.document_id)}`,
        updateFields,
      )
    }

    return Response.json({
      ok: true,
      signature_id: sigId,
      document_id: body.document_id,
      signer_role: body.signer_role,
      signed_at: new Date().toISOString(),
      ...(idWarning ? { warning: idWarning } : {}),
    })
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
