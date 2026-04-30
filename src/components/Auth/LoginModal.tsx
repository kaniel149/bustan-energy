import { useState } from 'react'
import { X, LogIn } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../lib/store'

export function LoginModal() {
  const showLoginModal = useAppStore((s) => s.showLoginModal)
  const setShowLoginModal = useAppStore((s) => s.setShowLoginModal)
  const setUser = useAppStore((s) => s.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!showLoginModal) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setError('CRM not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (data.user) {
          setUser(data.user)
          setShowLoginModal(false)
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
        if (data.user) {
          setUser(data.user)
          setShowLoginModal(false)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D2137] rounded-2xl border border-white/10 w-full max-w-sm p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E8A820] to-[#E85D3A] flex items-center justify-center">
              <LogIn size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">
                {isSignup ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-white/40 text-xs">Solar Intelligence CRM</p>
            </div>
          </div>
          <button
            onClick={() => setShowLoginModal(false)}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8A820]/50 transition-colors"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider mb-1 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8A820]/50 transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-[#E85D3A] text-xs bg-[#E85D3A]/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium text-sm transition-all bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignup ? 'Create Account' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => { setIsSignup(!isSignup); setError('') }}
            className="w-full text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            {isSignup ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </form>
      </div>
    </div>
  )
}
