import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, FileText, LayoutDashboard } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { getCrmProjects } from '../../lib/crm-service'
import { KPICards } from './KPICards'
import { PipelineFunnel } from './PipelineFunnel'
import { ActivityFeed } from './ActivityFeed'
import type { CrmStats } from '../../types/crm'

export default function Dashboard() {
  const crmProjects = useAppStore((s) => s.crmProjects)
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)
  const crmLoading = useAppStore((s) => s.crmLoading)
  const navigate = useNavigate()

  const [refreshing, setRefreshing] = useState(false)

  const stats = useMemo<CrmStats>(() => {
    const byStatus: Record<string, number> = {}
    let totalKwp = 0
    let totalDealValue = 0
    let urgentCount = 0
    let contractOrBeyond = 0

    for (const p of crmProjects) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
      totalKwp += p.system_size_kwp || 0
      totalDealValue += p.deal_value || 0
      if (p.priority === 'urgent' || p.priority === 'high') urgentCount++
      if (p.step_number >= 4) contractOrBeyond++
    }

    return {
      total: crmProjects.length,
      byStatus,
      totalKwp,
      totalDealValue,
      conversionRate: crmProjects.length > 0 ? contractOrBeyond / crmProjects.length : 0,
      urgentCount,
    }
  }, [crmProjects])

  const handleRefresh = async () => {
    setRefreshing(true)
    const projects = await getCrmProjects()
    setCrmProjects(projects)
    setRefreshing(false)
  }

  if (crmLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm">Loading CRM...</span>
        </div>
      </div>
    )
  }

  if (!crmLoading && crmProjects.length === 0) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-white/40 mt-1">Welcome to TM Energy CRM</p>
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#E8A820]/20 to-[#E85D3A]/20 flex items-center justify-center mb-4">
            <Plus size={24} className="text-[#E8A820]" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No projects yet</h2>
          <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
            Start by adding your first lead from the scanner map or create one manually.
          </p>
          <button
            onClick={() => navigate('/crm/pipeline')}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Go to Pipeline
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">{crmProjects.length} projects in pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all font-semibold text-sm"
            title="Proposals Admin"
          >
            <LayoutDashboard size={16} />
            Proposals
          </button>
          <button
            onClick={() => navigate('/admin/proposals/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A7A5A] text-white font-semibold text-sm hover:bg-[#11604B] transition-all"
          >
            <FileText size={16} />
            New Proposal
          </button>
          <button
            onClick={() => navigate('/crm/pipeline')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            New Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards stats={stats} />

      {/* Main content: Funnel + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="col-span-3">
          <PipelineFunnel stats={stats} />
        </div>
        <div className="col-span-2">
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}
