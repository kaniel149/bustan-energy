import { supabase } from './supabase'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'

// Old @energy-tm.com addresses kept until Stage 4 of the Bustan rebrand
const DEFAULT_ADMIN_EMAILS = 'k@kanielt.com,erez@bustan-energy.com,kaniel@bustan-energy.com,erez@energy-tm.com,kaniel@energy-tm.com'

function list(value: string | undefined, fallback = ''): string[] {
  return (value || fallback)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdmin(email?: string): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  const explicitEmails = list(import.meta.env.VITE_ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS)
  const allowedDomains = list(import.meta.env.VITE_ADMIN_EMAIL_DOMAINS)
  return explicitEmails.includes(normalized) || allowedDomains.some((domain) => normalized.endsWith(domain))
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' }

  // Build absolute redirect URL to our admin landing
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://bustan-energy.com'
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
