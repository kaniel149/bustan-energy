// Bearer <main-project user JWT> → admin email or null (edge-safe).
// Extracted from admin-stats.ts so every admin endpoint shares one gate.
import { isAllowedAdmin } from './admin-access.js'

export async function verifyAdminRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${auth.slice(7)}` },
  })
  if (!r.ok) return null
  const email = ((await r.json()) as { email?: string })?.email?.toLowerCase()
  return email && isAllowedAdmin(email) ? email : null
}
