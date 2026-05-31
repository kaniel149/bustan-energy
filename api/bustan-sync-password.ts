// ============================================================
// POST /api/bustan-sync-password
//
// Self-heal endpoint: when the bustan project password has
// drifted from the main project password, this route:
//   1. Verifies the password is valid for the MAIN project
//      (server-side sign-in — proves caller knows it).
//   2. Uses the BUSTAN service-role key to force-reset the
//      bustan user's password to match.
//
// The password is consumed in-memory only and never logged,
// echoed in responses, or stored.
// ============================================================

import { createClient } from '@supabase/supabase-js'

// Node runtime: we need @supabase/supabase-js auth.admin.*
export const config = { runtime: 'nodejs' }

const MAIN_URL = process.env.SUPABASE_URL
const MAIN_ANON = process.env.VITE_SUPABASE_ANON_KEY
const BUSTAN_URL = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const BUSTAN_SERVICE_KEY = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 })
  }

  // Guard: bustan admin client cannot be constructed without the service key
  if (!BUSTAN_SERVICE_KEY) {
    return Response.json({ error: 'bustan_admin_unconfigured' }, { status: 500 })
  }

  // Guard: main project must be configured
  if (!MAIN_URL || !MAIN_ANON) {
    return Response.json({ error: 'main_project_unconfigured' }, { status: 500 })
  }

  let body: { email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { email, password } = body

  // Input validation
  if (typeof email !== 'string' || !email.includes('@')) {
    return Response.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (typeof password !== 'string' || password.length < 6) {
    return Response.json({ error: 'invalid_password' }, { status: 400 })
  }

  // Step 1: Verify the password against the MAIN project (anon client, no admin perms)
  // This proves the caller actually knows the real current password.
  const mainClient = createClient(MAIN_URL, MAIN_ANON, {
    auth: { persistSession: false },
  })
  const { error: mainAuthError } = await mainClient.auth.signInWithPassword({ email, password })
  if (mainAuthError) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  // Step 2: Use the bustan service-role admin client to update the bustan user's password
  const bustanAdmin = createClient(BUSTAN_URL, BUSTAN_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Find the bustan user by email via paginated listUsers
  let bustanUserId: string | null = null
  {
    let page = 1
    const perPage = 100
    outer: while (true) {
      const { data: listData, error: listError } = await bustanAdmin.auth.admin.listUsers({
        page,
        perPage,
      })
      if (listError || !listData?.users?.length) break
      for (const u of listData.users) {
        if (u.email?.toLowerCase() === email.toLowerCase()) {
          bustanUserId = u.id
          break outer
        }
      }
      if (listData.users.length < perPage) break
      page++
    }
  }

  if (!bustanUserId) {
    // User does not exist in bustan yet — create them so first-timers work
    const { data: created, error: createError } = await bustanAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created?.user) {
      return Response.json({ error: 'bustan_create_failed' }, { status: 500 })
    }
    // Password already set on creation; done.
    return Response.json({ ok: true, action: 'created' })
  }

  // Update existing bustan user's password
  const { error: updateError } = await bustanAdmin.auth.admin.updateUser(bustanUserId, {
    password,
  })
  if (updateError) {
    return Response.json({ error: 'bustan_update_failed' }, { status: 500 })
  }

  return Response.json({ ok: true, action: 'updated' })
}
