/**
 * Role-based permissions for the Bustan CRM.
 *
 * Roles live in `bustan.app_users.role` (a DB trigger creates the row on signup;
 * k@kanielt.com → admin). RLS is the real enforcement boundary on the server;
 * these helpers gate the UI so users don't see actions they can't perform.
 *
 *   admin    → everything
 *   sales    → CRM (stage/assign/edit) + quoting
 *   engineer → site survey + O&M
 *   viewer   → read-only
 */
import { bustanSupabase } from './bustan-supabase'

export type Role = 'admin' | 'sales' | 'engineer' | 'viewer'

export type Action =
  | 'crm.edit' // change stage, priority, next action, reassign
  | 'crm.quote' // build quote / BOM
  | 'survey.edit' // site survey workflow
  | 'om.edit' // O&M monitoring block
  | 'read'

const MATRIX: Record<Role, Action[]> = {
  admin: ['crm.edit', 'crm.quote', 'survey.edit', 'om.edit', 'read'],
  sales: ['crm.edit', 'crm.quote', 'read'],
  engineer: ['survey.edit', 'om.edit', 'read'],
  viewer: ['read'],
}

/** Can a given role perform an action? Unknown role → most restrictive (read-only). */
export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return action === 'read'
  const allowed = MATRIX[role]
  return allowed ? allowed.includes(action) : action === 'read'
}

export function isValidRole(value: unknown): value is Role {
  return value === 'admin' || value === 'sales' || value === 'engineer' || value === 'viewer'
}

/**
 * Fetch the current authenticated user's role from `bustan.app_users`.
 * Returns 'viewer' as a safe default if unauthenticated, unconfigured, or no
 * row exists yet (RLS will still block any write the role can't perform).
 */
export async function fetchCurrentRole(): Promise<Role> {
  if (!bustanSupabase) return 'viewer'
  const { data: auth } = await bustanSupabase.auth.getUser()
  const uid = auth?.user?.id
  if (!uid) return 'viewer'
  const { data, error } = await bustanSupabase
    .from('app_users')
    .select('role')
    .eq('id', uid)
    .maybeSingle()
  if (error || !data) return 'viewer'
  return isValidRole(data.role) ? data.role : 'viewer'
}
