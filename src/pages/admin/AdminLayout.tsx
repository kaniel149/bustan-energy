import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
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
    <div className="h-screen bg-[#F4EAD8] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#006F6B] border-t-transparent rounded-full animate-spin" />
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
    <div dir="rtl" className="h-screen w-screen flex bg-[#F4EAD8] overflow-hidden">
      <Helmet>
        <title>Bustan Energy Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Helmet>
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
          w-[220px] border-l border-[#FFF4E2]/10 bg-[#24463E] backdrop-blur-xl
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="p-4 border-b border-[#FFF4E2]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/assets/logo/bustan-energy.svg"
              alt="Bustan Energy"
              className="h-7 object-contain"
            />
            <span className="text-xs font-semibold text-[#FFF4E2]/70">Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#FFF4E2]/45 hover:text-[#FFF4E2] hover:bg-white/5 transition-colors"
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
                    ? 'bg-[#FFF4E2]/12 text-[#F2B84B] font-medium border border-[#F2B84B]/24'
                    : 'text-[#FFF4E2]/58 hover:text-[#FFF4E2] hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {/* Internal-only section divider + items */}
          <div className="pt-4 mt-4 border-t border-[#FFF4E2]/10">
            <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.15em] text-[#FFF4E2]/42 flex items-center gap-1.5">
              <span aria-hidden="true">•</span> כלים פנימיים
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
                      ? 'bg-[#D8ECE8]/12 text-[#D8ECE8] font-medium border border-[#D8ECE8]/22'
                      : 'text-[#FFF4E2]/58 hover:text-[#FFF4E2] hover:bg-white/5'
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
        <div className="p-3 border-t border-[#FFF4E2]/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-7 h-7 rounded-full bg-[#F2B84B]/18 flex items-center justify-center text-[11px] text-[#F2B84B] font-bold shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[#FFF4E2]/68 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 text-[#FFF4E2]/45 hover:text-[#FFF4E2]/75 transition-colors"
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
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#24463E]/15 bg-[#FFF4E2]/88 backdrop-blur-xl shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-[#27342F]/60 hover:text-[#27342F] hover:bg-[#D8ECE8] transition-colors"
            aria-label="פתח תפריט"
          >
            <Menu size={20} />
          </button>
          <img src="/assets/logo/bustan-energy.svg" alt="Bustan Energy" className="h-6 object-contain" />
          <button
            onClick={handleSignOut}
            className="text-[#27342F]/50 hover:text-[#27342F]/75 transition-colors"
            aria-label="התנתקות"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Page content */}
        <main className="bustan-admin-main flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <AdminToast />
    </div>
  )
}
