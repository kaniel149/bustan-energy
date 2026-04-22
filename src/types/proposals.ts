// TM Energy — Proposal management types

export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'rejected'
export type ProposalLanguage = 'he' | 'en' | 'th'

export interface Proposal {
  id: string
  ref_number: string
  client_name: string | null
  client_phone: string | null
  client_email: string | null
  location: string | null
  system_size_kwp: number | null
  panel_count: number | null
  panel_model: string | null
  panel_watt: number | null
  inverter_model: string | null
  battery_model: string | null
  battery_kwh: number | null
  total_price_thb: number | null
  monthly_savings_thb: number | null
  annual_savings_thb: number | null
  payback_years: number | null
  monthly_production_kwh: number | null
  annual_production_kwh: number | null
  password_hash: string | null
  language: ProposalLanguage | null
  html_url: string | null
  pdf_url: string | null
  status: ProposalStatus
  sent_at: string | null
  signed_at: string | null
  expires_at: string | null
  view_count: number
  first_viewed_at: string | null
  signature_data: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ProposalView {
  id: string
  proposal_id: string
  viewed_at: string
  ip_address: string | null
  user_agent: string | null
}

export interface ProposalSignature {
  id: string
  proposal_id: string
  signed_at: string
  signature_data: string | null
}

// Form data for creating a new proposal
export interface NewProposalForm {
  ref: string
  client_name: string
  client_phone: string
  client_email: string
  location_preset: 'koh_phangan' | 'koh_samui' | 'bangkok' | 'custom'
  location_custom: string
  // roof images
  roof_original_url: string
  roof_panels_url: string
  panel_count: number
  // system specs
  system_size_kwp: number
  panel_model: string
  panel_watt: number
  inverter_model: string
  battery_model: string
  battery_kwh: number
  // production calculator
  psh: number
  pr: number
  tariff_thb: number
  annual_kwh: number
  monthly_kwh: number
  monthly_savings_thb: number
  annual_savings_thb: number
  // price & ROI
  total_price_thb: number
  tax_deduction_thb: number
  payback_no_tax: number
  payback_with_tax: number
  savings_25yr_thb: number
  // deal options (v3)
  ppa_rate_thb_per_kwh: number
  ppa_years: number
  battery_price_thb: number
  battery_kwh_extra: number
  co2_factor: number
  monthly_bill_thb: number
  // derived (v3) — auto-calculated
  annual_bill_thb: number
  annual_bill_with_solar_thb: number
  co2_saved_kg: number
  savings_10yr_thb: number
  // meta
  language: ProposalLanguage
}

export const LOCATION_PRESETS: Record<string, { he: string; en: string; short: string; psh: string }> = {
  koh_phangan: { he: 'קו פנגאן, תאילנד', en: 'Koh Phangan, Thailand', short: 'Koh Phangan', psh: 'Koh Phangan' },
  koh_samui: { he: 'קו סמוי, תאילנד', en: 'Koh Samui, Thailand', short: 'Koh Samui', psh: 'Koh Samui' },
  bangkok: { he: 'בנגקוק, תאילנד', en: 'Bangkok, Thailand', short: 'Bangkok', psh: 'Bangkok' },
}

export const STATUS_BADGE: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'טיוטה', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
  sent: { label: 'נשלח', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  viewed: { label: 'נצפה', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  signed: { label: 'חתום', color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
  rejected: { label: 'נדחה', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
}
