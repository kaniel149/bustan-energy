import { supabase, isCrmConnected } from './supabase'
import type { Property } from '../types'
import type {
  CrmProject,
  CrmProjectInsert,
  ProjectStatus,
  ActivityEntry,
  ProjectChecklist,
  PipelineFilters,
} from '../types/crm'

// ── Push building from scanner to CRM ──
export async function pushToCrm(property: Property): Promise<CrmProject | null> {
  if (!supabase) return null

  const insert: CrmProjectInsert = {
    client_name: property.ownerName || property.title || `Building at ${property.lat.toFixed(4)}, ${property.lng.toFixed(4)}`,
    business_type: property.category || undefined,
    client_phone: property.phone || undefined,
    client_email: property.email || undefined,
    property_address: property.location || undefined,
    building_id: property.id,
    lat: property.lat,
    lng: property.lng,
    status: 'lead',
    step_number: 1,
    priority: property.priority === 'A' ? 'high' : property.priority === 'B' ? 'normal' : 'low',
    system_size_kwp: property.capacityKwp ?? undefined,
    panel_count: property.panelCount ?? undefined,
    roof_area_m2: property.area ?? undefined,
    usable_area_m2: property.area != null ? property.area * 0.7 : undefined,
    source: 'scanner',
    notes: [
      `Source: Solar Intelligence Scanner`,
      `Region: ${property.region}`,
      property.solarScore ? `Solar Score: ${property.solarScore}/100` : '',
      property.gridProximity ? `Grid: ${property.gridProximity.grade} (${property.gridProximity.distanceMeters.toFixed(0)}m)` : '',
    ].filter(Boolean).join('\n'),
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(insert)
    .select()
    .single()

  if (error) {
    console.error('CRM push failed:', error)
    throw new Error(error.message)
  }

  if (data) {
    await logActivity(data.id, 'lead_created', {
      source: 'scanner',
      building_id: property.id,
    })
  }

  return data as CrmProject
}

// ── Create lead manually ──
export async function createLead(data: CrmProjectInsert): Promise<CrmProject | null> {
  if (!supabase) return null

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...data, status: data.status || 'lead', step_number: data.step_number || 1 })
    .select()
    .single()

  if (error) throw new Error(error.message)

  if (project) {
    await logActivity(project.id, 'lead_created', { source: data.source || 'manual' })
  }

  return project as CrmProject
}

// ── Fetch all CRM projects ──
export async function getCrmProjects(): Promise<CrmProject[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('step_number', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('CRM fetch failed:', error)
    return []
  }

  return (data || []) as CrmProject[]
}

// ── Fetch single project ──
export async function getCrmProject(id: string): Promise<CrmProject | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as CrmProject
}

// ── Update project status (move in pipeline) ──
export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
  stepNumber: number
): Promise<boolean> {
  if (!supabase) return false

  const { error } = await supabase
    .from('projects')
    .update({ status, step_number: stepNumber })
    .eq('id', projectId)

  if (error) {
    console.error('Status update failed:', error)
    return false
  }

  await logActivity(projectId, 'status_change', { status, step_number: stepNumber })
  return true
}

// ── Update project fields ──
export async function updateProject(
  projectId: string,
  updates: Partial<CrmProjectInsert>
): Promise<boolean> {
  if (!supabase) return false

  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)

  if (error) {
    console.error('Project update failed:', error)
    return false
  }

  await logActivity(projectId, 'project_updated', { fields: Object.keys(updates) })
  return true
}

// ── Delete project ──
export async function deleteProject(projectId: string): Promise<boolean> {
  if (!supabase) return false

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  return !error
}

// ── Activity log ──
export async function logActivity(
  projectId: string,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  if (!supabase) return

  const { data: { session } } = await supabase.auth.getSession()

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: session?.user?.id || null,
    action,
    details: details || null,
  })
}

export async function getProjectActivity(projectId: string): Promise<ActivityEntry[]> {
  if (!supabase) return []

  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data || []) as ActivityEntry[]
}

export async function getRecentActivity(limit = 20): Promise<(ActivityEntry & { project?: CrmProject })[]> {
  if (!supabase) return []

  const { data } = await supabase
    .from('activity_log')
    .select('*, project:projects(id, client_name, status)')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []) as (ActivityEntry & { project?: CrmProject })[]
}

// ── Log proposal sent + auto-create/advance CRM ──
export async function logProposalSent(
  property: Property,
  proposalType: 'epc' | 'ppa' | 'lease' | 'full_proposal' | 'pdf_report',
  channel: 'whatsapp' | 'copy' | 'download' | 'web',
  financialSummary?: {
    capacityKwp?: number
    annualSavings?: number
    paybackYears?: number
    dealValue?: number
  }
): Promise<CrmProject | null> {
  if (!supabase) return null

  // Check if building already in CRM
  let project = await findByBuildingId(property.id)

  // Auto-create lead if not in CRM
  if (!project) {
    project = await pushToCrm(property)
  }

  if (!project) return null

  // Log the proposal activity
  await logActivity(project.id, 'proposal_sent', {
    proposal_type: proposalType,
    channel,
    building_id: property.id,
    building_title: property.title,
    ...financialSummary,
  })

  // Auto-advance to "proposal" step if still in lead/evaluation
  if (project.step_number < 3) {
    await updateProjectStatus(project.id, 'proposal', 3)

    // Update deal value if we have financial data
    if (financialSummary?.dealValue || financialSummary?.capacityKwp) {
      await updateProject(project.id, {
        system_size_kwp: financialSummary.capacityKwp ?? project.system_size_kwp ?? undefined,
        deal_value: financialSummary.dealValue ?? project.deal_value ?? undefined,
        deal_type: proposalType === 'ppa' ? 'ppa' : proposalType === 'epc' ? 'epc' : project.deal_type ?? undefined,
      })
    }

    // Return updated project
    project = await getCrmProject(project.id)
  }

  return project
}

// ── Find by building ID ──
export async function findByBuildingId(buildingId: string): Promise<CrmProject | null> {
  if (!supabase) return null

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('building_id', buildingId)
    .limit(1)

  return (data?.[0] as CrmProject) || null
}

// ── Checklist operations ──
export async function getProjectChecklists(projectId: string): Promise<ProjectChecklist[]> {
  if (!supabase) return []

  const { data } = await supabase
    .from('project_checklists')
    .select('*')
    .eq('project_id', projectId)

  return (data || []) as ProjectChecklist[]
}

export async function toggleChecklistItem(
  projectId: string,
  checklistItemId: string,
  completed: boolean
): Promise<boolean> {
  if (!supabase) return false

  const { data: { session } } = await supabase.auth.getSession()

  const { error } = await supabase
    .from('project_checklists')
    .upsert({
      project_id: projectId,
      checklist_item_id: checklistItemId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? session?.user?.id || null : null,
    }, {
      onConflict: 'project_id,checklist_item_id',
    })

  if (error) {
    console.error('Checklist toggle failed:', error)
    return false
  }

  await logActivity(projectId, 'checklist_updated', {
    item: checklistItemId,
    completed,
  })
  return true
}

// ── Filter projects client-side ──
export function filterProjects(projects: CrmProject[], filters: PipelineFilters): CrmProject[] {
  return projects.filter((p) => {
    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const match =
        p.client_name.toLowerCase().includes(q) ||
        p.property_address?.toLowerCase().includes(q) ||
        p.business_type?.toLowerCase().includes(q) ||
        p.client_phone?.includes(q) ||
        p.client_email?.toLowerCase().includes(q) ||
        p.client_line_id?.toLowerCase().includes(q)
      if (!match) return false
    }

    // Status
    if (filters.status !== 'all' && p.status !== filters.status) return false

    // Priority
    if (filters.priority !== 'all' && p.priority !== filters.priority) return false

    // Source
    if (filters.source !== 'all' && p.source !== filters.source) return false

    // Business type
    if (filters.businessType !== 'all' && p.business_type !== filters.businessType) return false

    // Date range
    if (filters.dateRange !== 'all') {
      const now = Date.now()
      const created = new Date(p.created_at).getTime()
      const days = filters.dateRange === '7d' ? 7 : filters.dateRange === '30d' ? 30 : 90
      if (now - created > days * 86400000) return false
    }

    return true
  })
}

export { isCrmConnected }
