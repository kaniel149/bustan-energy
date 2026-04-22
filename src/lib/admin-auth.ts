import { supabase } from './supabase'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'

const ADMIN_DOMAIN = '@energy-tm.com'
const ADMIN_EMAIL = 'k@kanielt.com'

export function isAdmin(email?: string): boolean {
  if (!email) return false
  return email.endsWith(ADMIN_DOMAIN) || email === ADMIN_EMAIL
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  // Build absolute redirect URL to our admin landing
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://energy-tm.com'
  const redirectTo = `${origin}/admin`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}

export function onAuthChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}
