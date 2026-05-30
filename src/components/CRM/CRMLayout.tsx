import { NavLink, Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, GitBranch, LogOut, Map } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { signOutBustan } from '../../lib/bustan-supabase'

const NAV_ITEMS = [
  { to: '/crm', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/crm/pipeline', icon: GitBranch, label: 'Pipeline', end: false },
]

export default function CRMLayout() {
  const user = useAppStore((s) => s.user)

  const handleSignOut = async () => {
    await supabase?.auth.signOut()
    await signOutBustan()
  }

  return (
    <div className="h-screen w-screen flex bg-[#0D1117]">
      {/* Sidebar */}
      <aside className="w-[220px] border-r border-white/10 bg-[#0A1929]/80 backdrop-blur-xl flex flex-col">
        {/* Brand */}
        <div className="p-4 border-b border-white/10">
          <h1 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E8A820] to-[#E85D3A] flex items-center justify-center text-[11px]">⚡</span>
            Bustan Energy CRM
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Scanner Link */}
        <div className="p-3 border-t border-white/10">
          <Link
            to="/platform"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <Map size={16} />
            Scanner Map
          </Link>
        </div>

        {/* User */}
        {user && (
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-3 px-2">
              <div className="w-7 h-7 rounded-full bg-[#6366F1]/20 flex items-center justify-center text-[11px] text-[#6366F1] font-bold">
                {user.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/70 truncate">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1 text-white/30 hover:text-white/60 transition-colors"
                title="Sign out"
              >
                <LogOut size={12} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
