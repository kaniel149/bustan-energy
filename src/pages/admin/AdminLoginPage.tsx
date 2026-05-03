import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
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
      <div className="h-screen bg-[#F4EAD8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#006F6B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4 text-[#27342F]"
      style={{
        backgroundColor: '#F4EAD8',
        backgroundImage: 'linear-gradient(140deg, rgba(216,236,232,0.72), transparent 42%), linear-gradient(25deg, rgba(242,184,75,0.2), transparent 48%)',
      }}
    >
      <Helmet>
        <title>Bustan Energy Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Helmet>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/assets/logo/bustan-energy.svg"
            alt="Bustan Energy"
            className="h-12 mx-auto mb-4 object-contain"
          />
          <h1 className="text-xl font-bold text-[#27342F]">פאנל ניהול הצעות</h1>
          <p className="text-sm text-[#27342F]/55 mt-1">Bustan Energy Admin</p>
        </div>

        {/* Card */}
        <div className="bg-[#FFF4E2]/90 backdrop-blur-xl border border-[#24463E]/15 rounded-2xl p-8 shadow-[0_24px_70px_rgba(39,52,47,0.18)]">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#D8ECE8] border border-[#006F6B]/20 flex items-center justify-center mb-4">
                <Mail size={20} className="text-[#006F6B]" />
              </div>
              <h2 className="text-[#27342F] font-semibold mb-2">לינק נשלח!</h2>
              <p className="text-[#27342F]/55 text-sm leading-relaxed">
                לינק להתחברות נשלח לאימייל
                <br />
                <span className="text-[#27342F]/75">{email}</span>
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="mt-6 text-xs text-[#27342F]/45 hover:text-[#27342F]/70 transition-colors"
              >
                שלח שוב
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label className="block text-[11px] text-[#27342F]/55 uppercase tracking-wider mb-1.5">
                  אימייל
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bustan.energy"
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#24463E]/15 text-sm text-[#27342F] placeholder:text-[#27342F]/35 focus:outline-none focus:border-[#006F6B]/60 transition-colors text-left"
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
                className="w-full py-2.5 rounded-xl bg-[#006F6B] text-white font-semibold text-sm hover:bg-[#008F8A] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

        <p className="text-center text-xs text-[#27342F]/45 mt-6">
          גישה לעובדי Bustan Energy בלבד
        </p>
      </div>
    </div>
  )
}
