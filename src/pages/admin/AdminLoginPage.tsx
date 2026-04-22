import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Loader2 } from 'lucide-react'
import { signInWithEmail, getSession, isAdmin } from '../../lib/admin-auth'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)

  // Redirect if already logged in as admin
  useEffect(() => {
    getSession().then((session) => {
      if (session?.user && isAdmin(session.user.email)) {
        navigate('/admin', { replace: true })
      }
      setChecking(false)
    })
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await signInWithEmail(email.trim().toLowerCase())
    if (authError) {
      setError(authError)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#0D1117] flex items-center justify-center p-4"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 60% 0%, rgba(232,168,32,0.07) 0%, transparent 60%)',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/assets/logo/tm-energy.png"
            alt="TM Energy"
            className="h-12 mx-auto mb-4 object-contain"
          />
          <h1 className="text-xl font-bold text-white">פאנל ניהול הצעות</h1>
          <p className="text-sm text-white/40 mt-1">TM Energy Admin</p>
        </div>

        {/* Card */}
        <div className="bg-[#0D2137]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Mail size={20} className="text-emerald-400" />
              </div>
              <h2 className="text-white font-semibold mb-2">לינק נשלח!</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                לינק להתחברות נשלח לאימייל
                <br />
                <span className="text-white/60">{email}</span>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                שלח שוב
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">
                  אימייל
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@energy-tm.com"
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A820]/50 transition-colors text-left"
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Mail size={16} />
                )}
                שלח לינק התחברות
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          גישה לעובדי TM Energy בלבד
        </p>
      </div>
    </div>
  )
}
