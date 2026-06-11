/**
 * /api/admin-find-contact
 *
 * POST { propertyId?, lat?, lng?, name?, juristicId?, website? }
 *   → {
 *       ok: true,
 *       company: { name, registrationNo, address, phone, website },
 *       decision_maker: { name, role, phone, email, linkedin },
 *       confidence: 0-1,
 *       sources: string[],
 *       stages: StageReport[],
 *       saved: boolean,
 *     }
 *   → { ok: false, error: string }  (4xx/5xx on hard failures)
 *
 * The 8-stage enrichment pipeline is implemented in api/_lib/find-contact-core.ts
 * and shared with api/cron-enrich-contacts.ts. This file only handles:
 *   - CORS pre-flight
 *   - Admin JWT auth (Supabase user → isAllowedAdmin check)
 *   - Request parsing + validation
 *   - Calling runFindContactPipeline
 *   - Formatting the HTTP response
 *
 * LEGAL / PDPA
 *   Only requests and returns BUSINESS / ROLE-BASED contact information found in
 *   public professional sources. The Gemini prompt in find-contact-core.ts
 *   explicitly forbids private individual personal data (PDPA B.E. 2562).
 */
export const config = { runtime: 'edge' }

import { isAllowedAdmin } from './_lib/admin-access.js'
import {
  runFindContactPipeline,
  isNonEmptyString,
  isFiniteNumber,
  extractJuristicId,
} from './_lib/find-contact-core.js'
import type {
  CompanyInfo,
  DecisionMakerInfo,
  StageReport,
} from './_lib/find-contact-core.js'

// ---------------------------------------------------------------------------
// Env (only what the HTTP layer needs; the pipeline reads its own env vars)
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestBody {
  propertyId?: unknown
  lat?: unknown
  lng?: unknown
  name?: unknown
  juristicId?: unknown
  website?: unknown
}

export interface FindContactResponse {
  ok: true
  company: CompanyInfo
  decision_maker: DecisionMakerInfo
  confidence: number
  sources: string[]
  stages: StageReport[]
  saved: boolean
}

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------

async function verifyAdmin(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return null
  const user = await r.json() as { email?: string }
  const email = user?.email?.toLowerCase()
  return email && isAllowedAdmin(email) ? email : null
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }

  const admin = await verifyAdmin(req)
  if (!admin) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const propertyId = isNonEmptyString(body.propertyId) ? body.propertyId.trim() : undefined
  const inputLat = typeof body.lat === 'string' ? parseFloat(body.lat) : body.lat
  const inputLng = typeof body.lng === 'string' ? parseFloat(body.lng) : body.lng
  const inputLat2 = isFiniteNumber(inputLat) ? inputLat : undefined
  const inputLng2 = isFiniteNumber(inputLng) ? inputLng : undefined
  const inputName = isNonEmptyString(body.name) ? body.name.trim() : undefined
  const inputJuristicId = isNonEmptyString(body.juristicId)
    ? extractJuristicId(body.juristicId.trim()) ?? undefined
    : undefined
  const inputWebsite = isNonEmptyString(body.website) ? body.website.trim() : undefined

  if (!propertyId && inputLat2 === undefined && !inputName && !inputJuristicId && !inputWebsite) {
    return Response.json(
      { ok: false, error: 'Provide at least one of: propertyId, lat+lng, name, juristicId, website' },
      { status: 400 },
    )
  }

  // The pipeline requires a propertyId to persist results. When none is
  // provided we still run all discovery stages (1–7) and return results,
  // but stage 8 (persist) will be skipped — this matches the original behaviour.
  const result = await runFindContactPipeline({
    propertyId: propertyId ?? '',
    lat: inputLat2,
    lng: inputLng2,
    name: inputName,
    juristicId: inputJuristicId,
    website: inputWebsite,
    callerName: 'admin-find-contact',
  })

  const response: FindContactResponse = {
    ok: true,
    company: result.company,
    decision_maker: result.decision_maker,
    confidence: result.confidence,
    sources: result.sources,
    stages: result.stages,
    saved: result.saved,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
