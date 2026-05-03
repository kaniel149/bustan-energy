// Bustan Energy CRM — 10-step Thai solar pipeline

export type ProjectStatus =
  | 'lead'
  | 'survey'
  | 'electricity_analysis'
  | 'design'
  | 'proposal'
  | 'contract'
  | 'procurement'
  | 'pea'
  | 'installation'
  | 'om'

export type ProjectPriority = 'low' | 'normal' | 'high' | 'urgent'
export type DealType = 'epc' | 'ppa'

export type LeadSource =
  | 'scanner'
  | 'manual'
  | 'facebook'
  | 'line'
  | 'referral'
  | 'cold'
  | 'walk_in'
  | 'organic'
  | 'website'
  | 'instagram'

export interface CrmProject {
  id: string
  client_name: string
  business_type: string | null
  client_phone: string | null
  client_email: string | null
  client_line_id: string | null
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
  pea_customer_number?: string | null
  pea_meter_number?: string | null
  tariff_class?: string | null
  bill_url?: string | null
  twelve_month_usage_kwh?: Record<string, number> | number[] | null
  main_breaker_amp?: number | null
  transformer_notes?: string | null
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
  selected_proposal_ref?: string | null
  selected_option?: string | null
  deposit_received_at?: string | null
  installation_scheduled_for?: string | null
  om_contract_ref?: string | null
  assigned_to: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CrmProjectInsert = Partial<
  Omit<CrmProject, 'id' | 'created_at' | 'updated_at'>
> & {
  client_name: string
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
  labelTh: string
  labelShort: string
  color: string
  step: number
  checklist: ChecklistItem[]
}

// ── Checklist System ──
export interface ChecklistItem {
  id: string
  label: string
  labelTh: string
  required: boolean
}

export interface ProjectChecklist {
  id: string
  project_id: string
  checklist_item_id: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
}

// ── Thailand-adapted EPC/PPA pipeline with checklists ──
export const CRM_STATUSES: StatusInfo[] = [
  {
    id: 'lead', label: 'Lead Capture', labelTh: 'รับลูกค้า', labelShort: 'Lead',
    color: '#3B82F6', step: 1,
    checklist: [
      { id: 'lead_contact', label: 'Contact info collected', labelTh: 'เก็บข้อมูลติดต่อ', required: true },
      { id: 'lead_source', label: 'Lead source identified', labelTh: 'ระบุแหล่งที่มา', required: false },
      { id: 'lead_next_action', label: 'Next action scheduled', labelTh: 'นัดหมายขั้นตอนถัดไป', required: true },
    ],
  },
  {
    id: 'survey', label: 'Site Survey', labelTh: 'สำรวจหน้างาน', labelShort: 'Survey',
    color: '#8B5CF6', step: 2,
    checklist: [
      { id: 'sur_visit_done', label: 'Site visit completed', labelTh: 'สำรวจหน้างานเสร็จ', required: true },
      { id: 'sur_roof_photos', label: 'Roof and meter photos uploaded', labelTh: 'อัปโหลดรูปหลังคาและมิเตอร์', required: true },
      { id: 'sur_roof_measurements', label: 'Roof measurements recorded', labelTh: 'บันทึกขนาดหลังคา', required: true },
      { id: 'sur_shading', label: 'Shading notes recorded', labelTh: 'บันทึกเงาบัง', required: false },
    ],
  },
  {
    id: 'electricity_analysis', label: 'Electricity Analysis', labelTh: 'วิเคราะห์ค่าไฟ', labelShort: 'Bill',
    color: '#F59E0B', step: 3,
    checklist: [
      { id: 'bill_collected', label: 'Latest PEA bill collected', labelTh: 'เก็บบิล กฟภ. ล่าสุด', required: true },
      { id: 'bill_tariff_class', label: 'Tariff class and meter number confirmed', labelTh: 'ยืนยันประเภทค่าไฟและเลขมิเตอร์', required: true },
      { id: 'bill_12mo_usage', label: 'Usage profile estimated or imported', labelTh: 'ประเมิน/นำเข้าการใช้ไฟ', required: true },
      { id: 'bill_loads', label: 'Day/night load split noted', labelTh: 'แยกโหลดกลางวัน/กลางคืน', required: false },
    ],
  },
  {
    id: 'design', label: 'System Design', labelTh: 'ออกแบบระบบ', labelShort: 'Design',
    color: '#06B6D4', step: 4,
    checklist: [
      { id: 'des_layout', label: 'Panel layout and kWp finalized', labelTh: 'สรุปผังแผงและขนาดระบบ', required: true },
      { id: 'des_inverter', label: 'Inverter/battery configuration selected', labelTh: 'เลือกอินเวอร์เตอร์/แบตเตอรี่', required: true },
      { id: 'des_sld', label: 'Preliminary SLD ready', labelTh: 'เตรียม SLD เบื้องต้น', required: true },
      { id: 'des_structural', label: 'Roof/structure risk reviewed', labelTh: 'ตรวจความเสี่ยงโครงสร้างหลังคา', required: false },
    ],
  },
  {
    id: 'proposal', label: 'Proposal', labelTh: 'เสนอราคา', labelShort: 'Proposal',
    color: '#EC4899', step: 5,
    checklist: [
      { id: 'prop_calc', label: 'Financial model QA passed', labelTh: 'ตรวจโมเดลการเงินแล้ว', required: true },
      { id: 'prop_terms', label: 'VAT, warranty, payment terms confirmed', labelTh: 'ยืนยัน VAT/รับประกัน/การชำระเงิน', required: true },
      { id: 'prop_sent', label: 'Proposal sent to client', labelTh: 'ส่งใบเสนอราคา', required: true },
      { id: 'prop_followup', label: 'Follow-up scheduled', labelTh: 'นัดติดตามผล', required: true },
    ],
  },
  {
    id: 'contract', label: 'Contract', labelTh: 'สัญญา', labelShort: 'Contract',
    color: '#10B981', step: 6,
    checklist: [
      { id: 'con_signed', label: 'Contract signed', labelTh: 'เซ็นสัญญา', required: true },
      { id: 'con_deposit', label: 'Deposit received', labelTh: 'รับเงินมัดจำ', required: true },
      { id: 'con_id', label: 'Client ID/passport/company docs collected', labelTh: 'เก็บเอกสารลูกค้า/บริษัท', required: true },
      { id: 'con_scope', label: 'Signed scope matches proposal version', labelTh: 'ขอบเขตตรงกับข้อเสนอที่เซ็น', required: true },
    ],
  },
  {
    id: 'procurement', label: 'Procurement', labelTh: 'จัดซื้อ', labelShort: 'Buy',
    color: '#F97316', step: 7,
    checklist: [
      { id: 'proc_bom', label: 'BOM generated from signed scope', labelTh: 'สร้าง BOM จากสัญญา', required: true },
      { id: 'proc_supplier_quote', label: 'Supplier quote approved', labelTh: 'อนุมัติใบเสนอราคาซัพพลายเออร์', required: true },
      { id: 'proc_ordered', label: 'Equipment ordered', labelTh: 'สั่งอุปกรณ์แล้ว', required: true },
      { id: 'proc_eta', label: 'Delivery ETA confirmed', labelTh: 'ยืนยันกำหนดส่งของ', required: true },
    ],
  },
  {
    id: 'pea', label: 'PEA Submission', labelTh: 'ยื่น กฟภ.', labelShort: 'PEA',
    color: '#6366F1', step: 8,
    checklist: [
      { id: 'pea_app', label: 'PEA application submitted', labelTh: 'ยื่นคำร้อง กฟภ.', required: true },
      { id: 'pea_tracking', label: 'PEA reference number recorded', labelTh: 'บันทึกเลขอ้างอิง กฟภ.', required: true },
      { id: 'pea_meter', label: 'Meter inspection scheduled', labelTh: 'นัดตรวจมิเตอร์', required: true },
      { id: 'pea_approve', label: 'PEA approval received', labelTh: 'ได้รับอนุมัติ กฟภ.', required: true },
      { id: 'pea_export', label: 'Net-billing/export terms confirmed if applicable', labelTh: 'ยืนยันเงื่อนไขขายไฟส่วนเกิน', required: false },
    ],
  },
  {
    id: 'installation', label: 'Installation', labelTh: 'ติดตั้ง', labelShort: 'Install',
    color: '#14B8A6', step: 9,
    checklist: [
      { id: 'ins_deliver', label: 'Equipment delivered', labelTh: 'อุปกรณ์ส่งถึง', required: true },
      { id: 'ins_mount', label: 'Panels mounted', labelTh: 'ติดตั้งแผง', required: true },
      { id: 'ins_wire', label: 'Wiring & inverter connected', labelTh: 'เดินสาย & ต่ออินเวอร์เตอร์', required: true },
      { id: 'ins_test', label: 'System testing passed', labelTh: 'ทดสอบระบบผ่าน', required: true },
    ],
  },
  {
    id: 'om', label: 'O&M', labelTh: 'บำรุงรักษา', labelShort: 'O&M',
    color: '#22C55E', step: 10,
    checklist: [
      { id: 'om_handover', label: 'Handover complete', labelTh: 'ส่งมอบงาน', required: true },
      { id: 'om_monitor', label: 'Monitoring connected', labelTh: 'เชื่อมต่อ Monitoring', required: true },
      { id: 'om_warranty', label: 'Warranty registered', labelTh: 'ลงทะเบียนรับประกัน', required: true },
      { id: 'om_payment', label: 'Final payment received', labelTh: 'รับเงินงวดสุดท้าย', required: true },
    ],
  },
]

export const STATUS_MAP = Object.fromEntries(
  CRM_STATUSES.map((s) => [s.id, s])
) as Record<ProjectStatus, StatusInfo>

// ── Thailand business types ──
export const BUSINESS_TYPES = [
  { id: 'resort', label: 'Resort', labelTh: 'รีสอร์ท' },
  { id: 'hotel', label: 'Hotel', labelTh: 'โรงแรม' },
  { id: 'villa', label: 'Villa', labelTh: 'วิลล่า' },
  { id: 'restaurant', label: 'Restaurant', labelTh: 'ร้านอาหาร' },
  { id: 'cafe', label: 'Café/Bar', labelTh: 'คาเฟ่/บาร์' },
  { id: 'factory', label: 'Factory', labelTh: 'โรงงาน' },
  { id: 'warehouse', label: 'Warehouse', labelTh: 'โกดัง' },
  { id: 'hospital', label: 'Hospital/Clinic', labelTh: 'โรงพยาบาล/คลินิก' },
  { id: 'school', label: 'School', labelTh: 'โรงเรียน' },
  { id: 'temple', label: 'Temple', labelTh: 'วัด' },
  { id: 'government', label: 'Government', labelTh: 'หน่วยงานราชการ' },
  { id: 'residential', label: 'Residential', labelTh: 'บ้านพักอาศัย' },
  { id: 'other', label: 'Other', labelTh: 'อื่นๆ' },
] as const

// ── Lead sources for Thailand ──
export const LEAD_SOURCES: { id: LeadSource; label: string; icon: string }[] = [
  { id: 'scanner', label: 'Roof Scanner', icon: '🛰️' },
  { id: 'line', label: 'LINE', icon: '💬' },
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
  { id: 'website', label: 'Website', icon: '🌐' },
  { id: 'referral', label: 'Referral', icon: '🤝' },
  { id: 'walk_in', label: 'Walk-in', icon: '🚶' },
  { id: 'cold', label: 'Cold Outreach', icon: '❄️' },
  { id: 'organic', label: 'Organic', icon: '🌱' },
  { id: 'manual', label: 'Manual Entry', icon: '✏️' },
]

// ── Pipeline filters ──
export interface PipelineFilters {
  search: string
  status: ProjectStatus | 'all'
  priority: ProjectPriority | 'all'
  source: string | 'all'
  businessType: string | 'all'
  dateRange: 'all' | '7d' | '30d' | '90d'
}

export const DEFAULT_FILTERS: PipelineFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  source: 'all',
  businessType: 'all',
  dateRange: 'all',
}

export interface CrmStats {
  total: number
  byStatus: Partial<Record<ProjectStatus, number>>
  totalKwp: number
  totalDealValue: number
  conversionRate: number
  urgentCount: number
}
