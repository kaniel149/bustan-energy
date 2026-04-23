import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus, FileText, Eye, PenLine, RefreshCw } from 'lucide-react'
import { fetchProposals, fetchProposalStats } from '../../lib/admin-service'
import { useAdminStore } from '../../lib/admin-store'
import { STATUS_BADGE } from '../../types/proposals'
import type { ProposalStats } from '../../lib/admin-service'
import AnalyticsSection from '../../components/admin/AnalyticsSection'

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const proposals = useAdminStore((s) => s.proposals)
  const setProposals = useAdminStore((s) => s.setProposals)
  const [stats, setStats] = useState<ProposalStats>({ total: 0, sent: 0, viewed: 0, signed: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    const [allProposals, proposalStats] = await Promise.all([
      fetchProposals(),
      fetchProposalStats(),
    ])
    setProposals(allProposals)
    setStats(proposalStats)
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const recent = proposals.slice(0, 10)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm">טוען נתונים...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1200px] mx-auto pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">דשבורד</h1>
          <p className="text-sm text-white/40 mt-1">סקירת הצעות מחיר</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="רענן"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/admin/proposals/new')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity min-h-[40px]"
          >
            <FilePlus size={16} />
            <span className="hidden sm:inline">הצעה חדשה</span>
            <span className="sm:hidden">חדש</span>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="סה״כ הצעות" value={stats.total} color="#E8A820" />
        <StatCard icon={FilePlus} label="נשלח (לא נצפה)" value={stats.sent} color="#60A5FA" />
        <StatCard icon={Eye} label="נצפה" value={stats.viewed} color="#FBBF24" />
        <StatCard icon={PenLine} label="חתום" value={stats.signed} color="#34D399" />
      </div>

      {/* Analytics section */}
      <AnalyticsSection />

      {/* Recent proposals */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">הצעות אחרונות</h2>
          <button
            onClick={() => navigate('/admin/proposals')}
            className="text-xs text-[#E8A820] hover:text-[#E8A820]/80 transition-colors"
          >
            הצג הכל
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white/40 text-sm mb-4">אין הצעות עדיין</p>
            <button
              onClick={() => navigate('/admin/proposals/new')}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              צור הצעה ראשונה
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recent.map((p) => {
              const badge = STATUS_BADGE[p.status]
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/proposals/${p.ref_number}`)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-right"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {p.client_name ?? '—'}
                      </span>
                      <span className="text-xs text-white/30 font-mono">{p.ref_number}</span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5 truncate">
                      {p.location ?? '—'} ·{' '}
                      {p.total_price_thb
                        ? `฿${p.total_price_thb.toLocaleString()}`
                        : '—'}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0"
                    style={{ color: badge.color, backgroundColor: badge.bg }}
                  >
                    {badge.label}
                  </span>
                  <span className="text-xs text-white/30 shrink-0 hidden sm:block">
                    {new Date(p.created_at).toLocaleDateString('he-IL')}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
