import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Plus, Search, RefreshCw, X, Filter, ChevronDown } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { getCrmProjects, createLead, updateProjectStatus, filterProjects, getStatusGateBlockers } from '../../lib/crm-service'
import { CRM_STATUSES, LEAD_SOURCES, BUSINESS_TYPES, DEFAULT_FILTERS } from '../../types/crm'
import type { CrmProject, CrmProjectInsert, PipelineFilters } from '../../types/crm'
import { PipelineColumn } from './PipelineColumn'
import { LeadCard } from './LeadCard'

export default function Pipeline() {
  const crmProjects = useAppStore((s) => s.crmProjects)
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)
  const crmLoading = useAppStore((s) => s.crmLoading)

  const [filters, setFilters] = useState<PipelineFilters>({ ...DEFAULT_FILTERS })
  const [showFilters, setShowFilters] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showNewLead, setShowNewLead] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Filtered projects
  const filtered = useMemo(
    () => filterProjects(crmProjects, filters),
    [crmProjects, filters]
  )

  // Group by status
  const byStatus = useMemo(() => {
    const groups: Record<string, CrmProject[]> = {}
    for (const status of CRM_STATUSES) {
      groups[status.id] = []
    }
    for (const p of filtered) {
      if (groups[p.status]) groups[p.status].push(p)
    }
    return groups
  }, [filtered])

  // Active filters count
  const activeFilterCount = [
    filters.priority !== 'all',
    filters.source !== 'all',
    filters.businessType !== 'all',
    filters.dateRange !== 'all',
  ].filter(Boolean).length

  const draggedProject = activeId
    ? crmProjects.find((p) => p.id === activeId) ?? null
    : null

  const handleRefresh = async () => {
    setRefreshing(true)
    const projects = await getCrmProjects()
    setCrmProjects(projects)
    setRefreshing(false)
  }

  const handleNewLead = async (data: CrmProjectInsert) => {
    await createLead(data)
    setShowNewLead(false)
    await handleRefresh()
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const projectId = active.id as string
    const targetStatus = over.id as string
    const project = crmProjects.find((p) => p.id === projectId)
    const statusInfo = CRM_STATUSES.find((s) => s.id === targetStatus)
    if (!project || !statusInfo || project.status === targetStatus) return

    const originalProjects = [...crmProjects]
    const updated = crmProjects.map((p) =>
      p.id === projectId ? { ...p, status: statusInfo.id, step_number: statusInfo.step } : p
    )
    setCrmProjects(updated as CrmProject[])

    try {
      const blockers = await getStatusGateBlockers(projectId, statusInfo.id)
      if (blockers.length) {
        setCrmProjects(originalProjects)
        window.alert(`Cannot move forward yet:\n\n${blockers.slice(0, 6).join('\n')}`)
        return
      }
      const success = await updateProjectStatus(projectId, statusInfo.id, statusInfo.step)
      if (!success) setCrmProjects(originalProjects)
    } catch {
      setCrmProjects(originalProjects)
    }
  }

  const clearFilters = () => setFilters({ ...DEFAULT_FILTERS })

  if (crmLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-4 flex-wrap">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Pipeline</h1>
          <p className="text-xs text-white/40 mt-0.5">
            {filtered.length} of {crmProjects.length} projects
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search leads..."
            className="w-[180px] lg:w-[220px] pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ ...filters, search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
            showFilters || activeFilterCount > 0
              ? 'bg-[#6366F1]/10 border-[#6366F1]/30 text-[#6366F1]'
              : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
          }`}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={handleRefresh}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={() => setShowNewLead(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          New Lead
        </button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="px-6 py-3 border-b border-white/10 bg-white/[0.02] flex items-center gap-3 flex-wrap">
          <FilterSelect
            label="Priority"
            value={filters.priority}
            onChange={(v) => setFilters({ ...filters, priority: v as PipelineFilters['priority'] })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'normal', label: 'Normal' },
              { value: 'low', label: 'Low' },
            ]}
          />
          <FilterSelect
            label="Source"
            value={filters.source}
            onChange={(v) => setFilters({ ...filters, source: v })}
            options={[
              { value: 'all', label: 'All Sources' },
              ...LEAD_SOURCES.map((s) => ({ value: s.id, label: `${s.icon} ${s.label}` })),
            ]}
          />
          <FilterSelect
            label="Business"
            value={filters.businessType}
            onChange={(v) => setFilters({ ...filters, businessType: v })}
            options={[
              { value: 'all', label: 'All Types' },
              ...BUSINESS_TYPES.map((b) => ({ value: b.id, label: b.label })),
            ]}
          />
          <FilterSelect
            label="Period"
            value={filters.dateRange}
            onChange={(v) => setFilters({ ...filters, dateRange: v as PipelineFilters['dateRange'] })}
            options={[
              { value: 'all', label: 'All Time' },
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
          />

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#E85D3A] hover:text-[#E85D3A]/80 ml-2"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Kanban columns with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 p-4 h-full min-w-min">
            {CRM_STATUSES.map((status) => (
              <PipelineColumn
                key={status.id}
                status={status}
                projects={byStatus[status.id] || []}
                isActive={activeId !== null}
              />
            ))}
          </div>
        </div>

        {/* Drag overlay — shows floating card */}
        <DragOverlay>
          {draggedProject ? (
            <div className="opacity-90 rotate-2 scale-105">
              <LeadCard project={draggedProject} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* New Lead Modal */}
      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          onSubmit={handleNewLead}
        />
      )}
    </div>
  )
}

// ── Filter Select ──
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <label className="block text-[9px] text-white/30 uppercase tracking-wider mb-0.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-[140px] px-2.5 py-1.5 pr-7 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/20 [&>option]:bg-[#0D2137]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
      </div>
    </div>
  )
}

// ── New Lead Modal (Thailand-adapted) ──
function NewLeadModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: CrmProjectInsert) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [lineId, setLineId] = useState('')
  const [address, setAddress] = useState('')
  const [source, setSource] = useState('manual')
  const [priority, setPriority] = useState('normal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        client_name: name.trim(),
        business_type: businessType || undefined,
        client_phone: phone || undefined,
        client_email: email || undefined,
        client_line_id: lineId || undefined,
        property_address: address || undefined,
        source,
        status: 'lead',
        step_number: 1,
        priority: priority as CrmProjectInsert['priority'],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0D2137] border border-white/10 rounded-2xl w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">New Lead</h2>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field
            label="Business / Client Name *"
            value={name}
            onChange={setName}
            placeholder="e.g. Coconut Beach Resort"
          />

          {/* Business Type dropdown */}
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">
              Business Type
            </label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/20 [&>option]:bg-[#0D2137]"
            >
              <option value="">Select type...</option>
              {BUSINESS_TYPES.map((b) => (
                <option key={b.id} value={b.id}>{b.label} — {b.labelTh}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="+66 77 428 999"
            />
            <Field
              label="LINE ID"
              value={lineId}
              onChange={setLineId}
              placeholder="@lineid"
            />
          </div>

          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="contact@business.com"
          />

          <Field
            label="Address"
            value={address}
            onChange={setAddress}
            placeholder="123 Moo 5, Koh Phangan"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/20 [&>option]:bg-[#0D2137]"
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/20 [&>option]:bg-[#0D2137]"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Lead'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div>
      <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
      />
    </div>
  )
}
