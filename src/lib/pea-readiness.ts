export type PeaReadinessSeverity = 'ok' | 'warning' | 'blocker'

export interface PeaReadinessInput {
  authority?: 'PEA' | 'MEA'
  system_size_kwp: number
  inverter_kw: number
  panel_count: number
  panel_watt: number
  roof_area_m2?: number
  roof_load_kg_m2?: number
  phase?: 'single' | 'three' | 'unknown'
  export_program?: 'self_consumption' | 'residential_buyback' | 'unknown'
}

export interface PeaReadinessItem {
  id: string
  severity: PeaReadinessSeverity
  title: string
  detail: string
  source?: string
}

export interface PeaReadinessResult {
  status: PeaReadinessSeverity
  items: PeaReadinessItem[]
  required_documents: Array<{ id: string; title: string; detail: string }>
}

const PEA_SOLAR_FAQ = 'https://peasolar.pea.co.th/faq/'
const PEA_PPIM_SOLAR = 'https://ppim.pea.co.th/project/solar/detail/62885d055bdc7f264c5edcdd/'
const PEA_SMARTLIST_DOCS = 'https://smartlist.pea.co.th/documents'
const PEA_VST_NOTICE = 'https://www.pea.co.th/news/corporate-news/1573'

function maxSeverity(items: PeaReadinessItem[]): PeaReadinessSeverity {
  if (items.some((item) => item.severity === 'blocker')) return 'blocker'
  if (items.some((item) => item.severity === 'warning')) return 'warning'
  return 'ok'
}

export function estimatePvRoofAreaM2(panelCount: number): number {
  return Math.round(panelCount * 2.42 * 10) / 10
}

export function estimateRoofLoadKgM2(panelWatt: number): number {
  // Typical modern 550-650W module + aluminum mounting allowance.
  // Structural engineer must replace this with the real datasheet/load calc.
  return panelWatt >= 600 ? 18 : 16
}

export function calculatePeaReadiness(input: PeaReadinessInput): PeaReadinessResult {
  const authority = input.authority || 'PEA'
  const roofArea = input.roof_area_m2 ?? estimatePvRoofAreaM2(input.panel_count)
  const roofLoad = input.roof_load_kg_m2 ?? estimateRoofLoadKgM2(input.panel_watt)
  const exportProgram = input.export_program || 'self_consumption'
  const phase = input.phase || 'unknown'
  const items: PeaReadinessItem[] = []

  items.push({
    id: 'owner-documents',
    severity: 'warning',
    title: 'Owner identity and house registration must be collected',
    detail: 'PEA Solar FAQ lists owner ID/passport, house registration copy, and power of attorney/consent when the applicant is not the house owner.',
    source: PEA_SOLAR_FAQ,
  })

  if (authority === 'MEA') {
    items.push({
      id: 'mea-branch',
      severity: 'warning',
      title: 'MEA jurisdiction selected',
      detail: 'This checker uses PEA rooftop references for thresholds and documentation. Confirm MEA-specific forms and branch requirements before submission.',
    })
  }

  items.push({
    id: 'inverter-registered',
    severity: 'warning',
    title: 'Use an approved/registered inverter package',
    detail: 'Attach inverter product certificates and confirm the model is acceptable for PEA grid connection before submission.',
    source: PEA_SMARTLIST_DOCS,
  })

  if (input.system_size_kwp >= 1000) {
    items.push({
      id: 'generation-license',
      severity: 'blocker',
      title: 'Generation license threshold reached',
      detail: 'PEA Solar FAQ states systems at or above 1,000 kWp require a power generation license; this package is not enough by itself.',
      source: PEA_SOLAR_FAQ,
    })
  }

  if (input.inverter_kw >= 200) {
    items.push({
      id: 'controlled-energy-license',
      severity: 'blocker',
      title: 'Controlled energy production license review required',
      detail: 'PEA Solar FAQ uses total inverter capacity at or above 200 kVA as the threshold for a controlled energy production license review.',
      source: PEA_SOLAR_FAQ,
    })
  } else {
    items.push({
      id: 'controlled-energy-license',
      severity: 'ok',
      title: 'Below 200 kVA inverter-license threshold',
      detail: `Current inverter capacity is ${input.inverter_kw} kW. Confirm final kVA rating on datasheet before submission.`,
      source: PEA_SOLAR_FAQ,
    })
  }

  if (roofArea > 160 || roofLoad > 20) {
    items.push({
      id: 'building-permit',
      severity: 'warning',
      title: 'Local building notification/permit review required',
      detail: `Estimated PV area is ${roofArea} m2 and roof load is ${roofLoad} kg/m2. PEA FAQ references 160 m2 and 20 kg/m2 thresholds for local building permit/notification handling.`,
      source: PEA_SOLAR_FAQ,
    })
  } else {
    items.push({
      id: 'building-permit',
      severity: 'ok',
      title: 'Below common roof-area/load permit thresholds',
      detail: `Estimated PV area is ${roofArea} m2 and roof load is ${roofLoad} kg/m2. Still notify/confirm with the local authority branch.`,
      source: PEA_SOLAR_FAQ,
    })
  }

  if (exportProgram === 'residential_buyback') {
    const phaseLimit = phase === 'single' ? 5 : phase === 'three' ? 10 : 0
    const exceedsPhaseLimit = phaseLimit > 0 && input.system_size_kwp > phaseLimit
    items.push({
      id: 'residential-buyback',
      severity: exceedsPhaseLimit || phase === 'unknown' ? 'warning' : 'ok',
      title: 'Residential buyback limits must be checked in PPIM',
      detail: phase === 'unknown'
        ? 'PPIM residential buyback rules depend on phase. Confirm single/three-phase service before including export revenue.'
        : `PPIM residential buyback guidance lists ${phaseLimit} kWp as the ${phase}-phase limit. Current system is ${input.system_size_kwp} kWp.`,
      source: PEA_PPIM_SOLAR,
    })
  } else {
    items.push({
      id: 'self-consumption-export',
      severity: 'warning',
      title: 'Do not assume export/buyback approval',
      detail: 'Treat export and net-billing as subject to PEA/ERC approval. Base the proposal on self-consumption unless an active program approval is confirmed.',
      source: PEA_PPIM_SOLAR,
    })
  }

  items.push({
    id: 'engineer-review',
    severity: 'warning',
    title: 'Licensed engineer review and stamp required',
    detail: 'PEA announced cooperation with the Engineering Institute of Thailand to strengthen registered solar design certification and inspection.',
    source: PEA_VST_NOTICE,
  })

  return {
    status: maxSeverity(items),
    items,
    required_documents: [
      { id: 'id', title: 'Owner ID/passport', detail: 'Use the same legal name as the PEA account or attach authorization.' },
      { id: 'house-registration', title: 'House registration / property evidence', detail: 'Attach house registration and property consent/land document when applicable.' },
      { id: 'poa', title: 'Power of attorney / consent', detail: 'Required when the applicant is not the registered owner.' },
      { id: 'bill', title: 'Recent PEA bill', detail: 'Include CA/customer number, meter number, tariff class, and site address.' },
      { id: 'sld', title: 'Single-line diagram', detail: 'Signed/stamped by the certifying engineer.' },
      { id: 'layout', title: 'Layout and electrical plan', detail: 'Include roof layout, cable schedule, protection, and grounding.' },
      { id: 'certificates', title: 'Equipment certificates', detail: 'PV module, inverter, protection devices, and battery certificates where relevant.' },
      { id: 'structural', title: 'Structural/load confirmation', detail: 'Needed when roof area/load or local branch practice requires it.' },
    ],
  }
}
