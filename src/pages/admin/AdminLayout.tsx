import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FilePlus, FileText, LogOut, Menu, X, Package, ShoppingCart, FileCheck, Tags } from 'lucide-react'
import { onAuthChange, signOut, isAdmin } from '../../lib/admin-auth'
import { useAdminStore } from '../../lib/admin-store'
import { AdminToast } from '../../components/admin/AdminToast'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'דשבורד', end: true },
  { to: '/admin/proposals/new', icon: FilePlus, label: 'הצעה חדשה', end: false },
  { to: '/admin/proposals', icon: FileText, label: 'כל ההצעות', end: true },
  { to: '/admin/bom', icon: Package, label: 'BOM חדש', end: true, internal: true },
  { to: '/admin/procurement', icon: ShoppingCart, label: 'הזמנות רכש', end: true, internal: true },
  { to: '/admin/suppliers', icon: Tags, label: 'ספקים ומחירים', end: true, internal: true },
  { to: '/admin/pea', icon: FileCheck, label: 'תכניות PEA', end: true, internal: true },
]

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#0D1117] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const setAdminUser = useAdminStore((s) => s.setAdminUser)
  const adminUser = useAdminStore((s) => s.adminUser)
  const [authChecked, setAuthChecked] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthChange((_event, session) => {
      const user: User | null = session?.user ?? null
      setAdminUser(user)

      if (!user || !isAdmin(user.email)) {
        navigate('/admin/login', { replace: true })
      }
      setAuthChecked(true)
    })

    return unsubscribe
  }, [navigate, setAdminUser])

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  if (!authChecked) return <LoadingScreen />

  const userInitial = adminUser?.email?.[0]?.toUpperCase() ?? '?'
  const userEmail = adminUser?.email ?? ''

  return (
    <div dir="rtl" className="h-screen w-screen flex bg-[#0D1117] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 right-0 z-40 lg:z-auto
          w-[220px] border-l border-white/10 bg-[#0A1929]/90 backdrop-blur-xl
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/assets/logo/tm-energy.png"
              alt="TM Energy"
              className="h-7 object-contain"
            />
            <span className="text-xs font-semibold text-white/60">Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1" aria-label="ניווט ראשי">
          {NAV_ITEMS.filter((i) => !('internal' in i) || !i.internal).map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-[#E8A820]/10 text-[#E8A820] font-medium border border-[#E8A820]/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {/* Internal-only section divider + items */}
          <div className="pt-4 mt-4 border-t border-white/5">
            <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.15em] text-white/30 flex items-center gap-1.5">
              <span>🔒</span> כלים פנימיים
            </p>
            {NAV_ITEMS.filter((i) => 'internal' in i && i.internal).map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-300 font-medium border border-emerald-500/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`
                }
                title="כלי פנימי — לא מוצג ללקוח"
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-7 h-7 rounded-full bg-[#E8A820]/20 flex items-center justify-center text-[11px] text-[#E8A820] font-bold shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/60 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 text-white/30 hover:text-white/60 transition-colors"
              title="התנתקות"
              aria-label="התנתקות"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0A1929]/80 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="פתח תפריט"
          >
            <Menu size={20} />
          </button>
          <img src="/assets/logo/tm-energy.png" alt="TM Energy" className="h-6 object-contain" />
          <button
            onClick={handleSignOut}
            className="text-white/30 hover:text-white/60 transition-colors"
            aria-label="התנתקות"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <AdminToast />
    </div>
  )
}
