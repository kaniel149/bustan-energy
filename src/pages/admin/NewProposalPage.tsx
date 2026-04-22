import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, ChevronLeft, Info } from 'lucide-react'
import { useNewProposalForm } from '../../hooks/useNewProposalForm'
import { useAdminStore } from '../../lib/admin-store'
import { getSession } from '../../lib/admin-auth'
import { LOCATION_PRESETS } from '../../types/proposals'
import { FormField, Input, Select } from '../../components/admin/FormField'
import { RoofImageUploader } from '../../components/admin/RoofImageUploader'
import { ProposalSuccessModal } from '../../components/admin/ProposalSuccessModal'
import { supabase } from '../../lib/supabase'
import type { CrmProject } from '../../types/crm'

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-7 h-7 rounded-lg bg-[#E8A820]/10 border border-[#E8A820]/20 flex items-center justify-center text-xs font-bold text-[#E8A820]">
        {number}
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
      {children}
    </div>
  )
}

interface CalcRowProps {
  label: string
  value: string
  highlight?: boolean
}

function CalcRow({ label, value, highlight }: CalcRowProps) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-white/5 last:border-0 ${highlight ? 'text-[#E8A820]' : ''}`}>
      <span className="text-sm text-white/50">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#E8A820]' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}

interface SuccessResult {
  ref: string
  password: string
}

export default function NewProposalPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showToast = useAdminStore((s) => s.showToast)
  const { form, update, validate, errors, reset, draftRestored } = useNewProposalForm()

  const [submitting, setSubmitting] = useState(false)
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null)
  const [prefillLead, setPrefillLead] = useState<CrmProject | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)

  // Warn user before leaving with unsaved work
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.client_name || form.total_price_thb > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [form.client_name, form.total_price_thb])

  // Pre-fill from CRM lead when lead_id is in URL
  useEffect(() => {
    const leadId = searchParams.get('lead_id')
    if (!leadId || !supabase) return

    supabase
      .from('projects')
      .select('*')
      .eq('id', leadId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        const lead = data as CrmProject
        setPrefillLead(lead)

        if (lead.client_name) update('client_name', lead.client_name)
        if (lead.client_phone) update('client_phone', lead.client_phone)
        if (lead.client_email) update('client_email', lead.client_email)
        if (lead.system_size_kwp) update('system_size_kwp', lead.system_size_kwp)
        if (lead.panel_count) update('panel_count', lead.panel_count)
        if (lead.panel_model) update('panel_model', lead.panel_model)
        if (lead.inverter_model) update('inverter_model', lead.inverter_model)
        if (lead.battery_model) update('battery_model', lead.battery_model)

        // Pre-calculate monthly savings from deal_value as proxy for monthly bill
        if (lead.monthly_consumption && lead.electricity_rate) {
          const estimatedMonthlySavings = Math.round(lead.monthly_consumption * lead.electricity_rate * 0.9)
          update('monthly_savings_thb', estimatedMonthlySavings)
        }

        // Try to match location to a preset
        if (lead.property_address) {
          const addr = lead.property_address.toLowerCase()
          if (addr.includes('phangan') || addr.includes('pha ngan')) {
            update('location_preset', 'koh_phangan')
          } else if (addr.includes('samui')) {
            update('location_preset', 'koh_samui')
          } else if (addr.includes('bangkok') || addr.includes('bkk')) {
            update('location_preset', 'bangkok')
          } else {
            update('location_preset', 'custom')
            update('location_custom', lead.property_address)
          }
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill from URL query params (used by PropertySidebar, Tools, etc.)
  useEffect(() => {
    const fields: Array<keyof typeof form> = [
      'client_name', 'client_phone', 'client_email',
      'system_size_kwp', 'panel_count', 'total_price_thb',
      'annual_savings_thb', 'monthly_savings_thb',
    ]
    fields.forEach((f) => {
      const v = searchParams.get(f as string)
      if (v) update(f, isNaN(Number(v)) ? v : Number(v))
    })
    const loc = searchParams.get('location')
    if (loc) {
      const lc = loc.toLowerCase()
      if (lc.includes('phangan')) update('location_preset', 'koh_phangan')
      else if (lc.includes('samui')) update('location_preset', 'koh_samui')
      else if (lc.includes('bangkok')) update('location_preset', 'bangkok')
      else { update('location_preset', 'custom'); update('location_custom', loc) }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedLocation = () => {
    if (form.location_preset === 'custom') return form.location_custom
    const preset = LOCATION_PRESETS[form.location_preset]
    return preset?.en ?? form.location_preset
  }

  const handleSubmit = async () => {
    if (!validate()) {
      showToast('יש למלא את כל השדות החובה', 'error')
      return
    }

    setSubmitting(true)
    try {
      const session = await getSession()
      const token = session?.access_token

      const locationKey = form.location_preset === 'custom' ? 'custom' : form.location_preset
      const preset = LOCATION_PRESETS[locationKey]

      const payload = {
        ref: form.ref,
        client_name: form.client_name,
        client_phone: form.client_phone || undefined,
        client_email: form.client_email || undefined,
        location_he: form.location_preset === 'custom' ? form.location_custom : preset?.he,
        location_en: form.location_preset === 'custom' ? form.location_custom : preset?.en,
        location_short: form.location_preset === 'custom' ? form.location_custom : preset?.short,
        location_psh: form.location_preset === 'custom' ? form.location_custom : preset?.psh,
        system_size_kwp: form.system_size_kwp,
        panel_count: form.panel_count,
        panel_watt: form.panel_watt,
        panel_model: form.panel_model,
        inverter_model: form.inverter_model,
        battery_model: form.battery_model,
        battery_kwh: form.battery_kwh,
        annual_kwh: form.annual_kwh,
        monthly_kwh: form.monthly_kwh,
        monthly_savings_thb: form.monthly_savings_thb,
        annual_savings_thb: form.annual_savings_thb,
        total_price_thb: form.total_price_thb,
        payback_no_tax: form.payback_no_tax,
        payback_with_tax: form.payback_with_tax,
        savings_25yr_thb: form.savings_25yr_thb,
        roof_original_url: form.roof_original_url || undefined,
        roof_panels_url: form.roof_panels_url || undefined,
        language: form.language,
        // v3 deal options
        ppa_rate_thb_per_kwh: form.ppa_rate_thb_per_kwh,
        ppa_years: form.ppa_years,
        battery_price_thb: form.battery_price_thb,
        battery_kwh_extra: form.battery_kwh_extra,
        co2_factor: form.co2_factor,
        monthly_bill_thb: form.monthly_bill_thb,
        // AI roof analysis (if available)
        ai_analysis: aiAnalysis || undefined,
      }

      const res = await fetch('/api/admin-create-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { ok: boolean; ref: string; password: string }
      if (!data.ok) throw new Error('API returned not ok')

      setSuccessResult({ ref: data.ref, password: data.password })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה ביצירת הצעה'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (successResult) {
    return (
      <ProposalSuccessModal
        ref={successResult.ref}
        password={successResult.password}
        clientName={form.client_name}
        clientPhone={form.client_phone || undefined}
        clientEmail={form.client_email || undefined}
        onCreateAnother={() => { setSuccessResult(null); reset() }}
        onClose={() => { reset(); navigate('/admin/proposals') }}
      />
    )
  }

  return (
    <div dir="rtl" className="p-6 max-w-[860px] mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/admin')}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
          aria-label="חזור"
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">הצעה חדשה</h1>
          <p className="text-sm text-white/40 mt-0.5">TM Energy — Solar Proposal</p>
        </div>
      </div>

      {/* Pre-fill banner */}
      {prefillLead && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/25 mb-6">
          <Info size={15} className="text-[#E8A820] shrink-0" />
          <p className="text-sm text-[#E8A820]">
            מולא אוטומטית מלid ה-CRM של {prefillLead.client_name}
            {prefillLead.business_type ? ` (${prefillLead.business_type})` : ''}
          </p>
        </div>
      )}

      {/* Draft restored banner */}
      {draftRestored && !prefillLead && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 mb-6">
          <div className="flex items-center gap-3">
            <Info size={15} className="text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">
              שוחזרה טיוטה אוטומטית (נשמר ב-24ה׳ האחרונות)
            </p>
          </div>
          <button
            onClick={reset}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            התחל חדש
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Section A — Client Info */}
        <Section>
          <SectionTitle number="א" title="פרטי לקוח" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="מספר הצעה" required>
              <Input
                value={form.ref}
                onChange={(e) => update('ref', e.target.value)}
                placeholder="TM-2026-0042"
                hasError={!!errors.ref}
                dir="ltr"
              />
            </FormField>

            <FormField label="שם לקוח" required>
              <Input
                value={form.client_name}
                onChange={(e) => update('client_name', e.target.value)}
                placeholder="שם מלא"
                hasError={!!errors.client_name}
              />
            </FormField>

            <FormField label="טלפון">
              <Input
                type="tel"
                value={form.client_phone}
                onChange={(e) => update('client_phone', e.target.value)}
                placeholder="+66 xx xxx xxxx"
                dir="ltr"
              />
            </FormField>

            <FormField label="אימייל">
              <Input
                type="email"
                value={form.client_email}
                onChange={(e) => update('client_email', e.target.value)}
                placeholder="client@email.com"
                dir="ltr"
              />
            </FormField>

            <FormField label="מיקום" className="sm:col-span-2">
              <Select
                value={form.location_preset}
                onChange={(e) => update('location_preset', e.target.value as typeof form.location_preset)}
              >
                <option value="koh_phangan">Koh Phangan</option>
                <option value="koh_samui">Koh Samui</option>
                <option value="bangkok">Bangkok</option>
                <option value="custom">מיקום מותאם...</option>
              </Select>
              {form.location_preset === 'custom' && (
                <Input
                  className="mt-2"
                  value={form.location_custom}
                  onChange={(e) => update('location_custom', e.target.value)}
                  placeholder="הכנס מיקום"
                  hasError={!!errors.location_custom}
                />
              )}
            </FormField>
          </div>
        </Section>

        {/* Section B — Roof Images */}
        <Section>
          <SectionTitle number="ב" title="תמונות גג + ניתוח AI" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <FormField label="הספק פאנל (W)" hint="ל-AI ולחישוב">
              <Select
                value={String(form.panel_watt)}
                onChange={(e) => {
                  const w = parseInt(e.target.value, 10)
                  update('panel_watt', w)
                  // Auto-update panel model name
                  const models: Record<number, string> = {
                    550: 'Jinko Tiger Pro 550W',
                    580: 'Jinko N-Type 580W',
                    600: 'Jinko Tiger Neo 600W',
                    620: 'Jinko Tiger Neo 620W',
                  }
                  if (models[w]) update('panel_model', models[w])
                }}
              >
                <option value="550">550W</option>
                <option value="580">580W</option>
                <option value="600">600W</option>
                <option value="620">620W (Tiger Neo)</option>
              </Select>
            </FormField>
            <FormField label="מספר פאנלים">
              <Input
                type="number"
                value={form.panel_count}
                onChange={(e) => update('panel_count', parseInt(e.target.value, 10) || 0)}
                min={1}
              />
            </FormField>
          </div>
          <RoofImageUploader
            proposalRef={form.ref}
            panelCount={form.panel_count}
            panelWatt={form.panel_watt}
            originalUrl={form.roof_original_url}
            panelsUrl={form.roof_panels_url}
            onOriginalChange={(url) => update('roof_original_url', url)}
            onPanelsChange={(url) => update('roof_panels_url', url)}
            onAnalysis={(a) => {
              // Prefill system specs from AI roof analysis
              update('panel_count', a.suggested_panel_count)
              update('system_size_kwp', a.suggested_system_kwp)
              update('annual_kwh', a.estimated_annual_kwh)
              // Keep full analysis for metadata on submit
              setAiAnalysis(a)
            }}
          />
        </Section>

        {/* Section C — System Specs */}
        <Section>
          <SectionTitle number="ג" title="מפרט מערכת" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormField label="גודל מערכת (kWp)" required>
              <Input
                type="number"
                step="0.01"
                value={form.system_size_kwp}
                onChange={(e) => update('system_size_kwp', parseFloat(e.target.value) || 0)}
                hasError={!!errors.system_size_kwp}
                dir="ltr"
              />
            </FormField>

            <FormField label="מספר פאנלים">
              <Input
                type="number"
                value={form.panel_count}
                onChange={(e) => update('panel_count', parseInt(e.target.value, 10) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="הספק פאנל (W)">
              <Input
                type="number"
                value={form.panel_watt}
                onChange={(e) => update('panel_watt', parseInt(e.target.value, 10) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="דגם פאנל" className="sm:col-span-2">
              <Input
                value={form.panel_model}
                onChange={(e) => update('panel_model', e.target.value)}
                placeholder="Jinko N-Type 580W"
                dir="ltr"
              />
            </FormField>

            <FormField label="דגם אינוורטר" className="sm:col-span-2">
              <Input
                value={form.inverter_model}
                onChange={(e) => update('inverter_model', e.target.value)}
                placeholder="Huawei SUN2000-12KTL-M2"
                dir="ltr"
              />
            </FormField>

            <FormField label="סוללה kWh">
              <Input
                type="number"
                value={form.battery_kwh}
                onChange={(e) => update('battery_kwh', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="דגם סוללה" className="sm:col-span-2">
              <Input
                value={form.battery_model}
                onChange={(e) => update('battery_model', e.target.value)}
                placeholder="Huawei LUNA2000-10-S0"
                dir="ltr"
              />
            </FormField>
          </div>
        </Section>

        {/* Section D — Production & Savings */}
        <Section>
          <SectionTitle number="ד" title="ייצור וחיסכון" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <FormField label="PSH (שעות שיא)" hint="ברירת מחדל: 5.0 לתאילנד">
              <Input
                type="number"
                step="0.1"
                value={form.psh}
                onChange={(e) => update('psh', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="PR (יחס ביצועים)" hint="ברירת מחדל: 0.78">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.pr}
                onChange={(e) => update('pr', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="תעריף חשמל (THB/kWh)" hint="ברירת מחדל: 4.40">
              <Input
                type="number"
                step="0.01"
                value={form.tariff_thb}
                onChange={(e) => update('tariff_thb', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>
          </div>

          {/* Calculated results */}
          <div className="rounded-xl bg-[#E8A820]/5 border border-[#E8A820]/15 p-4">
            <p className="text-xs text-[#E8A820]/60 uppercase tracking-wider mb-3">חישוב אוטומטי</p>
            <CalcRow label="ייצור שנתי" value={`${form.annual_kwh.toLocaleString()} kWh`} />
            <CalcRow label="ייצור חודשי" value={`${form.monthly_kwh.toLocaleString()} kWh`} />
            <CalcRow label="חיסכון חודשי" value={`฿${form.monthly_savings_thb.toLocaleString()}`} highlight />
            <CalcRow label="חיסכון שנתי" value={`฿${form.annual_savings_thb.toLocaleString()}`} highlight />
          </div>
        </Section>

        {/* Section E — Price & ROI */}
        <Section>
          <SectionTitle number="ה" title="מחיר ורוווחיות" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <FormField label="מחיר כולל (THB)" required>
              <Input
                type="number"
                value={form.total_price_thb || ''}
                onChange={(e) => update('total_price_thb', parseFloat(e.target.value) || 0)}
                placeholder="450000"
                hasError={!!errors.total_price_thb}
                dir="ltr"
              />
            </FormField>

            <FormField label="ניכוי מס (THB)" hint="ברירת מחדל: ฿200,000">
              <Input
                type="number"
                value={form.tax_deduction_thb}
                onChange={(e) => update('tax_deduction_thb', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>
          </div>

          {/* ROI Results */}
          <div className="rounded-xl bg-[#E8A820]/5 border border-[#E8A820]/15 p-4">
            <p className="text-xs text-[#E8A820]/60 uppercase tracking-wider mb-3">ROI אוטומטי</p>
            <CalcRow label="החזר השקעה (ללא מס)" value={`${form.payback_no_tax} שנים`} />
            <CalcRow label="החזר השקעה (עם ניכוי מס)" value={`${form.payback_with_tax} שנים`} highlight />
            <CalcRow label="חיסכון ב-25 שנה" value={`฿${form.savings_25yr_thb.toLocaleString()}`} highlight />
          </div>
        </Section>

        {/* Section F — Deal Options (v3) */}
        <Section>
          <SectionTitle number="ו" title="אפשרויות עסקה (v3)" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <FormField label="תעריף PPA (฿/kWh)" hint="ברירת מחדל: 4.50">
              <Input
                type="number"
                step="0.01"
                value={form.ppa_rate_thb_per_kwh}
                onChange={(e) => update('ppa_rate_thb_per_kwh', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="תקופת PPA (שנים)" hint="ברירת מחדל: 15">
              <Input
                type="number"
                value={form.ppa_years}
                onChange={(e) => update('ppa_years', parseInt(e.target.value, 10) || 15)}
                dir="ltr"
              />
            </FormField>

            <FormField label="תוספת מחיר סוללה (฿)" hint="ברירת מחדל: 150,000">
              <Input
                type="number"
                value={form.battery_price_thb}
                onChange={(e) => update('battery_price_thb', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="קיבולת סוללה (kWh)" hint="ברירת מחדל: 10">
              <Input
                type="number"
                step="0.5"
                value={form.battery_kwh_extra}
                onChange={(e) => update('battery_kwh_extra', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="גורם CO₂ (ק״ג/kWh)" hint="ברירת מחדל: 0.5 לתאילנד">
              <Input
                type="number"
                step="0.01"
                value={form.co2_factor}
                onChange={(e) => update('co2_factor', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="חשבון חשמל חודשי (฿)" hint="לגרף חיסכון">
              <Input
                type="number"
                value={form.monthly_bill_thb || ''}
                onChange={(e) => update('monthly_bill_thb', parseFloat(e.target.value) || 0)}
                placeholder="0"
                dir="ltr"
              />
            </FormField>
          </div>

          {/* v3 auto-calc preview */}
          <div className="rounded-xl bg-[#1A7A5A]/5 border border-[#1A7A5A]/15 p-4">
            <p className="text-xs text-[#1A7A5A]/60 uppercase tracking-wider mb-3">חישוב v3 אוטומטי</p>
            <CalcRow label="מחיר אופציה ג (EPC+סוללה)" value={`฿${(form.total_price_thb + form.battery_price_thb).toLocaleString()}`} />
            <CalcRow label="CO₂ נחסך בשנה" value={`${form.co2_saved_kg.toLocaleString()} ק״ג`} highlight />
            <CalcRow label="חיסכון 10 שנה" value={`฿${form.savings_10yr_thb.toLocaleString()}`} highlight />
            <CalcRow label="חשבון חשמל שנתי" value={`฿${form.annual_bill_thb.toLocaleString()}`} />
            <CalcRow label="חשמל שנתי עם סולאר" value={`฿${form.annual_bill_with_solar_thb.toLocaleString()}`} />
          </div>
        </Section>

        {/* Section G — Language & Submit */}
        <Section>
          <SectionTitle number="ז" title="שפה ואישור" />

          <div className="mb-6">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">שפת ההצעה</p>
            <div className="flex gap-3">
              {([
                { value: 'he', label: 'עברית', flag: '🇮🇱' },
                { value: 'en', label: 'English', flag: '🇺🇸' },
                { value: 'th', label: 'ภาษาไทย', flag: '🇹🇭' },
              ] as const).map(({ value, label, flag }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('language', value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.language === value
                      ? 'bg-[#E8A820]/10 border-[#E8A820]/30 text-[#E8A820]'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span>{flag}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary preview */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6 text-sm">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">סיכום</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <span className="text-white/40">לקוח:</span>
              <span className="text-white">{form.client_name || '—'}</span>
              <span className="text-white/40">מיקום:</span>
              <span className="text-white">{resolvedLocation() || '—'}</span>
              <span className="text-white/40">מערכת:</span>
              <span className="text-white">{form.system_size_kwp} kWp / {form.panel_count} פאנלים</span>
              <span className="text-white/40">מחיר:</span>
              <span className="text-[#E8A820] font-semibold">฿{form.total_price_thb.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E8A820] to-[#E85D3A] text-white font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                יוצר הצעה...
              </>
            ) : (
              'צור הצעה'
            )}
          </button>
        </Section>
      </div>
    </div>
  )
}
