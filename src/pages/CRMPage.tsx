import { useState, useEffect } from 'react'
import { useAppStore } from '../lib/store'
import { supabase } from '../lib/supabase'
import { signInBustan, signUpBustan } from '../lib/bustan-supabase'
import { getCrmProjects } from '../lib/crm-service'
import { identifyUser, resetAnalytics } from '../lib/analytics'
import CRMLayout from '../components/CRM/CRMLayout'

function CRMLoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setError('')
    setLoading(true)

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    // Mirror creds into the bustan client so CRM data + role load.
    if (isSignUp) await signUpBustan(email, password)
    else await signInBustan(email, password)
    // Auth listener in useEffect will pick up the session
  }

  return (
    <div className="h-screen w-screen bg-[#0D1117] flex items-center justify-center">
      <div className="w-[380px] bg-[#0D2137]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#E8A820] to-[#E85D3A] flex items-center justify-center text-xl mb-3">⚡</div>
          <h1 className="text-xl font-bold text-white">Bustan Energy CRM</h1>
          <p className="text-white/40 text-sm mt-1">{isSignUp ? 'Create account' : 'Sign in to continue'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A820]/50"
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A820]/50"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          className="w-full mt-4 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}

export default function CRMPage() {
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)
  const setCrmLoading = useAppStore((s) => s.setCrmLoading)

  // Auth listener — onAuthStateChange fires INITIAL_SESSION immediately, no need for getSession()
  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        identifyUser(u.id, { email: u.email })
      } else {
        resetAnalytics()
      }
    })
    return () => subscription.unsubscribe()
  }, [setUser])

  // Load CRM data when authenticated
  useEffect(() => {
    if (!user) return
    setCrmLoading(true)
    getCrmProjects()
      .then(setCrmProjects)
      .finally(() => setCrmLoading(false))
  }, [user, setCrmProjects, setCrmLoading])

  if (!user) {
    return <CRMLoginScreen />
  }

  return <CRMLayout />
}
