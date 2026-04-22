import { useState, useEffect, useCallback } from 'react'
import type { NewProposalForm, ProposalLanguage } from '../types/proposals'
import { generateRef } from '../lib/admin-service'

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
  psh: 5.0,
  pr: 0.78,
  tariff_thb: 4.40,
  annual_kwh: 0,
  monthly_kwh: 0,
  monthly_savings_thb: 0,
  annual_savings_thb: 0,
  total_price_thb: 0,
  tax_deduction_thb: 200000,
  payback_no_tax: 0,
  payback_with_tax: 0,
  savings_25yr_thb: 0,
  // deal options (v3)
  ppa_rate_thb_per_kwh: 4.50,
  ppa_years: 15,
  battery_price_thb: 150000,
  battery_kwh_extra: 10,
  co2_factor: 0.5,
  monthly_bill_thb: 0,
  // derived (v3)
  annual_bill_thb: 0,
  annual_bill_with_solar_thb: 0,
  co2_saved_kg: 0,
  savings_10yr_thb: 0,
  language: 'he' as ProposalLanguage,
}

function calcDerived(form: NewProposalForm): Partial<NewProposalForm> {
  const annual_kwh = Math.round(form.system_size_kwp * form.psh * 365 * form.pr)
  const monthly_kwh = Math.round(annual_kwh / 12)
  const monthly_savings_thb = Math.round(monthly_kwh * form.tariff_thb)
  const annual_savings_thb = monthly_savings_thb * 12
  const payback_no_tax = annual_savings_thb > 0
    ? Math.round((form.total_price_thb / annual_savings_thb) * 10) / 10
    : 0
  const payback_with_tax = annual_savings_thb > 0
    ? Math.round(((form.total_price_thb - form.tax_deduction_thb) / annual_savings_thb) * 10) / 10
    : 0
  const savings_25yr_thb = annual_savings_thb * 25

  // v3 derived
  const annual_bill_thb = form.monthly_bill_thb * 12
  const annual_bill_with_solar_thb = Math.max(0, annual_bill_thb - annual_savings_thb)
  const co2_saved_kg = Math.round(annual_kwh * form.co2_factor)
  const savings_10yr_thb = annual_savings_thb * 10

  return {
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

export function useNewProposalForm() {
  const [form, setForm] = useState<NewProposalForm>({ ref: '', ...DEFAULTS })
  const [errors, setErrors] = useState<Partial<Record<keyof NewProposalForm, string>>>({})

  // Generate ref on mount
  useEffect(() => {
    generateRef().then((ref) => setForm((f) => ({ ...f, ref })))
  }, [])

  // Auto-recalculate derived fields whenever inputs change
  useEffect(() => {
    const derived = calcDerived(form)
    setForm((f) => ({ ...f, ...derived }))
  // Only recalculate when these specific inputs change — not on every form change
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    form.system_size_kwp,
    form.psh,
    form.pr,
    form.tariff_thb,
    form.total_price_thb,
    form.tax_deduction_thb,
    form.monthly_bill_thb,
    form.co2_factor,
  ])

  const update = useCallback(<K extends keyof NewProposalForm>(key: K, value: NewProposalForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
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
    generateRef().then((ref) => setForm({ ref, ...DEFAULTS }))
    setErrors({})
  }, [])

  return { form, update, validate, errors, reset }
}
