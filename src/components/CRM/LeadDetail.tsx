import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, ChevronRight, Map, Phone, Mail, MessageCircle,
  Edit3, Save, Sun, DollarSign, Zap, Building2,
  Trash2, ClipboardCheck, FileText
} from 'lucide-react'
import { useAppStore } from '../../lib/store'
import {
  getCrmProject, updateProjectStatus, updateProject,
  getProjectActivity, logActivity, deleteProject, getCrmProjects
} from '../../lib/crm-service'
import { CRM_STATUSES, STATUS_MAP } from '../../types/crm'
import type { CrmProject, CrmProjectInsert, ProjectStatus, ActivityEntry } from '../../types/crm'
import { ActivityTimeline } from './ActivityTimeline'
import { ChecklistPanel } from './ChecklistPanel'

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const crmProjects = useAppStore((s) => s.crmProjects)
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)

  const [project, setProject] = useState<CrmProject | null>(null)
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<CrmProject>>({})
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Load project + activity
  useEffect(() => {
    if (!id) return
    let stale = false
    setLoading(true)

    const fromStore = crmProjects.find((p) => p.id === id)
    if (fromStore) {
      setProject(fromStore)
      setNotes(fromStore.notes || '')
    }

    Promise.all([
      getCrmProject(id),
      getProjectActivity(id),
    ]).then(([p, acts]) => {
      if (stale) return
      if (p) {
        setProject(p)
        setNotes(p.notes || '')
      }
      setActivities(acts)
    }).finally(() => {
      if (!stale) setLoading(false)
    })

    return () => { stale = true }
  }, [id])

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!project) return
    const step = STATUS_MAP[status].step
    await updateProjectStatus(project.id, status, step)
    setProject({ ...project, status, step_number: step })
    setShowStatusMenu(false)
    getProjectActivity(project.id).then(setActivities)
    getCrmProjects().then(setCrmProjects)
  }

  const handleMoveNext = async () => {
    if (!project) return
    const currentIdx = CRM_STATUSES.findIndex((s) => s.id === project.status)
    if (currentIdx < CRM_STATUSES.length - 1) {
      const next = CRM_STATUSES[currentIdx + 1]!
      await handleStatusChange(next.id)
    }
  }

  const handleSaveEdit = async () => {
    if (!project) return
    setSaving(true)
    const editable: Partial<CrmProjectInsert> = {
      client_name: editData.client_name ?? undefined,
      business_type: editData.business_type ?? undefined,
      client_phone: editData.client_phone ?? undefined,
      client_email: editData.client_email ?? undefined,
      client_line_id: editData.client_line_id ?? undefined,
      property_address: editData.property_address ?? undefined,
    }
    const cleaned = Object.fromEntries(
      Object.entries(editable).filter(([, v]) => v !== undefined)
    ) as Partial<CrmProjectInsert>
    await updateProject(project.id, cleaned)
    setProject({ ...project, ...editData } as CrmProject)
    setEditing(false)
    setEditData({})
    setSaving(false)
    getProjectActivity(project.id).then(setActivities)
    getCrmProjects().then(setCrmProjects)
  }

  const handleSaveNotes = async () => {
    if (!project) return
    await updateProject(project.id, { notes })
    await logActivity(project.id, 'note_added', {})
    setProject({ ...project, notes })
    getProjectActivity(project.id).then(setActivities)
  }

  const handleDelete = async () => {
    if (!project || deleting) return
    setDeleting(true)
    const success = await deleteProject(project.id)
    if (!success) {
      setDeleting(false)
      return
    }
    const updated = await getCrmProjects()
    setCrmProjects(updated)
    navigate('/crm/pipeline')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[#E8A820] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-white/40">Lead not found</p>
        <Link to="/crm/pipeline" className="text-[#E8A820] text-sm hover:underline">
          Back to Pipeline
        </Link>
      </div>
    )
  }

  const statusInfo = STATUS_MAP[project.status]
  const currentIdx = CRM_STATUSES.findIndex((s) => s.id === project.status)
  const hasNext = currentIdx < CRM_STATUSES.length - 1
  const nextStatus = hasNext ? CRM_STATUSES[currentIdx + 1] : null

  return (
    <div className="h-full overflow-y-auto">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-[#0D1117]/95 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/crm/pipeline')}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white truncate">{project.client_name}</h1>
          {project.business_type && (
            <p className="text-[11px] text-white/40">{project.business_type}</p>
          )}
        </div>

        {/* Status badge + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors"
            style={{
              backgroundColor: `${statusInfo.color}15`,
              color: statusInfo.color,
              borderColor: `${statusInfo.color}30`,
            }}
          >
            Step {statusInfo.step}: {statusInfo.labelShort}
            <ChevronRight
              size={12}
              className={`transition-transform ${showStatusMenu ? 'rotate-90' : ''}`}
            />
          </button>
          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
              <div className="absolute right-0 top-full mt-2 bg-[#0D2137] border border-white/10 rounded-xl py-1 z-20 min-w-[180px] shadow-2xl">
                {CRM_STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleStatusChange(s.id)}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-white/5 flex items-center gap-2 ${
                      project.status === s.id ? 'font-bold' : ''
                    }`}
                    style={{ color: s.color }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.step}. {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Move Next button */}
        {hasNext && nextStatus && (
          <button
            onClick={handleMoveNext}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#E8A820] to-[#E85D3A] hover:opacity-90 transition-opacity"
          >
            Move to {nextStatus.labelShort}
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Step Progress Bar */}
      <div className="px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-1">
          {CRM_STATUSES.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div
                className={`w-full h-1.5 rounded-full transition-colors ${
                  i < project.step_number ? '' : 'bg-white/10'
                }`}
                style={i < project.step_number ? { backgroundColor: s.color } : undefined}
                title={s.label}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-white/30">Lead</span>
          <span className="text-[9px] text-white/30">O&M</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3/5) */}
        <div className="col-span-3 space-y-5">
          {/* Client Info */}
          <Section
            title="Client Information"
            onEdit={() => {
              setEditing(true)
              setEditData(project)
            }}
          >
            {editing ? (
              <div className="space-y-3">
                <EditField
                  label="Name"
                  value={editData.client_name || ''}
                  onChange={(v) => setEditData({ ...editData, client_name: v })}
                />
                <EditField
                  label="Business Type"
                  value={editData.business_type || ''}
                  onChange={(v) => setEditData({ ...editData, business_type: v })}
                />
                <EditField
                  label="Phone"
                  value={editData.client_phone || ''}
                  onChange={(v) => setEditData({ ...editData, client_phone: v })}
                />
                <EditField
                  label="Email"
                  value={editData.client_email || ''}
                  onChange={(v) => setEditData({ ...editData, client_email: v })}
                />
                <EditField
                  label="LINE ID"
                  value={editData.client_line_id || ''}
                  onChange={(v) => setEditData({ ...editData, client_line_id: v })}
                />
                <EditField
                  label="Address"
                  value={editData.property_address || ''}
                  onChange={(v) => setEditData({ ...editData, property_address: v })}
                />
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-4 py-1.5 rounded-lg bg-[#2ED89A]/20 text-[#2ED89A] text-xs font-semibold hover:bg-[#2ED89A]/30 transition-colors disabled:opacity-50"
                  >
                    <Save size={12} className="inline mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setEditData({})
                    }}
                    className="px-4 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <InfoRow
                  icon={<Building2 size={12} />}
                  label="Business"
                  value={project.business_type || '—'}
                />
                <InfoRow
                  icon={<Phone size={12} />}
                  label="Phone"
                  value={project.client_phone || '—'}
                  href={project.client_phone ? `tel:${project.client_phone}` : undefined}
                />
                <InfoRow
                  icon={<Mail size={12} />}
                  label="Email"
                  value={project.client_email || '—'}
                  href={project.client_email ? `mailto:${project.client_email}` : undefined}
                />
                <InfoRow
                  icon={<MessageCircle size={12} />}
                  label="LINE"
                  value={project.client_line_id || '—'}
                  href={project.client_line_id ? `https://line.me/R/ti/p/${encodeURIComponent(project.client_line_id)}` : undefined}
                />
                <InfoRow
                  icon={<Map size={12} />}
                  label="Address"
                  value={project.property_address || '—'}
                />
              </div>
            )}
          </Section>

          {/* System Design */}
          <Section title="System Design">
            <div className="grid grid-cols-3 gap-3">
              <MetricBox
                icon={<Sun size={14} />}
                label="Size"
                value={project.system_size_kwp ? `${project.system_size_kwp} kWp` : '—'}
                color="#E8A820"
              />
              <MetricBox
                icon={<Zap size={14} />}
                label="Panels"
                value={project.panel_count ? `${project.panel_count}` : '—'}
                color="#3B82F6"
              />
              <MetricBox
                icon={<Zap size={14} />}
                label="Annual kWh"
                value={
                  project.annual_production
                    ? `${(project.annual_production / 1000).toFixed(0)} MWh`
                    : '—'
                }
                color="#2ED89A"
              />
            </div>
            {(project.panel_model || project.inverter_model || project.battery_model) && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {project.panel_model && (
                  <DetailRow label="Panel" value={project.panel_model} />
                )}
                {project.inverter_model && (
                  <DetailRow label="Inverter" value={project.inverter_model} />
                )}
                {project.battery_model && (
                  <DetailRow label="Battery" value={project.battery_model} />
                )}
              </div>
            )}
          </Section>

          {/* Financial */}
          <Section title="Financial">
            <div className="grid grid-cols-3 gap-3">
              <MetricBox
                icon={<DollarSign size={14} />}
                label="Deal Value"
                value={
                  project.deal_value ? `฿${(project.deal_value / 1000).toFixed(0)}K` : '—'
                }
                color="#E8A820"
              />
              <MetricBox
                label="Deal Type"
                value={project.deal_type?.toUpperCase() || '—'}
                color="#6366F1"
              />
              <MetricBox
                label="Payback"
                value={project.payback_years ? `${project.payback_years.toFixed(1)} yr` : '—'}
                color="#2ED89A"
              />
            </div>
            {(project.monthly_consumption || project.electricity_rate) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {project.monthly_consumption && (
                  <DetailRow
                    label="Monthly kWh"
                    value={`${project.monthly_consumption.toLocaleString()}`}
                  />
                )}
                {project.electricity_rate && (
                  <DetailRow label="Rate" value={`฿${project.electricity_rate}/kWh`} />
                )}
              </div>
            )}
          </Section>

          {/* Survey Data */}
          <Section title="Survey Data">
            <div className="grid grid-cols-3 gap-3">
              <DetailRow label="Roof Type" value={project.roof_type || '—'} />
              <DetailRow label="Condition" value={project.roof_condition || '—'} />
              <DetailRow
                label="Area"
                value={project.roof_area_m2 ? `${project.roof_area_m2} m²` : '—'}
              />
              <DetailRow
                label="Usable"
                value={project.usable_area_m2 ? `${project.usable_area_m2} m²` : '—'}
              />
              <DetailRow
                label="Angle"
                value={project.roof_angle ? `${project.roof_angle}°` : '—'}
              />
              <DetailRow label="Direction" value={project.roof_direction || '—'} />
              <DetailRow label="Phase" value={project.electrical_phase || '—'} />
            </div>
            {project.shading_notes && (
              <div className="mt-3 text-xs text-white/50 bg-white/5 rounded-lg p-2">
                <span className="text-white/30 text-[10px] uppercase">Shading: </span>
                {project.shading_notes}
              </div>
            )}
          </Section>

          {/* Notes */}
          <Section title="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
              placeholder="Add notes..."
            />
            {notes !== (project.notes || '') && (
              <button
                onClick={handleSaveNotes}
                className="mt-2 px-4 py-1.5 rounded-lg bg-[#2ED89A]/20 text-[#2ED89A] text-xs font-semibold hover:bg-[#2ED89A]/30 transition-colors"
              >
                <Save size={12} className="inline mr-1" />
                Save Notes
              </button>
            )}
          </Section>
        </div>

        {/* Right Column (2/5) */}
        <div className="col-span-2 space-y-5">
          {/* Quick Actions */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>

            <button
              onClick={() => navigate(`/admin/proposals/new?lead_id=${project.id}`)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#E8A820]/10 text-[#E8A820] text-xs font-semibold hover:bg-[#E8A820]/20 border border-[#E8A820]/20 transition-colors"
            >
              <FileText size={14} />
              Create Proposal
            </button>

            {/* Internal: generate BOM + supplier order directly from lead */}
            {(project.panel_count ?? 0) > 0 && (
              <button
                onClick={() => {
                  const params = new URLSearchParams({
                    panels: String(project.panel_count ?? 0),
                    watt: '555',
                    template: 'grid-tied-commercial-metal-roof',
                    lead_id: project.id,
                    client_name: project.client_name ?? '',
                    client_site: project.property_address ?? 'Koh Phangan, Surat Thani 84280',
                  })
                  navigate(`/admin/bom?${params}`)
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors"
                title="כלי פנימי — לא מוצג ללקוח"
              >
                <span className="text-base leading-none">🛒</span>
                BOM / Supplier Order
              </button>
            )}

            {project.building_id && (
              <Link
                to={`/platform?highlight=${project.building_id}`}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-semibold hover:bg-[#3B82F6]/20 transition-colors"
              >
                <Map size={14} />
                View on Scanner Map
              </Link>
            )}

            {project.client_line_id && (
              <a
                href={`https://line.me/R/ti/p/${encodeURIComponent(project.client_line_id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00C300]/10 text-[#00C300] text-xs font-semibold hover:bg-[#00C300]/20 transition-colors"
              >
                <MessageCircle size={14} />
                LINE
              </a>
            )}

            {project.client_phone && (
              <>
                <a
                  href={`https://wa.me/${project.client_phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-colors"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
                <a
                  href={`tel:${project.client_phone}`}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-semibold hover:bg-white/10 transition-colors"
                >
                  <Phone size={14} />
                  Call {project.client_phone}
                </a>
              </>
            )}

            <button
              onClick={() => {
                setEditing(true)
                setEditData(project)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-semibold hover:bg-white/10 transition-colors"
            >
              <Edit3 size={14} />
              Edit Lead
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete Lead
            </button>
          </div>

          {/* Pipeline Checklist */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ClipboardCheck size={12} />
              Pipeline Checklist
            </h3>
            <ChecklistPanel project={project} />
          </div>

          {/* Project Meta */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
              Details
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Source</span>
                <span className="text-white/70">{project.source || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Priority</span>
                <span
                  className={`font-semibold ${
                    project.priority === 'urgent'
                      ? 'text-red-400'
                      : project.priority === 'high'
                        ? 'text-orange-400'
                        : 'text-white/70'
                  }`}
                >
                  {project.priority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Created</span>
                <span className="text-white/70">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Updated</span>
                <span className="text-white/70">
                  {new Date(project.updated_at).toLocaleDateString()}
                </span>
              </div>
              {project.lat && project.lng && (
                <div className="flex justify-between">
                  <span className="text-white/40">Coordinates</span>
                  <span className="text-white/70 text-[10px]">
                    {project.lat.toFixed(4)}, {project.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">
              Activity
            </h3>
            <ActivityTimeline activities={activities} />
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0D2137] border border-white/10 rounded-2xl p-6 w-[360px] shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-2">Delete Lead?</h3>
            <p className="text-xs text-white/50 mb-4">
              This will permanently delete "{project.client_name}" and all activity history.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-white/50 text-xs hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──

function Section({
  title,
  children,
  onEdit,
}: {
  title: string
  children: React.ReactNode
  onEdit?: () => void
}) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">{title}</h3>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-[10px] text-[#E8A820] hover:text-[#E8A820]/80 transition-colors"
          >
            <Edit3 size={11} className="inline mr-1" />
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-2">
      {icon && <span className="text-white/30">{icon}</span>}
      <div>
        <p className="text-[10px] text-white/30 uppercase">{label}</p>
        <p className={`text-xs ${href ? 'text-[#2ED89A] hover:underline' : 'text-white/70'}`}>
          {value}
        </p>
      </div>
    </div>
  )
  return href ? <a href={href}>{content}</a> : content
}

function MetricBox({
  icon,
  label,
  value,
  color,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="bg-white/5 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span style={{ color: color || '#fff' }}>{icon}</span>}
        <span className="text-[10px] text-white/30 uppercase">{label}</span>
      </div>
      <p className="text-sm font-bold" style={{ color: color || '#fff' }}>
        {value}
      </p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-2">
      <p className="text-[10px] text-white/30 uppercase">{label}</p>
      <p className="text-xs text-white/70">{value}</p>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-[10px] text-white/30 uppercase mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-white/20"
      />
    </div>
  )
}
