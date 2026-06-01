import { useState, useEffect, useCallback } from 'react'
import type { NewProposalForm, ProposalLanguage } from '../types/proposals'
import { generateRef } from '../lib/admin-service'
import { calculateSolarFinancials, TM_SOLAR_ASSUMPTIONS } from '../lib/solar-financials'

const DEFAULTS: Omit<NewProposalForm, 'ref'> = {
  client_name: '',
  client_phone: '',
  client_email: '',
  location_preset: 'koh_phangan',
  location_custom: '',
  roof_original_url: '',
  roof_panels_url: '',
  panel_count: 18,
  system_size_kwp: 12.76,
  panel_model: 'Jinko N-Type 580W',
  panel_watt: 580,
  inverter_model: 'Huawei SUN2000-12KTL-M2',
  battery_model: 'Huawei LUNA2000-10-S0',
  battery_kwh: 10,
  psh: TM_SOLAR_ASSUMPTIONS.pshAnnual,
  pr: TM_SOLAR_ASSUMPTIONS.performanceRatio * TM_SOLAR_ASSUMPTIONS.soilingFactor,
  tariff_thb: TM_SOLAR_ASSUMPTIONS.retailRateThb,
  annual_kwh: 0,
  monthly_kwh: 0,
  monthly_savings_thb: 0,
  annual_savings_thb: 0,
  total_price_thb: 0,
  tax_deduction_thb: 0,
  payback_no_tax: 0,
  payback_with_tax: 0,
  savings_25yr_thb: 0,
  // deal options (v3)
  ppa_rate_thb_per_kwh: 4.20,
  ppa_years: 15,
  battery_price_thb: 150000,
  battery_kwh_extra: 10,
  co2_factor: TM_SOLAR_ASSUMPTIONS.co2KgPerKwh,
  monthly_bill_thb: 0,
  financing_enabled: true,
  financing_ltv_pct: 70,
  financing_interest_pct: 6.5,
  financing_years: 10,
  financing_om_pct: 1,
  // derived (v3)
  annual_bill_thb: 0,
  annual_bill_with_solar_thb: 0,
  co2_saved_kg: 0,
  savings_10yr_thb: 0,
  // Pricing auto-calc
  price_markup: 1.35,       // client price = direct BOM cost × target gross margin buffer
  bom_cost_thb: 0,          // auto-populated from BOM calc
  language: 'he' as ProposalLanguage,
  // roof geometry carried from map draw — null until a property is selected via property_id
  roof_polygon: null,
  roof_lat: null,
  roof_lng: null,
  roof_area_sqm: null,
}

function calcDerived(form: NewProposalForm): Partial<NewProposalForm> {
  // FIX: system_size_kwp is ALWAYS derived from panels × watt — was being
  // treated as independent input so 157 panels × 620W showed 12.76 kWp.
  const system_size_kwp = Math.round((form.panel_count * form.panel_watt) / 1000 * 100) / 100

  const financials = calculateSolarFinancials({
    systemSizeKwp: system_size_kwp,
    pshAvg: form.psh,
    // `pr` is the effective PR shown in the admin UI, so keep soiling at 1.
    performanceRatio: form.pr,
    soilingFactor: 1,
    retailRateThb: form.tariff_thb,
    batteryKwh: form.battery_kwh,
    totalPriceThb: form.total_price_thb,
    taxDeductionThb: form.tax_deduction_thb,
  })

  const annual_kwh = financials.annual_kwh
  const monthly_kwh = financials.monthly_kwh
  const annual_savings_thb = financials.annual_savings_thb
  const monthly_savings_thb = financials.monthly_savings_thb
  const payback_no_tax = financials.payback_discounted_years
  const payback_with_tax = financials.payback_with_tax_years
  const savings_25yr_thb = financials.savings_25yr_thb

  // v3 derived
  const annual_bill_thb = form.monthly_bill_thb * 12
  const annual_bill_with_solar_thb = Math.max(0, annual_bill_thb - annual_savings_thb)
  const co2_saved_kg = financials.co2_saved_kg_year1
  const savings_10yr_thb = financials.savings_10yr_thb

  return {
    system_size_kwp,
    annual_kwh,
    monthly_kwh,
    monthly_savings_thb,
    annual_savings_thb,
    payback_no_tax,
    payback_with_tax,
    savings_25yr_thb,
    annual_bill_thb,
    annual_bill_with_solar_thb,
    co2_saved_kg,
    savings_10yr_thb,
  }
}

function withDerived(form: NewProposalForm): NewProposalForm {
  return { ...form, ...calcDerived(form) }
}

const DRAFT_KEY = 'tm-proposal-draft-v1'

function loadDraft(): Partial<NewProposalForm> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Expire drafts older than 24 hours
    if (parsed._ts && Date.now() - parsed._ts > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY)
      return null
    }
    delete parsed._ts
    return parsed
  } catch {
    return null
  }
}

function saveDraft(form: NewProposalForm) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, _ts: Date.now() }))
  } catch {
    // quota exceeded — silently drop
  }
}

export function clearProposalDraft() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DRAFT_KEY)
}

export function useNewProposalForm(options: { draftEnabled?: boolean } = {}) {
  const draftEnabled = options.draftEnabled ?? true
  const [form, setForm] = useState<NewProposalForm>({ ref: '', ...DEFAULTS })
  const [errors, setErrors] = useState<Partial<Record<keyof NewProposalForm, string>>>({})
  const [draftRestored, setDraftRestored] = useState(false)

  // Generate ref on mount + restore draft if available
  useEffect(() => {
    const draft = draftEnabled ? loadDraft() : null
    generateRef().then((ref) => {
      if (draft && draft.client_name) {
        // Restore draft but keep a fresh ref number
        setForm(withDerived({ ...DEFAULTS, ...draft, ref: draft.ref || ref } as NewProposalForm))
        setDraftRestored(true)
      } else {
        setForm((f) => withDerived({ ...f, ref }))
      }
    })
  }, [draftEnabled])

  // Auto-save draft whenever form changes (debounced via effect cycle)
  useEffect(() => {
    if (draftEnabled && (form.client_name || form.total_price_thb > 0)) {
      saveDraft(form)
    }
  }, [draftEnabled, form])

  const update = useCallback(<K extends keyof NewProposalForm>(key: K, value: NewProposalForm[K]) => {
    setForm((f) => withDerived({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }, [])

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof NewProposalForm, string>> = {}
    if (!form.client_name.trim()) newErrors.client_name = 'שם חובה'
    if (!form.ref.trim()) newErrors.ref = 'מספר הצעה חובה'
    if (form.total_price_thb <= 0) newErrors.total_price_thb = 'מחיר חובה'
    if (form.system_size_kwp <= 0) newErrors.system_size_kwp = 'גודל מערכת חובה'
    if (form.location_preset === 'custom' && !form.location_custom.trim()) {
      newErrors.location_custom = 'מיקום חובה'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [form])

  const reset = useCallback(() => {
    clearProposalDraft()
    generateRef().then((ref) => setForm(withDerived({ ref, ...DEFAULTS })))
    setErrors({})
    setDraftRestored(false)
  }, [])

  const replaceForm = useCallback((values: Partial<NewProposalForm>) => {
    setForm((current) => withDerived({ ...current, ...values } as NewProposalForm))
    setErrors({})
  }, [])

  return { form, update, replaceForm, validate, errors, reset, draftRestored }
}
