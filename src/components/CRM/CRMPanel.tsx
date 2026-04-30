import { useCallback, useEffect, useState } from 'react'
import { X, Building2, Phone, Mail, ChevronRight, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { getCrmProjects, updateProjectStatus } from '../../lib/crm-service'
import { CRM_STATUSES } from '../../types/crm'
import type { CrmProject, ProjectStatus } from '../../types/crm'

export function CRMPanel() {
  const showCrmPanel = useAppStore((s) => s.showCrmPanel)
  const setShowCrmPanel = useAppStore((s) => s.setShowCrmPanel)
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)
  const crmProjects = useAppStore((s) => s.crmProjects)
  const user = useAppStore((s) => s.user)

  const [loading, setLoading] = useState(false)
  const [activeStatus, setActiveStatus] = useState<ProjectStatus | 'all'>('all')

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const projects = await getCrmProjects()
    setCrmProjects(projects)
    setLoading(false)
  }, [setCrmProjects])

  useEffect(() => {
    if (!showCrmPanel || !user) return
    queueMicrotask(() => {
      void loadProjects()
    })
  }, [loadProjects, showCrmPanel, user])

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    const statusStep = CRM_STATUSES.find(s => s.id === newStatus)?.step ?? 1
    await updateProjectStatus(projectId, newStatus, statusStep)
    await loadProjects()
  }

  if (!showCrmPanel) return null

  const filtered = activeStatus === 'all'
    ? crmProjects
    : crmProjects.filter((p) => p.status === activeStatus)

  // Count by status
  const statusCounts: Record<string, number> = {}
  for (const p of crmProjects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[420px] z-30 bg-[#0A1929]/95 backdrop-blur-xl border-l border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6366f1]/20 flex items-center justify-center">
            <Building2 size={16} className="text-[#6366f1]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">CRM Pipeline</h2>
            <p className="text-[10px] text-white/40">{crmProjects.length} projects</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProjects}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCrmPanel(false)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="p-3 border-b border-white/10 flex flex-wrap gap-1.5">
        <StatusTab
          label="All"
          count={crmProjects.length}
          color="#fff"
          active={activeStatus === 'all'}
          onClick={() => setActiveStatus('all')}
        />
        {CRM_STATUSES.filter((s) => s.id !== 'om').map((s) => (
          <StatusTab
            key={s.id}
            label={s.labelShort}
            count={statusCounts[s.id] || 0}
            color={s.color}
            active={activeStatus === s.id}
            onClick={() => setActiveStatus(s.id)}
          />
        ))}
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {loading ? (
          <div className="text-white/40 text-xs text-center py-8">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="text-white/40 text-xs text-center py-8">
            {user ? 'No projects found' : 'Sign in to view CRM'}
          </div>
        ) : (
          filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </div>
    </div>
  )
}

function StatusTab({
  label, count, color, active, onClick,
}: {
  label: string; count: number; color: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-[10px] font-medium transition-all border ${
        active
          ? 'border-opacity-40'
          : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-60 hover:opacity-100'
      }`}
      style={active ? {
        backgroundColor: `${color}15`,
        color,
        borderColor: `${color}44`,
      } : undefined}
    >
      {label}
      {count > 0 && <span className="ml-1 opacity-60">{count}</span>}
    </button>
  )
}

function ProjectCard({
  project, onStatusChange,
}: {
  project: CrmProject
  onStatusChange: (id: string, status: ProjectStatus) => void
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const statusInfo = CRM_STATUSES.find((s) => s.id === project.status)

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-3 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{project.client_name}</h3>
          {project.property_address && (
            <p className="text-[10px] text-white/40 truncate">{project.property_address}</p>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
            style={{
              backgroundColor: `${statusInfo?.color}20`,
              color: statusInfo?.color,
              border: `1px solid ${statusInfo?.color}33`,
            }}
          >
            {statusInfo?.labelShort}
            <ChevronRight size={10} className={`transition-transform ${showStatusMenu ? 'rotate-90' : ''}`} />
          </button>
          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-[#0D2137] border border-white/10 rounded-lg py-1 z-20 min-w-[140px] shadow-xl">
                {CRM_STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onStatusChange(project.id, s.id)
                      setShowStatusMenu(false)
                    }}
                    className={`w-full px-3 py-1.5 text-left text-[11px] hover:bg-white/5 flex items-center gap-2 ${
                      project.status === s.id ? 'font-bold' : ''
                    }`}
                    style={{ color: s.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.labelShort}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-white/50">
        {project.system_size_kwp && (
          <span>{project.system_size_kwp} kWp</span>
        )}
        {project.panel_count && (
          <span>{project.panel_count} panels</span>
        )}
        {project.client_phone && (
          <a href={`tel:${project.client_phone}`} className="flex items-center gap-0.5 hover:text-[#2ED89A]">
            <Phone size={9} /> {project.client_phone}
          </a>
        )}
        {project.client_email && (
          <a href={`mailto:${project.client_email}`} className="flex items-center gap-0.5 hover:text-[#2ED89A]">
            <Mail size={9} />
          </a>
        )}
        {project.client_line_id && (
          <span className="text-[#00C300]">LINE</span>
        )}
      </div>

      {project.priority === 'urgent' || project.priority === 'high' ? (
        <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E85D3A]/20 text-[#E85D3A] border border-[#E85D3A]/30">
          {project.priority.toUpperCase()}
        </span>
      ) : null}
    </div>
  )
}
