# CRM Full Build — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full 10-step solar CRM at `/crm` with Kanban pipeline, lead detail pages, dashboard, and bidirectional scanner integration — all within the existing solar-intelligence React app.

**Architecture:** New `/crm/*` routes using React Router, sharing the same Zustand store and Supabase client. CRM components live in `src/components/CRM/`. Supabase handles projects, activity log, and user profiles with RLS. The scanner (at `/platform`) links to CRM via "Push to CRM" and building ID references.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Zustand, Supabase (PostgreSQL + Auth + RLS), Framer Motion, Lucide Icons, React Router v7

---

## Task 1: Supabase Migration — projects + activity_log + user_profiles

**Files:**
- Create: `supabase/migrations/007_crm_projects.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================
-- 007_crm_projects.sql
-- CRM Pipeline: projects, activity_log, user_profiles
-- ============================================

-- 1. Projects table (leads + pipeline)
CREATE TABLE IF NOT EXISTS projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Client info
  client_name     text NOT NULL,
  business_type   text,
  client_phone    text,
  client_email    text,

  -- Property/building link
  property_address text,
  building_id     text,
  lat             float8,
  lng             float8,

  -- Pipeline
  status          text NOT NULL DEFAULT 'lead',
  step_number     int NOT NULL DEFAULT 1,
  priority        text DEFAULT 'normal',

  -- Solar system
  system_size_kwp     float8,
  panel_count         int,
  panel_model         text,
  inverter_model      text,
  battery_model       text,
  annual_production   float8,

  -- Financial
  deal_value          float8,
  deal_type           text,
  monthly_consumption float8,
  electricity_rate    float8,
  payback_years       float8,

  -- Survey data
  roof_type           text,
  roof_condition      text,
  roof_area_m2        float8,
  usable_area_m2      float8,
  roof_angle          float8,
  roof_direction      text,
  electrical_phase    text,
  shading_notes       text,

  -- Meta
  source          text,
  assigned_to     uuid REFERENCES auth.users(id),
  notes           text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2. Activity log
CREATE TABLE IF NOT EXISTS activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id),
  action      text NOT NULL,
  details     jsonb,
  created_at  timestamptz DEFAULT now()
);

-- 3. User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name   text NOT NULL,
  role        text DEFAULT 'viewer',
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_building ON projects(building_id);
CREATE INDEX IF NOT EXISTS idx_projects_step ON projects(step_number);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read projects" ON projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert projects" ON projects
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update projects" ON projects
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete projects" ON projects
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth read activity" ON activity_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert activity" ON activity_log
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth read profiles" ON user_profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Auth insert profiles" ON user_profiles
  FOR INSERT TO authenticated WITH CHECK (true);
```

**Step 2: Run migration via Supabase MCP or SQL editor**

Run the SQL above against Supabase project `trvgpgpsqvvdsudpgwpm`.

**Step 3: Verify tables exist**

Query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('projects', 'activity_log', 'user_profiles');`

Expected: 3 rows returned.

**Step 4: Commit**

```bash
git add supabase/migrations/007_crm_projects.sql
git commit -m "feat: add CRM schema — projects, activity_log, user_profiles"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/crm.ts` (full rewrite)

**Step 1: Rewrite crm.ts with correct 10-step pipeline**

```typescript
// src/types/crm.ts
// Bustan Energy CRM — 10-step solar pipeline

export type ProjectStatus =
  | 'lead'
  | 'evaluation'
  | 'proposal'
  | 'contract'
  | 'design'
  | 'survey'
  | 'survey_approval'
  | 'pea'
  | 'installation'
  | 'om'

export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent'
export type DealType = 'epc' | 'ppa'

export interface CrmProject {
  id: string
  client_name: string
  business_type: string | null
  client_phone: string | null
  client_email: string | null
  property_address: string | null
  building_id: string | null
  lat: number | null
  lng: number | null
  status: ProjectStatus
  step_number: number
  priority: ProjectPriority
  system_size_kwp: number | null
  panel_count: number | null
  panel_model: string | null
  inverter_model: string | null
  battery_model: string | null
  annual_production: number | null
  deal_value: number | null
  deal_type: DealType | null
  monthly_consumption: number | null
  electricity_rate: number | null
  payback_years: number | null
  roof_type: string | null
  roof_condition: string | null
  roof_area_m2: number | null
  usable_area_m2: number | null
  roof_angle: number | null
  roof_direction: string | null
  electrical_phase: string | null
  shading_notes: string | null
  source: string | null
  assigned_to: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CrmProjectInsert {
  client_name: string
  business_type?: string
  client_phone?: string
  client_email?: string
  property_address?: string
  building_id?: string
  lat?: number
  lng?: number
  status?: ProjectStatus
  step_number?: number
  priority?: ProjectPriority
  system_size_kwp?: number
  panel_count?: number
  panel_model?: string
  inverter_model?: string
  battery_model?: string
  annual_production?: number
  deal_value?: number
  deal_type?: DealType
  monthly_consumption?: number
  electricity_rate?: number
  payback_years?: number
  roof_type?: string
  roof_condition?: string
  roof_area_m2?: number
  usable_area_m2?: number
  roof_angle?: number
  roof_direction?: string
  electrical_phase?: string
  shading_notes?: string
  source?: string
  assigned_to?: string
  notes?: string
  created_by?: string
}

export interface ActivityEntry {
  id: string
  project_id: string
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface UserProfile {
  id: string
  full_name: string
  role: 'admin' | 'sales' | 'viewer'
  avatar_url: string | null
  created_at: string
}

export interface StatusInfo {
  id: ProjectStatus
  label: string
  labelShort: string
  color: string
  step: number
}

export const CRM_STATUSES: StatusInfo[] = [
  { id: 'lead',             label: 'Lead Capture',      labelShort: 'Lead',       color: '#3B82F6', step: 1 },
  { id: 'evaluation',       label: 'Evaluation',        labelShort: 'Eval',       color: '#8B5CF6', step: 2 },
  { id: 'proposal',         label: 'Proposal',          labelShort: 'Proposal',   color: '#F59E0B', step: 3 },
  { id: 'contract',         label: 'Contract',          labelShort: 'Contract',   color: '#10B981', step: 4 },
  { id: 'design',           label: 'Detailed Design',   labelShort: 'Design',     color: '#06B6D4', step: 5 },
  { id: 'survey',           label: 'Site Survey',       labelShort: 'Survey',     color: '#EC4899', step: 6 },
  { id: 'survey_approval',  label: 'Survey Approval',   labelShort: 'Approval',   color: '#F97316', step: 7 },
  { id: 'pea',              label: 'PEA Submission',     labelShort: 'PEA',        color: '#6366F1', step: 8 },
  { id: 'installation',     label: 'Installation',      labelShort: 'Install',    color: '#14B8A6', step: 9 },
  { id: 'om',               label: 'O&M',               labelShort: 'O&M',        color: '#22C55E', step: 10 },
]

export const STATUS_MAP = Object.fromEntries(
  CRM_STATUSES.map((s) => [s.id, s])
) as Record<ProjectStatus, StatusInfo>

export interface CrmStats {
  total: number
  byStatus: Partial<Record<ProjectStatus, number>>
  totalKwp: number
  totalDealValue: number
  conversionRate: number
  urgentCount: number
}
```

**Step 2: Commit**

```bash
git add src/types/crm.ts
git commit -m "feat: update CRM types — 10-step pipeline with full project schema"
```

---

## Task 3: Update CRM Service Layer

**Files:**
- Modify: `src/lib/crm-service.ts` (full rewrite)

**Step 1: Rewrite crm-service.ts**

```typescript
// src/lib/crm-service.ts
import { supabase, isCrmConnected } from './supabase'
import type { Property } from '../types'
import type {
  CrmProject,
  CrmProjectInsert,
  CrmStats,
  ProjectStatus,
  ActivityEntry,
  STATUS_MAP,
} from '../types/crm'
import { CRM_STATUSES } from '../types/crm'

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
    system_size_kwp: property.capacityKwp || undefined,
    panel_count: property.panelCount || undefined,
    roof_area_m2: property.area || undefined,
    usable_area_m2: property.area ? property.area * 0.7 : undefined,
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

  // Log activity
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

  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('activity_log').insert({
    project_id: projectId,
    user_id: user?.id || null,
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

export async function getRecentActivity(limit = 20): Promise<ActivityEntry[]> {
  if (!supabase) return []

  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []) as ActivityEntry[]
}

// ── Stats ──
export async function getCrmStats(): Promise<CrmStats> {
  const projects = await getCrmProjects()

  const byStatus: Partial<Record<ProjectStatus, number>> = {}
  let totalKwp = 0
  let totalDealValue = 0
  let urgentCount = 0
  let contractOrBeyond = 0

  for (const p of projects) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1
    totalKwp += p.system_size_kwp || 0
    totalDealValue += p.deal_value || 0
    if (p.priority === 'urgent' || p.priority === 'high') urgentCount++
    if (p.step_number >= 4) contractOrBeyond++ // contract or later
  }

  return {
    total: projects.length,
    byStatus,
    totalKwp,
    totalDealValue,
    conversionRate: projects.length > 0 ? contractOrBeyond / projects.length : 0,
    urgentCount,
  }
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

export { isCrmConnected }
```

**Step 2: Commit**

```bash
git add src/lib/crm-service.ts
git commit -m "feat: rewrite CRM service — 10-step pipeline, activity log, full CRUD"
```

---

## Task 4: Update Zustand Store — CRM Slice

**Files:**
- Modify: `src/lib/store.ts` (update CRM section)

**Step 1: Update store CRM state**

In `store.ts`, replace the CRM section of the interface and implementation. Add:
- `crmView`: tracks current CRM sub-view (`'dashboard' | 'pipeline' | 'lead'`)
- `selectedLeadId`: for lead detail view
- `crmLoading`: loading state
- `loadCrmData()`: fetches projects from Supabase
- Keep `crmBuildingIds` but derive from `building_id` field instead of parsing notes

The store changes are additive — only the CRM interface/implementation block changes. The filters, map, auth, properties sections remain untouched.

**Step 2: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: update store — CRM view state, loading, buildingId tracking"
```

---

## Task 5: CRM Layout + Router Integration

**Files:**
- Create: `src/components/CRM/CRMLayout.tsx`
- Create: `src/pages/CRMPage.tsx`
- Modify: `src/App.tsx` (add /crm routes)

**Step 1: Create CRMLayout.tsx**

Sidebar navigation (left, 240px collapsed to 64px) with:
- Logo/brand header
- Nav items: Dashboard, Pipeline, (future: Settings)
- User info at bottom
- Outlet for child routes
- "Back to Scanner" link → `/platform`

Dark theme matching existing app: `bg-[#0A1929]`, glassmorphism borders, white/10 dividers.

**Step 2: Create CRMPage.tsx**

Wrapper page that:
- Checks auth state (redirect to login if not authenticated)
- Loads CRM data on mount
- Renders CRMLayout with child routes

**Step 3: Update App.tsx**

Add lazy imports and routes:
```tsx
const CRMPage = lazy(() => import('./pages/CRMPage'))
const CRMDashboard = lazy(() => import('./components/CRM/Dashboard'))
const CRMPipeline = lazy(() => import('./components/CRM/Pipeline'))
const LeadDetail = lazy(() => import('./components/CRM/LeadDetail'))

// Inside <Routes>:
<Route path="/crm" element={<CRMPage />}>
  <Route index element={<CRMDashboard />} />
  <Route path="pipeline" element={<CRMPipeline />} />
  <Route path="leads/:id" element={<LeadDetail />} />
</Route>
```

**Step 4: Commit**

```bash
git add src/components/CRM/CRMLayout.tsx src/pages/CRMPage.tsx src/App.tsx
git commit -m "feat: add CRM routing — /crm, /crm/pipeline, /crm/leads/:id"
```

---

## Task 6: CRM Dashboard

**Files:**
- Create: `src/components/CRM/Dashboard.tsx`
- Create: `src/components/CRM/KPICards.tsx`
- Create: `src/components/CRM/PipelineFunnel.tsx`
- Create: `src/components/CRM/ActivityFeed.tsx`

**Step 1: Create KPICards.tsx**

4 stat cards in a row:
- Total Leads (count, blue)
- Pipeline Value (฿ sum, gold)
- Total kWp (sum, green)
- Conversion Rate (% from contract+, emerald)

Each card: glassmorphic bg-white/5 rounded-xl, icon, label, large value, small trend indicator.

**Step 2: Create PipelineFunnel.tsx**

Horizontal bar chart showing count of projects per pipeline step (steps 1-10). Each bar colored by step color from CRM_STATUSES. Shows step label + count. Clickable → navigates to `/crm/pipeline` with that step highlighted.

Built with pure CSS (no chart library needed — simple flex bars).

**Step 3: Create ActivityFeed.tsx**

List of recent activities (last 20). Each row:
- Colored dot (by action type: green=created, blue=status_change, gray=updated)
- Action description: "Lead created: Business Name" or "Moved to Proposal: Business Name"
- Relative timestamp ("2h ago", "yesterday")

Fetches from `getRecentActivity()`. Needs project name lookup — fetch project IDs in batch or join.

**Step 4: Create Dashboard.tsx**

Composes: KPICards + PipelineFunnel + ActivityFeed
Layout: KPIs top row, Funnel left (60%), Activity right (40%), all in a scrollable container with p-6 spacing.

**Step 5: Commit**

```bash
git add src/components/CRM/Dashboard.tsx src/components/CRM/KPICards.tsx src/components/CRM/PipelineFunnel.tsx src/components/CRM/ActivityFeed.tsx
git commit -m "feat: CRM dashboard — KPIs, pipeline funnel, activity feed"
```

---

## Task 7: Pipeline Kanban Board

**Files:**
- Create: `src/components/CRM/Pipeline.tsx`
- Create: `src/components/CRM/PipelineColumn.tsx`
- Create: `src/components/CRM/LeadCard.tsx`

**Step 1: Create LeadCard.tsx**

Compact card for Kanban column:
- Client name (truncated)
- Business type badge
- System size (kWp) if known
- Deal value (฿) if known
- Priority badge (high/urgent = red)
- Source icon (scanner/marketing/organic)
- Click → navigate to `/crm/leads/:id`

Size: ~120px height, full column width. Glassmorphic bg-white/5 with hover state.

**Step 2: Create PipelineColumn.tsx**

Single column:
- Colored header bar (step color) with step label + count badge
- Scrollable card list
- Drop zone for drag (future: implement drag-drop in a later iteration)
- "+" button at bottom to create new lead in this step

**Step 3: Create Pipeline.tsx**

Horizontal scrollable container with 10 columns. Each column rendered as PipelineColumn.
- Top bar: "Pipeline" title + "New Lead" button + search filter
- Columns container: `flex gap-3 overflow-x-auto` with snap scrolling
- Each column: `min-w-[280px] max-w-[280px]` for consistent sizing
- Groups crmProjects by status

Header has a status change dropdown on each card — clicking moves the lead to the selected column.

**Step 4: Commit**

```bash
git add src/components/CRM/Pipeline.tsx src/components/CRM/PipelineColumn.tsx src/components/CRM/LeadCard.tsx
git commit -m "feat: CRM pipeline — 10-column Kanban board with lead cards"
```

---

## Task 8: Lead Detail Page

**Files:**
- Create: `src/components/CRM/LeadDetail.tsx`
- Create: `src/components/CRM/LeadForm.tsx`
- Create: `src/components/CRM/ActivityTimeline.tsx`

**Step 1: Create ActivityTimeline.tsx**

Vertical timeline of activity entries for a single project:
- Left: colored dot + vertical line
- Right: action description + timestamp
- Actions: lead_created, status_change, project_updated, note_added, proposal_sent
- Each action type has icon + color mapping

**Step 2: Create LeadForm.tsx**

Modal form for creating/editing a lead. Sections:
- **Client**: name, business type (dropdown), phone, email
- **Property**: address, lat/lng (readonly if from scanner)
- **System**: size kWp, panel count, panel model, inverter, battery
- **Financial**: deal value, deal type (EPC/PPA), monthly consumption, electricity rate
- **Notes**: free text

Form uses controlled inputs. On submit: calls `createLead()` or `updateProject()`.

**Step 3: Create LeadDetail.tsx**

Full-page lead view (route: `/crm/leads/:id`). Layout:

Left column (60%):
- **Header**: client name, business type, priority badge, status badge with step progress bar (10 dots, filled up to current step)
- **Status actions**: "Move to Next Step" button + dropdown for any step
- **Client info card**: name, phone, email, address — each editable inline
- **System design card**: kWp, panels, inverter, battery, annual production
- **Financial card**: deal value, deal type, payback, consumption, rate
- **Survey card**: roof type/condition/area, angle, direction, phase, shading
- **Notes section**: editable textarea + save button

Right column (40%):
- **Quick actions**: View on Map, Generate Proposal, LINE, WhatsApp, Edit Lead
- **Activity timeline**: full history
- **Map preview**: small embedded map showing building location (static image or mini MapLibre)

Fetches project by ID from URL params. Fetches activity for that project.

**Step 4: Commit**

```bash
git add src/components/CRM/LeadDetail.tsx src/components/CRM/LeadForm.tsx src/components/CRM/ActivityTimeline.tsx
git commit -m "feat: lead detail page — full project view with timeline + editable fields"
```

---

## Task 9: Scanner ↔ CRM Integration

**Files:**
- Modify: `src/components/Sidebar/PropertySidebar.tsx` (update CrmPushButton)
- Modify: `src/components/Map/SolarMap.tsx` (add CRM badges on buildings)
- Modify: `src/lib/store.ts` (update crmBuildingIds to use building_id field)

**Step 1: Update CrmPushButton in PropertySidebar**

After successful push, navigate to `/crm/leads/:id` instead of just showing "In Pipeline".
Add: `import { useNavigate } from 'react-router-dom'` and on push success:
```tsx
navigate(`/crm/leads/${project.id}`)
```

Also update the "In Pipeline" state to show the current step and link to the lead.

**Step 2: Update crmBuildingIds in store**

Change `updateCrmBuildingIds` to derive from `building_id` field directly (not parsing notes):
```typescript
updateCrmBuildingIds: () => {
  const { crmProjects } = get()
  const ids = new Set<string>()
  for (const p of crmProjects) {
    if (p.building_id) ids.add(p.building_id)
  }
  set({ crmBuildingIds: ids })
},
```

**Step 3: Add CRM badge to map buildings**

In SolarMap.tsx, when rendering building markers, check if `crmBuildingIds.has(building.id)` and if so, add a small colored border or dot indicating CRM status. Find the matching project to show the step label.

**Step 4: Commit**

```bash
git add src/components/Sidebar/PropertySidebar.tsx src/components/Map/SolarMap.tsx src/lib/store.ts
git commit -m "feat: scanner ↔ CRM integration — push navigates to lead, map badges"
```

---

## Task 10: CRM Link from FilterBar + Navigation Polish

**Files:**
- Modify: `src/components/FilterBar/FilterBar.tsx` (update CRM button to link to /crm)
- Modify: `src/components/CRM/CRMLayout.tsx` (add "Back to Scanner" link)

**Step 1: Update FilterBar CRM button**

Change the CRM button from toggling `showCrmPanel` to navigating to `/crm`:
```tsx
<Link to="/crm" className="...">CRM Dashboard</Link>
```

Keep the old sidebar panel for quick access if needed, but primary CRM access is via `/crm`.

**Step 2: Verify navigation flows**

Test these flows work:
1. `/platform` → Click CRM button → `/crm` (dashboard)
2. `/crm` → Click "Back to Scanner" → `/platform`
3. `/platform` → Select building → Push to CRM → `/crm/leads/:id`
4. `/crm/leads/:id` → "View on Map" → `/platform?highlight=BUILDING_ID`
5. `/crm/pipeline` → Click lead card → `/crm/leads/:id`

**Step 3: Commit**

```bash
git add src/components/FilterBar/FilterBar.tsx src/components/CRM/CRMLayout.tsx
git commit -m "feat: CRM navigation — FilterBar link, back to scanner, bidirectional"
```

---

## Task 11: Final Polish + Deploy

**Files:**
- All CRM components (visual polish)
- Verify Vercel build passes

**Step 1: Verify TypeScript build**

```bash
cd ~/Desktop/projects/solar-intelligence && npx tsc --noEmit
```

Fix any type errors.

**Step 2: Test local dev**

```bash
npm run dev
```

Navigate to `/crm`, `/crm/pipeline`, create a test lead, move through pipeline steps, check dashboard.

**Step 3: Build for production**

```bash
npm run build
```

Verify no errors, check bundle size.

**Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: CRM v1 complete — dashboard, pipeline, lead detail, scanner integration"
git push
```

Vercel auto-deploys to crm.bustan-energy.com.

---

## Summary of Files

### New Files (10)
- `supabase/migrations/007_crm_projects.sql`
- `src/pages/CRMPage.tsx`
- `src/components/CRM/CRMLayout.tsx`
- `src/components/CRM/Dashboard.tsx`
- `src/components/CRM/KPICards.tsx`
- `src/components/CRM/PipelineFunnel.tsx`
- `src/components/CRM/ActivityFeed.tsx`
- `src/components/CRM/Pipeline.tsx`
- `src/components/CRM/PipelineColumn.tsx`
- `src/components/CRM/LeadCard.tsx`
- `src/components/CRM/LeadDetail.tsx`
- `src/components/CRM/LeadForm.tsx`
- `src/components/CRM/ActivityTimeline.tsx`

### Modified Files (6)
- `src/types/crm.ts`
- `src/lib/crm-service.ts`
- `src/lib/store.ts`
- `src/App.tsx`
- `src/components/Sidebar/PropertySidebar.tsx`
- `src/components/FilterBar/FilterBar.tsx`
- `src/components/Map/SolarMap.tsx` (minor — CRM badges)
