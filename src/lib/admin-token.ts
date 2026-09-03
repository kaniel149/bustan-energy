import { supabase } from './supabase'
import { bustanSupabase } from './bustan-supabase'

/**
 * Access token for the /api/admin-* endpoints (they verify the Bearer token
 * against the main Supabase project). Prefers the main-project session; falls
 * back to the bustan-project session, which the platform page signs into.
 */
export async function getAdminToken(): Promise<string | null> {
  const main = await supabase?.auth.getSession()
  const t = main?.data.session?.access_token
  if (t) return t
  const b = await bustanSupabase?.auth.getSession()
  return b?.data.session?.access_token ?? null
}
