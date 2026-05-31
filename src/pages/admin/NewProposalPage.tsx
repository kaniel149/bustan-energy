import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { Loader2, ChevronLeft, Info, RefreshCw, AlertTriangle } from 'lucide-react'
import { useNewProposalForm } from '../../hooks/useNewProposalForm'
import { useAdminStore } from '../../lib/admin-store'
import { getSession } from '../../lib/admin-auth'
import { LOCATION_PRESETS, type NewProposalForm } from '../../types/proposals'
import { PANEL_MODELS, INVERTER_MODELS, BATTERY_MODELS, groupInverters, groupPanels, groupBatteries } from '../../constants/equipment'
import { FormField, Input, Select } from '../../components/admin/FormField'
import { RoofImageUploader } from '../../components/admin/RoofImageUploader'
import type { RoofAnalysisResult } from '../../components/admin/RoofImageUploader'
import { generatePanelOverlay } from '../../lib/roof-overlay'
import { ProposalSuccessModal } from '../../components/admin/ProposalSuccessModal'
import { supabase } from '../../lib/supabase'
import type { CrmProject } from '../../types/crm'
import { fetchProposal } from '../../lib/admin-service'
import { fetchBustanLeads, mapLeadToProperty } from '../../lib/bustan-crm-service'
import { getSatelliteImageUrl } from '../../lib/enrich-building'
import { computePanelLayout, layoutToSvg } from '../../lib/panel-layout'

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
    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 sm:p-6">
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

interface BomSupplierSummary {
  catalog_captured_at?: string
  catalog_total_items?: number
  supplier_matched_rows: number
  live_rows: number
  expired_rows: number
  benchmark_rows: number
  supplier_materials_thb?: number
  benchmark_materials_thb?: number
}

function inferLocationFields(location: string | null | undefined): Pick<NewProposalForm, 'location_preset' | 'location_custom'> {
  const value = location || ''
  const lc = value.toLowerCase()
  if (lc.includes('phangan') || lc.includes('pha ngan') || value.includes('פנגאן')) {
    return { location_preset: 'koh_phangan', location_custom: '' }
  }
  if (lc.includes('samui') || value.includes('סמוי')) {
    return { location_preset: 'koh_samui', location_custom: '' }
  }
  if (lc.includes('bangkok') || lc.includes('bkk') || value.includes('בנגקוק')) {
    return { location_preset: 'bangkok', location_custom: '' }
  }
  return { location_preset: 'custom', location_custom: value }
}

function numberFromMetadata(metadata: Record<string, unknown> | null, key: string, fallback = 0): number {
  const value = metadata?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function boolFromMetadata(metadata: Record<string, unknown> | null, key: string, fallback = false): boolean {
  const value = metadata?.[key]
  return typeof value === 'boolean' ? value : fallback
}

/**
 * FIX 3 — derive a [lng, lat] centroid from a GeoJSON Polygon or MultiPolygon.
 * For MultiPolygon, uses the largest ring (by coordinate count) as representative.
 * Returns null if the geometry is invalid or empty.
 */
function polygonCentroid(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): [number, number] | null {
  let ring: number[][] | null = null

  if (geom.type === 'Polygon') {
    ring = (geom.coordinates[0] as number[][]) ?? null
  } else if (geom.type === 'MultiPolygon') {
    // Pick the outer ring of the largest polygon (most coordinates)
    let maxLen = 0
    for (const poly of geom.coordinates) {
      const outer = poly[0] as number[][]
      if (outer && outer.length > maxLen) { maxLen = outer.length; ring = outer }
    }
  }

  if (!ring || ring.length === 0) return null

  let sumLng = 0, sumLat = 0
  for (const coord of ring) { sumLng += coord[0]; sumLat += coord[1] }
  return [sumLng / ring.length, sumLat / ring.length]
}

function monthlyLoanPayment(principal: number, annualInterestPct: number, years: number): number {
  const months = Math.max(1, Math.round(years * 12))
  const monthlyRate = Math.max(0, annualInterestPct) / 100 / 12
  if (principal <= 0) return 0
  if (monthlyRate === 0) return principal / months
  const factor = (1 + monthlyRate) ** months
  return principal * monthlyRate * factor / (factor - 1)
}

export default function NewProposalPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { ref: editRef } = useParams<{ ref?: string }>()
  const isEditMode = Boolean(editRef)
  const showToast = useAdminStore((s) => s.showToast)
  // Disable localStorage draft-restore whenever the form is hydrated from a
  // source (edit ref / property_id / lead_id). Otherwise a stale cross-tab
  // draft can race and clobber the hydrated panel_count → wrong system size.
  const isHydratedFromSource = isEditMode || Boolean(searchParams.get('property_id')) || Boolean(searchParams.get('lead_id'))
  const { form, update, replaceForm, validate, errors, reset, draftRestored } = useNewProposalForm({ draftEnabled: !isHydratedFromSource })

  const [submitting, setSubmitting] = useState(false)
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null)
  const [prefillLead, setPrefillLead] = useState<CrmProject | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<RoofAnalysisResult | null>(null)
  const [bomPriceBasis, setBomPriceBasis] = useState<BomSupplierSummary | null>(null)
  const [bomPriceSnapshot, setBomPriceSnapshot] = useState<Record<string, unknown> | null>(null)
  const [editLoading, setEditLoading] = useState(isEditMode)

  // ── On-roof preview generator state ────────────────────────────────────────
  // 'idle'     = waiting for roof coords to arrive (or already has panels url)
  // 'pending'  = satellite fetch + Gemini call in-flight (~30-60s)
  // 'done'     = completed successfully
  // 'fallback' = Gemini timed-out / errored — showing schematic SVG + retry hint
  // 'no_coords'= no roof_lat/lng available — nothing to auto-generate
  type PreviewStatus = 'idle' | 'pending' | 'done' | 'fallback' | 'no_coords'
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle')
  const [previewError, setPreviewError] = useState('')
  // Guard: run auto-trigger at most once per page load
  const autoTriggeredRef = useRef(false)

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

  // Load an existing proposal when opened via /admin/proposals/:ref/edit.
  useEffect(() => {
    if (!editRef) return
    let cancelled = false
    setEditLoading(true)
    fetchProposal(editRef)
      .then((proposal) => {
        if (cancelled) return
        if (!proposal) {
          showToast('הצעה לא נמצאה לעריכה', 'error')
          navigate('/admin/proposals')
          return
        }

        const metadata = proposal.metadata || {}
        const pricing = typeof metadata.pricing === 'object' && metadata.pricing !== null
          ? metadata.pricing as Record<string, unknown>
          : {}
        const priceSnapshot = typeof pricing.bom_price_snapshot === 'object' && pricing.bom_price_snapshot !== null
          ? pricing.bom_price_snapshot as Record<string, unknown>
          : null
        const supplierSummary = typeof priceSnapshot?.supplier_summary === 'object' && priceSnapshot.supplier_summary !== null
          ? priceSnapshot.supplier_summary as BomSupplierSummary
          : null
        const financing = typeof metadata.financing === 'object' && metadata.financing !== null
          ? metadata.financing as Record<string, unknown>
          : {}

        replaceForm({
          ref: proposal.ref_number,
          client_name: proposal.client_name || '',
          client_phone: proposal.client_phone || '',
          client_email: proposal.client_email || '',
          ...inferLocationFields(proposal.location),
          roof_original_url: typeof metadata.roof_original_url === 'string' ? metadata.roof_original_url : '',
          roof_panels_url: typeof metadata.roof_panels_url === 'string' ? metadata.roof_panels_url : '',
          panel_count: proposal.panel_count || 0,
          panel_model: proposal.panel_model || '',
          panel_watt: proposal.panel_watt || 580,
          inverter_model: proposal.inverter_model || '',
          battery_model: proposal.battery_model || '',
          battery_kwh: proposal.battery_kwh || 0,
          total_price_thb: proposal.total_price_thb || 0,
          psh: numberFromMetadata(metadata, 'psh', 5),
          pr: numberFromMetadata(metadata, 'pr', 0.747),
          tariff_thb: numberFromMetadata(metadata, 'tariff_thb', 4.4),
          tax_deduction_thb: numberFromMetadata(metadata, 'tax_deduction_thb', 0),
          price_markup: typeof pricing.price_markup === 'number' ? pricing.price_markup : 1.35,
          bom_cost_thb: typeof pricing.bom_cost_thb === 'number' ? pricing.bom_cost_thb : 0,
          ppa_rate_thb_per_kwh: numberFromMetadata(metadata, 'ppa_rate_thb_per_kwh', 4.2),
          ppa_years: numberFromMetadata(metadata, 'ppa_years', 15),
          battery_price_thb: numberFromMetadata(metadata, 'battery_price_thb', 150000),
          battery_kwh_extra: numberFromMetadata(metadata, 'battery_kwh_extra', 10),
          co2_factor: numberFromMetadata(metadata, 'co2_factor', 0.486),
          monthly_bill_thb: numberFromMetadata(metadata, 'monthly_bill_thb', 0),
          financing_enabled: boolFromMetadata(financing, 'enabled', true),
          financing_ltv_pct: typeof financing.ltv_pct === 'number' ? financing.ltv_pct : 70,
          financing_interest_pct: typeof financing.interest_pct === 'number' ? financing.interest_pct : 6.5,
          financing_years: typeof financing.years === 'number' ? financing.years : 10,
          financing_om_pct: typeof financing.om_pct === 'number' ? financing.om_pct : 1,
          language: proposal.language || 'he',
        })
        setBomPriceSnapshot(priceSnapshot)
        setBomPriceBasis(supplierSummary)
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : 'שגיאה בטעינת הצעה לעריכה', 'error')
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false)
      })

    return () => { cancelled = true }
  }, [editRef, navigate, replaceForm, showToast])

  // Pre-fill from CRM lead when lead_id is in URL
  useEffect(() => {
    if (isEditMode) return
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
  }, [isEditMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill from URL query params (used by PropertySidebar, Tools, etc.)
  useEffect(() => {
    if (isEditMode) return
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
  }, [isEditMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate from a full Property when property_id is in the URL.
  // This is the canonical path from PropertySidebar — it carries roofGeom,
  // authoritative kWp (from crm_pipeline), area, and centroid coords.
  // Falls back gracefully to the scalar params already applied above if the
  // fetch fails (e.g. Bustan not configured / auth missing).
  useEffect(() => {
    if (isEditMode) return
    const propertyId = searchParams.get('property_id')
    if (!propertyId) return

    let cancelled = false
    fetchBustanLeads()
      .then((leads) => {
        if (cancelled) return
        const lead = leads.find((l) => l.property.id === propertyId)
        if (!lead) {
          console.warn('[NewProposalPage] property_id not found in Bustan leads — using scalar params fallback', propertyId)
          return
        }
        const prop = mapLeadToProperty(lead)

        // Build location fields from the property
        const locationFields = inferLocationFields(prop.location)

        // FIX 1: system_size_kwp is DERIVED (calcDerived recomputes it from
        // panel_count × panel_watt on every replaceForm/update), so setting it
        // directly is futile — it is always overwritten.  Drive from panel_count
        // instead.  If panelCount is absent, derive it from capacityKwp.
        const effectivePanelCount = prop.panelCount != null
          ? prop.panelCount
          : prop.capacityKwp != null
            ? Math.round((prop.capacityKwp * 1000) / 580)
            : null

        // FIX 3: If lat or lng is 0 (unset) but we have a roof polygon, derive
        // the centroid from the outer ring rather than embedding a (0,0) coord.
        let roofLat: number | null = (prop.lat && prop.lat !== 0) ? prop.lat : null
        let roofLng: number | null = (prop.lng && prop.lng !== 0) ? prop.lng : null

        if ((!roofLat || !roofLng) && prop.roofGeom) {
          try {
            const centroid = polygonCentroid(prop.roofGeom)
            if (centroid) { roofLat = centroid[1]; roofLng = centroid[0] }
          } catch (centroidErr) {
            console.warn('[NewProposalPage] centroid derivation failed', centroidErr)
          }
        }

        replaceForm({
          client_name: prop.ownerName || '',
          client_phone: prop.phone || '',
          client_email: prop.email || '',
          ...locationFields,
          // Drive system_size_kwp via panel_count so calcDerived reproduces it.
          // Do NOT set system_size_kwp directly — calcDerived will override it.
          ...(effectivePanelCount != null ? { panel_count: effectivePanelCount } : {}),
          // Roof geometry carried forward
          roof_polygon: prop.roofGeom ?? null,
          roof_lat: roofLat,
          roof_lng: roofLng,
          roof_area_sqm: prop.area ?? null,
        })

        // FIX 1 (divergence check): after replaceForm, calcDerived will set
        // system_size_kwp = panel_count × panel_watt / 1000.  Verify this is
        // within 5% of the authoritative capacityKwp from CRM; warn if not.
        if (prop.capacityKwp != null && effectivePanelCount != null) {
          const derivedKwp = Math.round((effectivePanelCount * 580) / 1000 * 100) / 100
          const pct = Math.abs(derivedKwp - prop.capacityKwp) / prop.capacityKwp
          if (pct > 0.05) {
            console.warn(
              `[NewProposalPage] kWp divergence > 5%: panel_count-derived ${derivedKwp} kWp vs CRM authoritative ${prop.capacityKwp} kWp (${(pct * 100).toFixed(1)}%). Using panel_count-driven value.`,
            )
          }
        }
      })
      .catch((err: unknown) => {
        console.warn('[NewProposalPage] property_id fetch failed — using scalar params fallback', err)
      })

    return () => { cancelled = true }
  }, [isEditMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Shared generator: satellite image → Gemini overlay → storage URL ────────
  // Exported as a stable reference so the manual "Generate" button and the
  // auto-trigger both share the identical code path.
  const generateRoofPreview = async () => {
    // Require lat/lng — cannot proceed without coordinates
    if (!form.roof_lat || !form.roof_lng) {
      setPreviewStatus('no_coords')
      return
    }

    // FIX 4 + FIX 6: getSatelliteImageUrl returns a placeholder URL when
    // VITE_GOOGLE_PLACES_API_KEY is not set.  A placeholder URL:
    //   (a) would be written to roof_original_url and embedded in the
    //       client-rendered proposal (security — key-bearing URL in the HTML).
    //   (b) is CORS-blocked on the client (googleapis/mapbox).
    //   (c) costs a Gemini/GPU call for no useful image.
    // Short-circuit: skip the photorealistic path and jump to the schematic SVG.
    const satelliteUrl = getSatelliteImageUrl(form.roof_lat, form.roof_lng, 20, '600x400')
    const isPlaceholder = satelliteUrl.includes('placeholder')

    if (isPlaceholder) {
      // FIX 6: no usable satellite key — go straight to schematic fallback without
      // attempting a 30-60s Gemini pipeline call.
      if (form.roof_polygon) {
        setPreviewStatus('pending')
        setPreviewError('')
        try {
          const layout = computePanelLayout(form.roof_polygon, { wattage: form.panel_watt || 580 })
          if (layout.count > 0) {
            const svgStr = layoutToSvg(layout, { width: 600, height: 400 })
            const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
            update('roof_panels_url', svgDataUri)
            setPreviewStatus('fallback')
            setPreviewError('No satellite API key — showing schematic layout')
          } else {
            setPreviewStatus('no_coords')
          }
        } catch {
          setPreviewStatus('no_coords')
        }
      } else {
        setPreviewStatus('no_coords')
      }
      return
    }

    setPreviewStatus('pending')
    setPreviewError('')

    try {
      // Derive panel count: use form.panel_count if already set, else infer from kWp.
      const effectivePanelCount =
        form.panel_count > 0
          ? form.panel_count
          : Math.max(1, Math.round((form.system_size_kwp * 1000) / (form.panel_watt || 580)))

      // FIX 4: Do NOT write the satellite provider URL to roof_original_url.
      // That would embed a key-bearing/provider URL into the persisted proposal
      // HTML (<img {{roof_original_url}}>) which is a security issue.
      // Instead, pass the satellite URL to generatePanelOverlay with serverFetch:true
      // so the server fetches it (no CORS, API key stays server-side) and the
      // returned panels URL is a clean storage URL that we set as roof_panels_url.
      const panelsStorageUrl = await generatePanelOverlay({
        imageUrl: satelliteUrl,
        proposalRef: form.ref || 'draft',
        panelCount: effectivePanelCount,
        // serverFetch: true — server fetches the satellite URL (CORS-safe, key
        // never exposed in client storage or proposal HTML).
        serverFetch: true,
      })

      // Only set roof_original_url if we have a clean storage URL from the server.
      // (The server may return a URL it uploaded after fetching from the provider.)
      // For now we leave roof_original_url empty — the panels slot is sufficient.
      update('roof_panels_url', panelsStorageUrl)
      setPreviewStatus('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setPreviewError(msg)

      // Graceful schematic fallback: if roof_polygon is available, render
      // an SVG layout and use it as a data-URI for the panels slot.
      if (form.roof_polygon) {
        try {
          const layout = computePanelLayout(form.roof_polygon, {
            wattage: form.panel_watt || 580,
          })
          if (layout.count > 0) {
            const svgStr = layoutToSvg(layout, { width: 600, height: 400 })
            const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
            update('roof_panels_url', svgDataUri)
          }
        } catch {
          // SVG fallback also failed — leave roof_panels_url blank, just show hint
        }
      }

      setPreviewStatus('fallback')
    }
  }

  // ── Auto-trigger: run ONCE after roof_lat/lng arrive (from property_id hydration).
  //   Guards:
  //   1. Only in create mode (not edit)
  //   2. Only once per mount (autoTriggeredRef)
  //   3. Skip if roof_panels_url already set (edit mode reload, or user already
  //      uploaded manually)
  //   Watches form.roof_lat because the property_id effect sets it asynchronously.
  useEffect(() => {
    if (isEditMode) return
    if (autoTriggeredRef.current) return
    if (!form.roof_lat || !form.roof_lng) return
    // If panels URL is already set (draft restore or edit), skip auto-gen
    if (form.roof_panels_url) {
      setPreviewStatus('done')
      return
    }
    autoTriggeredRef.current = true
    void generateRoofPreview()
  }, [form.roof_lat, form.roof_lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const resolvedLocation = () => {
    if (form.location_preset === 'custom') return form.location_custom
    const preset = LOCATION_PRESETS[form.location_preset]
    return preset?.en ?? form.location_preset
  }

  const financingPreview = useMemo(() => {
    const loanAmount = Math.round(form.total_price_thb * (form.financing_ltv_pct / 100))
    const equity = Math.max(0, form.total_price_thb - loanAmount)
    const monthlyDebtService = monthlyLoanPayment(loanAmount, form.financing_interest_pct, form.financing_years)
    const annualDebtService = Math.round(monthlyDebtService * 12)
    const annualOm = Math.round(form.total_price_thb * (form.financing_om_pct / 100))
    const netOperatingBenefit = Math.max(0, form.annual_savings_thb - annualOm)
    const netAfterDebt = Math.round(netOperatingBenefit - annualDebtService)
    const dscr = annualDebtService > 0 ? netOperatingBenefit / annualDebtService : 0
    const equityPaybackYears = netAfterDebt > 0 ? equity / netAfterDebt : 0

    return {
      loanAmount,
      equity,
      annualDebtService,
      annualOm,
      netOperatingBenefit,
      netAfterDebt,
      dscr,
      equityPaybackYears,
    }
  }, [
    form.annual_savings_thb,
    form.financing_interest_pct,
    form.financing_ltv_pct,
    form.financing_om_pct,
    form.financing_years,
    form.total_price_thb,
  ])

  const handleSubmit = async () => {
    if (!validate()) {
      showToast('יש למלא את כל השדות החובה', 'error')
      return
    }

    if (form.bom_cost_thb > 0 && bomPriceBasis && (bomPriceBasis.expired_rows > 0 || bomPriceBasis.benchmark_rows > 0)) {
      const proceed = window.confirm(
        `BOM כולל ${bomPriceBasis.expired_rows} שורות עם מחיר שפג תוקף ו-${bomPriceBasis.benchmark_rows} שורות benchmark. להמשיך ליצור הצעה?`,
      )
      if (!proceed) return
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
        psh: form.psh,
        pr: form.pr,
        tariff_thb: form.tariff_thb,
        tax_deduction_thb: form.tax_deduction_thb,
        // v3 deal options
        ppa_rate_thb_per_kwh: form.ppa_rate_thb_per_kwh,
        ppa_years: form.ppa_years,
        battery_price_thb: form.battery_price_thb,
        battery_kwh_extra: form.battery_kwh_extra,
        co2_factor: form.co2_factor,
        monthly_bill_thb: form.monthly_bill_thb,
        // Bank financing model
        financing_enabled: form.financing_enabled,
        financing_ltv_pct: form.financing_ltv_pct,
        financing_interest_pct: form.financing_interest_pct,
        financing_years: form.financing_years,
        financing_om_pct: form.financing_om_pct,
        // Internal pricing snapshot for margin/audit. Not rendered to the client.
        bom_cost_thb: form.bom_cost_thb || undefined,
        price_markup: form.price_markup || undefined,
        bom_price_snapshot: bomPriceSnapshot || undefined,
        // AI roof analysis (if available)
        ai_analysis: aiAnalysis || undefined,
        // Roof geometry from the map draw — used by a later phase to auto-generate
        // the on-roof panel layout visual server-side. Server does not act on these yet.
        roof: (form.roof_polygon != null || form.roof_lat != null) ? {
          polygon: form.roof_polygon ?? undefined,
          lat: form.roof_lat ?? undefined,
          lng: form.roof_lng ?? undefined,
          area_sqm: form.roof_area_sqm ?? undefined,
        } : undefined,
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

      if (isEditMode) {
        showToast('ההצעה עודכנה ונוצר HTML חדש', 'success')
        navigate(`/admin/proposals/${data.ref}`)
        return
      }

      setSuccessResult({ ref: data.ref, password: data.password })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה ביצירת הצעה'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (successResult && !isEditMode) {
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
    <div dir="rtl" className="p-3 sm:p-6 max-w-[860px] mx-auto pb-24">
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
          <h1 className="text-xl font-bold text-white">{isEditMode ? 'עריכת הצעה' : 'הצעה חדשה'}</h1>
          <p className="text-sm text-white/40 mt-0.5">
            {isEditMode ? `${editRef} · שמירה תעדכן את ההצעה הקיימת` : 'Bustan Energy — Solar Proposal'}
          </p>
        </div>
      </div>

      {editLoading && (
        <div className="flex items-center justify-center py-14">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-[#E8A820]" />
            <p className="text-white/45 text-sm">טוען הצעה לעריכה...</p>
          </div>
        </div>
      )}

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
      {draftRestored && !prefillLead && !isEditMode && (
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

      {!editLoading && <div className="space-y-6">
        {/* Section A — Client Info */}
        <Section>
          <SectionTitle number="א" title="פרטי לקוח" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="מספר הצעה" required>
              <Input
                value={form.ref}
                onChange={(e) => update('ref', e.target.value)}
                placeholder="BU-2026-0042"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <FormField label="דגם פאנל" hint="בחר מהקטלוג או ערוך ידנית בסעיף ג">
              <Select
                value={(() => {
                  const match = PANEL_MODELS.find((p) => p.model === form.panel_model)
                  return match?.id || ''
                })()}
                onChange={(e) => {
                  const panel = PANEL_MODELS.find((p) => p.id === e.target.value)
                  if (panel) {
                    update('panel_model', panel.model)
                    update('panel_watt', panel.watt)
                  }
                }}
              >
                <option value="">— בחר דגם —</option>
                {Object.entries(groupPanels()).map(([brand, models]) => (
                  <optgroup key={brand} label={brand}>
                    {models.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.watt}W · {p.model.replace(`${p.watt}W`, '').trim()}
                      </option>
                    ))}
                  </optgroup>
                ))}
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
            propertyId={searchParams.get('property_id') || undefined}
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

          {/* On-roof preview status banner — shown only when map coords are present */}
          {(form.roof_lat != null || previewStatus !== 'idle') && (
            <div className="mt-4">
              {previewStatus === 'pending' && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#E8A820]/8 border border-[#E8A820]/20">
                  <Loader2 size={15} className="animate-spin text-[#E8A820] shrink-0" />
                  <p className="text-sm text-[#E8A820]/80">
                    מייצר תמונת גג עם פאנלים מהלוויין... (30-60 שניות)
                  </p>
                </div>
              )}

              {previewStatus === 'done' && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                  <p className="text-sm text-emerald-300">תמונת גג עם פאנלים נוצרה מהלוויין</p>
                  <button
                    type="button"
                    onClick={() => {
                      autoTriggeredRef.current = false
                      update('roof_panels_url', '')
                      void generateRoofPreview()
                    }}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw size={11} />
                    צור מחדש
                  </button>
                </div>
              )}

              {previewStatus === 'fallback' && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-300 mb-1">
                      לא ניתן לייצר תמונה פוטוריאליסטית
                      {form.roof_panels_url ? ' — מוצג תכנון סכמטי במקום' : ''}
                    </p>
                    {previewError && (
                      <p className="text-xs text-white/40 truncate" title={previewError}>{previewError.slice(0, 100)}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      autoTriggeredRef.current = false
                      update('roof_panels_url', '')
                      void generateRoofPreview()
                    }}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  >
                    <RefreshCw size={11} />
                    נסה שוב
                  </button>
                </div>
              )}

              {/* Manual trigger button — shown when coords exist but no auto-trigger has run yet */}
              {previewStatus === 'idle' && form.roof_lat != null && (
                <button
                  type="button"
                  onClick={() => {
                    autoTriggeredRef.current = true
                    void generateRoofPreview()
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8A820]/10 border border-[#E8A820]/20 text-[#E8A820] text-sm font-medium hover:bg-[#E8A820]/15 transition-colors"
                >
                  <RefreshCw size={14} />
                  צור תצוגה מקדימה של פאנלים על הגג
                </button>
              )}
            </div>
          )}
        </Section>

        {/* Section C — System Specs */}
        <Section>
          <SectionTitle number="ג" title="מפרט מערכת" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

            <FormField label="דגם פאנל" className="sm:col-span-3" hint="בחר מהקטלוג או ערוך ידנית למטה">
              <Select
                value={(() => {
                  const match = PANEL_MODELS.find((p) => p.model === form.panel_model)
                  return match?.id || ''
                })()}
                onChange={(e) => {
                  const panel = PANEL_MODELS.find((p) => p.id === e.target.value)
                  if (panel) {
                    update('panel_model', panel.model)
                    update('panel_watt', panel.watt)
                  }
                }}
              >
                <option value="">— בחר דגם —</option>
                {Object.entries(groupPanels()).map(([brand, models]) => (
                  <optgroup key={brand} label={brand}>
                    {models.map((p) => (
                      <option key={p.id} value={p.id}>{p.watt}W · {p.model}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <Input
                className="mt-2"
                value={form.panel_model}
                onChange={(e) => update('panel_model', e.target.value)}
                placeholder="או ערוך ידנית"
                dir="ltr"
              />
            </FormField>

            <FormField label="דגם אינוורטר" className="sm:col-span-3" hint="Huawei · DAYE · Sungrow · grid-tied + hybrid · 1φ + 3φ">
              <Select
                value={(() => {
                  const match = INVERTER_MODELS.find((i) => i.model === form.inverter_model)
                  return match?.id || ''
                })()}
                onChange={(e) => {
                  const inv = INVERTER_MODELS.find((i) => i.id === e.target.value)
                  if (inv) update('inverter_model', inv.model)
                }}
              >
                <option value="">— בחר אינוורטר —</option>
                {Object.entries(groupInverters()).map(([group, invs]) => (
                  <optgroup key={group} label={group}>
                    {invs.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.kw} kW · {inv.model}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <Input
                className="mt-2"
                value={form.inverter_model}
                onChange={(e) => update('inverter_model', e.target.value)}
                placeholder="או ערוך ידנית"
                dir="ltr"
              />
            </FormField>

            <FormField label="סוללה kWh" hint="0 = ללא סוללה">
              <Input
                type="number"
                value={form.battery_kwh}
                onChange={(e) => update('battery_kwh', parseFloat(e.target.value) || 0)}
                dir="ltr"
                step="0.1"
              />
            </FormField>

            <FormField label="דגם סוללה" className="sm:col-span-3" hint="Huawei · Pylontech · BYD · DAYE · Sungrow · LV+HV">
              <Select
                value={(() => {
                  const match = BATTERY_MODELS.find((b) => b.model === form.battery_model)
                  return match?.id || ''
                })()}
                onChange={(e) => {
                  const bat = BATTERY_MODELS.find((b) => b.id === e.target.value)
                  if (bat) {
                    update('battery_model', bat.model)
                    update('battery_kwh', bat.kwh)
                  }
                }}
              >
                <option value="">— בחר סוללה (או השאר ריק) —</option>
                {Object.entries(groupBatteries()).map(([group, bats]) => (
                  <optgroup key={group} label={group}>
                    {bats.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.kwh} kWh · {b.model} · {b.cycles.toLocaleString()} cyc
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <Input
                className="mt-2"
                value={form.battery_model}
                onChange={(e) => update('battery_model', e.target.value)}
                placeholder="או ערוך ידנית"
                dir="ltr"
              />
            </FormField>
          </div>
        </Section>

        {/* Section D — Production & Savings */}
        <Section>
          <SectionTitle number="ד" title="ייצור וחיסכון" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <FormField label="PSH (שעות שיא)" hint="ברירת מחדל: 5.0 לתאילנד">
              <Input
                type="number"
                step="0.1"
                value={form.psh}
                onChange={(e) => update('psh', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="PR אפקטיבי" hint="ברירת מחדל: 0.747 כולל soiling">
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

          {/* Auto-price calculator */}
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-emerald-300/80 uppercase tracking-wider">💰 חישוב מחיר אוטומטי</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const session = await getSession()
                    const token = session?.access_token
                    if (!token) { showToast('לא מחובר', 'error'); return }
                    const res = await fetch('/api/admin-bom', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ panels: form.panel_count, watt: form.panel_watt, template: 'grid-tied-commercial-metal-roof' }),
                    })
                    const data = await res.json()
                    if (!data.ok) throw new Error(data.error)
                    const bomCost = data.bom.totals.total_with_vat_thb
                    const clientPrice = Math.round(bomCost * form.price_markup)
                    update('bom_cost_thb', bomCost)
                    update('total_price_thb', clientPrice)
                    const summary = data.bom.supplier_summary as BomSupplierSummary | undefined
                    setBomPriceBasis(summary || null)
                    setBomPriceSnapshot({
                      calculated_at: new Date().toISOString(),
                      bom_summary: data.bom.summary,
                      supplier_summary: summary,
                      totals: data.bom.totals,
                      rows: data.bom.rows,
                    })
                    const basis = summary
                      ? ` · ספקים: ${summary.live_rows}/${summary.supplier_matched_rows} live · ${summary.benchmark_rows} benchmark`
                      : ''
                    const expired = summary?.expired_rows ? ` · ${summary.expired_rows} פג תוקף` : ''
                    showToast(`עלות BOM: ฿${bomCost.toLocaleString()} · מחיר לקוח: ฿${clientPrice.toLocaleString()}${basis}${expired}`, 'success')
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : 'שגיאה', 'error')
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30"
              >
                🧮 חשב מ-BOM
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="עלות BOM (THB)" hint="אוטומטי">
                <Input
                  type="number"
                  value={form.bom_cost_thb || ''}
                  onChange={(e) => update('bom_cost_thb', parseFloat(e.target.value) || 0)}
                  dir="ltr"
                />
              </FormField>
              <FormField label="מקדם מחיר (×)" hint="ברירת מחדל: 1.35 מעל BOM כולל VAT">
                <Input
                  type="number"
                  step="0.1"
                  value={form.price_markup}
                  onChange={(e) => {
                    const m = parseFloat(e.target.value) || 0
                    update('price_markup', m)
                    if (form.bom_cost_thb > 0) {
                      update('total_price_thb', Math.round(form.bom_cost_thb * m))
                    }
                  }}
                  dir="ltr"
                />
              </FormField>
              <div className="flex flex-col justify-end">
                <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5">רווח גולמי</p>
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-semibold" dir="ltr">
                  {form.bom_cost_thb > 0
                    ? `${Math.round((1 - 1 / form.price_markup) * 100)}% · ฿${(form.total_price_thb - form.bom_cost_thb).toLocaleString()}`
                    : '—'}
                </div>
              </div>
            </div>
            {bomPriceBasis && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/55">
                בסיס מחיר BOM: {bomPriceBasis.live_rows} שורות live · {bomPriceBasis.expired_rows} פג תוקף · {bomPriceBasis.benchmark_rows} benchmark.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <FormField label="מחיר כולל ללקוח (THB)" required hint="מחושב אוטו׳ · ניתן לערוך">
              <Input
                type="number"
                value={form.total_price_thb || ''}
                onChange={(e) => update('total_price_thb', parseFloat(e.target.value) || 0)}
                placeholder="450000"
                hasError={!!errors.total_price_thb}
                dir="ltr"
              />
            </FormField>

            <FormField label="ניכוי מס מאושר (THB)" hint="0 כברירת מחדל; להזין רק אם רו״ח/BOI אישרו">
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
            <CalcRow label="החזר השקעה מהוון" value={`${form.payback_no_tax} שנים`} />
            <CalcRow label="החזר עם הטבת מס מאושרת" value={form.payback_with_tax > 0 ? `${form.payback_with_tax} שנים` : 'לא חושב'} highlight />
            <CalcRow label="חיסכון ב-25 שנה" value={`฿${form.savings_25yr_thb.toLocaleString()}`} highlight />
          </div>
        </Section>

        {/* Section F — Deal Options (v3) */}
        <Section>
          <SectionTitle number="ו" title="אפשרויות עסקה (v3)" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <FormField label="תעריף PPA (฿/kWh)" hint="ברירת מחדל: 4.20; לעדכן לפי חוזה">
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

        {/* Section G — Bank Financing Model */}
        <Section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <SectionTitle number="ז" title="מודל כלכלי למימון בנקאי" />
            <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={form.financing_enabled}
                onChange={(e) => update('financing_enabled', e.target.checked)}
                className="w-4 h-4 accent-[#E8A820]"
              />
              לכלול בהצעה
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <FormField label="אחוז מימון בנקאי" hint="Loan-to-value">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.financing_ltv_pct}
                onChange={(e) => update('financing_ltv_pct', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="ריבית שנתית" hint="הנחה למודל">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.financing_interest_pct}
                onChange={(e) => update('financing_interest_pct', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>

            <FormField label="תקופת הלוואה" hint="בשנים">
              <Input
                type="number"
                min="1"
                step="1"
                value={form.financing_years}
                onChange={(e) => update('financing_years', parseInt(e.target.value, 10) || 1)}
                dir="ltr"
              />
            </FormField>

            <FormField label="O&M שנתי" hint="% מעלות המערכת">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.financing_om_pct}
                onChange={(e) => update('financing_om_pct', parseFloat(e.target.value) || 0)}
                dir="ltr"
              />
            </FormField>
          </div>

          <div className={`rounded-xl border p-4 ${form.financing_enabled ? 'bg-[#1A7A5A]/5 border-[#1A7A5A]/15' : 'bg-white/5 border-white/10 opacity-60'}`}>
            <p className="text-xs text-[#1A7A5A]/80 uppercase tracking-wider mb-3">תצוגה מקדימה לבנק</p>
            <CalcRow label="סכום הלוואה משוער" value={`฿${financingPreview.loanAmount.toLocaleString()}`} />
            <CalcRow label="הון עצמי משוער" value={`฿${financingPreview.equity.toLocaleString()}`} />
            <CalcRow label="החזר חוב שנתי" value={`฿${financingPreview.annualDebtService.toLocaleString()}`} />
            <CalcRow label="תזרים נקי אחרי חוב" value={`฿${financingPreview.netAfterDebt.toLocaleString()}`} highlight={financingPreview.netAfterDebt > 0} />
            <CalcRow label="DSCR" value={financingPreview.dscr > 0 ? financingPreview.dscr.toFixed(2) : '—'} highlight={financingPreview.dscr >= 1.2} />
            <CalcRow
              label="החזר הון עצמי"
              value={financingPreview.equityPaybackYears > 0 ? `${financingPreview.equityPaybackYears.toFixed(1)} שנים` : 'דורש בדיקה'}
            />
          </div>
        </Section>

        {/* Section H — Language & Submit */}
        <Section>
          <SectionTitle number="ח" title="שפה ואישור" />

          <div className="mb-6">
            <p className="text-[11px] text-white/40 uppercase tracking-wider mb-3">שפת ההצעה</p>
            <div className="flex flex-wrap gap-3">
              {([
                { value: 'he', label: 'עברית', flag: '🇮🇱' },
                { value: 'en', label: 'English', flag: '🇺🇸' },
                { value: 'th', label: 'ภาษาไทย', flag: '🇹🇭' },
              ] as const).map(({ value, label, flag }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update('language', value)}
                  className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-3 rounded-xl border text-sm font-medium transition-all min-h-[44px] ${
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
                {isEditMode ? 'שומר תיקונים...' : 'יוצר הצעה...'}
              </>
            ) : (
              isEditMode ? 'שמור תיקונים בהצעה' : 'צור הצעה'
            )}
          </button>
        </Section>
      </div>}
    </div>
  )
}
