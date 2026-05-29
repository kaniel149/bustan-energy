import { createClient } from '@supabase/supabase-js'

/**
 * Dedicated Supabase client for the Bustan CRM / Solar Intelligence data.
 *
 * Project: solar-os-saas (ygoiaabzkuvdsyyduvhv), dedicated schema `bustan`.
 * This is SEPARATE from the TM Energy client in `./supabase.ts`
 * (proposal/admin system, project trvgpgpsqvvdsudpgwpm) — do not merge them.
 *
 * The publishable key is client-safe: all access is governed by RLS, and a DB
 * trigger creates `bustan.app_users(role)` on signup (k@kanielt.com → admin).
 */

// Public-safe defaults (overridable via env). The publishable key only grants
// what RLS allows, so embedding it in the client bundle is intentional.
const BUSTAN_URL =
  import.meta.env.VITE_BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
const BUSTAN_KEY =
  import.meta.env.VITE_BUSTAN_SUPABASE_ANON_KEY ||
  'sb_publishable_quT-YbfstKzcupmu0StY2g_7ug7jvLN'

export const bustanSupabase =
  BUSTAN_URL && BUSTAN_KEY
    ? createClient(BUSTAN_URL, BUSTAN_KEY, {
        db: { schema: 'bustan' },
        auth: {
          // Isolate the Bustan auth session from the TM Energy client so the
          // two clients never clobber each other's tokens in localStorage.
          storageKey: 'bustan-crm-auth',
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null

export function isBustanConnected(): boolean {
  return bustanSupabase !== null
}
