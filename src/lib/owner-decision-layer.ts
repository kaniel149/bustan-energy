/**
 * Owner / Decision-maker + CRM pipeline layer.
 *
 * Faithful TypeScript port of the framework-agnostic logic originally built for
 * the static `/crm` app (`crm/owner-decision-layer.js` in the bustan-energy repo).
 * Pure functions — no I/O, no framework. Derives reachability, lead_score,
 * priority, estimated kWp/THB, next action, and pipeline summaries at read time
 * from a property + its owner_decision layer.
 *
 * Behaviour is intentionally identical to the original JS. Keep it that way; the
 * unit tests in `test/owner-decision-layer.test.cjs` lock the contract.
 */

export type Confidence = '' | 'high' | 'medium' | 'low'
export type ResearchStatus = 'unknown' | 'needs_research' | 'identified' | 'verified' | 'blocked'
export type Reachability = 'contactable' | 'partial' | 'cold'
export type CrmStage = 'new' | 'contacted' | 'survey' | 'proposal' | 'won' | 'lost'
export type Priority = 'A' | 'B' | 'C'

export interface OwnerDecisionLayer {
  legalOwnerName: string
  tenantName: string
  occupierName: string
  decisionMakerName: string
  decisionMakerRole: string
  decisionMakerPhone: string
  decisionMakerEmail: string
  decisionMakerLinkedIn: string
  companyWebsite: string
  ownerConfidence: Confidence
  decisionMakerConfidence: Confidence
  sourceName: string
  sourceUrl: string
  lastResearchedAt: string
  researchStatus: ResearchStatus
  operationalContactName: string
  operationalContactRole: string
  operationalContactPhone: string
  operationalContactEmail: string
  existingSolarInstallerName: string
  existingSolarDeveloperName: string
  existingSolarSourceName: string
  existingSolarSourceUrl: string
  [key: string]: unknown
}

export interface PropertyInput {
  id?: string | number
  name?: string
  areaName?: string
  propertyType?: string
  roofAreaSqm?: number | string
  solarPotentialScore?: number | string
  highValueScore?: number | string
  leadScore?: number | string
  existingSolar?: boolean
  hasExistingSolar?: boolean
  solar?: { existing?: boolean }
  ownerDecision?: Record<string, unknown>
  crm?: Record<string, unknown>
  [key: string]: unknown
}

export interface CrmLayer {
  crm_stage: CrmStage
  priority: Priority
  reachability: Reachability
  lead_score: number
  estimated_kWp: number
  estimated_annual_thb: number
  next_action: string
  assigned_to: string
  last_verified_at: string
  source_confidence: Confidence
}

const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const
const RESEARCH_STATUSES = ['unknown', 'needs_research', 'identified', 'verified', 'blocked'] as const
const NEEDS_RESEARCH = 'Needs research'

const OWNER_DECISION_CSV_HEADERS = [
  'legalOwnerName',
  'tenantName',
  'occupierName',
  'decisionMakerName',
  'decisionMakerRole',
  'decisionMakerPhone',
  'decisionMakerEmail',
  'decisionMakerLinkedIn',
  'companyWebsite',
  'ownerConfidence',
  'decisionMakerConfidence',
  'sourceName',
  'sourceUrl',
  'lastResearchedAt',
  'researchStatus',
  'operationalContactName',
  'operationalContactRole',
  'operationalContactPhone',
  'operationalContactEmail',
  'existingSolarInstallerName',
  'existingSolarDeveloperName',
  'existingSolarSourceName',
  'existingSolarSourceUrl',
] as const

const text = (value: unknown): string => (value == null ? '' : String(value).trim())

const normalizeConfidence = (value: unknown): Confidence => {
  const clean = text(value).toLowerCase()
  return (CONFIDENCE_LEVELS as readonly string[]).includes(clean) ? (clean as Confidence) : ''
}

const normalizeResearchStatus = (value: unknown): ResearchStatus | '' => {
  const clean = text(value).toLowerCase()
  return (RESEARCH_STATUSES as readonly string[]).includes(clean) ? (clean as ResearchStatus) : ''
}

type AnyLayer = Record<string, unknown>

const hasSource = (layer: AnyLayer): boolean =>
  Boolean(text(layer.sourceName) || text(layer.sourceUrl))

const sourceLooksOperatorOnly = (layer: AnyLayer): boolean => {
  const source = `${(layer.sourceName as string) || ''} ${(layer.sourceUrl as string) || ''}`.toLowerCase()
  if (!source) return false
  return [
    'openstreetmap',
    'osm',
    'google',
    'maps.google',
    'business profile',
    'company website',
    'official website',
    'website listing',
  ].some((needle) => source.includes(needle))
}

export const normalizeOwnerDecisionLayer = (input: AnyLayer = {}): OwnerDecisionLayer => {
  const layer: AnyLayer = {}
  OWNER_DECISION_CSV_HEADERS.forEach((field) => {
    layer[field] = text(input[field])
  })

  layer.ownerConfidence = normalizeConfidence(input.ownerConfidence)
  layer.decisionMakerConfidence = normalizeConfidence(input.decisionMakerConfidence)

  const explicitStatus = normalizeResearchStatus(input.researchStatus)
  const hasDecisionMaker = Boolean(layer.decisionMakerName && hasSource(layer))
  const hasSourcedLegalOwner = Boolean(
    layer.legalOwnerName && hasSource(layer) && !sourceLooksOperatorOnly(layer),
  )

  if (explicitStatus) {
    layer.researchStatus = explicitStatus
  } else if (hasSourcedLegalOwner || hasDecisionMaker) {
    layer.researchStatus = 'identified'
  } else if (layer.legalOwnerName || layer.tenantName || layer.occupierName || layer.decisionMakerName) {
    layer.researchStatus = 'needs_research'
  } else {
    layer.researchStatus = 'unknown'
  }

  if (layer.legalOwnerName && !hasSourcedLegalOwner && !layer.tenantName && sourceLooksOperatorOnly(layer)) {
    layer.tenantName = layer.legalOwnerName
  }

  if (layer.researchStatus === 'unknown' && !hasSourcedLegalOwner && !hasDecisionMaker) {
    layer.researchStatus = 'needs_research'
  }

  return layer as unknown as OwnerDecisionLayer
}

export const isLegalOwnerKnown = (layer: AnyLayer): boolean =>
  Boolean(
    layer.legalOwnerName &&
      hasSource(layer) &&
      !sourceLooksOperatorOnly(layer) &&
      layer.ownerConfidence !== 'low',
  )

export const isDecisionMakerKnown = (layer: AnyLayer): boolean =>
  Boolean(layer.decisionMakerName && hasSource(layer) && layer.decisionMakerConfidence)

const statusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    unknown: 'Needs research',
    needs_research: 'Needs research',
    identified: 'Identified',
    verified: 'Verified',
    blocked: 'Blocked',
  }
  return labels[status] || NEEDS_RESEARCH
}

export interface OwnerDecisionDisplay {
  operatorTenant: string
  legalOwner: string
  decisionMaker: string
  role: string
  contact: string
  source: string
  confidence: string
  researchStatus: string
  sourceUrl: string
}

export const getOwnerDecisionDisplay = (rawLayer: AnyLayer = {}): OwnerDecisionDisplay => {
  const layer = normalizeOwnerDecisionLayer(rawLayer) as unknown as AnyLayer
  const source = [layer.sourceName, layer.sourceUrl].filter(Boolean).join(' | ')
  const contact = hasSource(layer)
    ? [layer.decisionMakerPhone, layer.decisionMakerEmail, layer.decisionMakerLinkedIn].filter(Boolean).join(' | ')
    : ''
  const confidence = [
    layer.ownerConfidence ? `Owner ${layer.ownerConfidence}` : '',
    layer.decisionMakerConfidence ? `Decision maker ${layer.decisionMakerConfidence}` : '',
  ]
    .filter(Boolean)
    .join(' | ')

  return {
    operatorTenant: (layer.tenantName as string) || (layer.occupierName as string) || NEEDS_RESEARCH,
    legalOwner: isLegalOwnerKnown(layer) ? (layer.legalOwnerName as string) : NEEDS_RESEARCH,
    decisionMaker: isDecisionMakerKnown(layer) ? (layer.decisionMakerName as string) : NEEDS_RESEARCH,
    role: (layer.decisionMakerRole as string) || NEEDS_RESEARCH,
    contact: contact || NEEDS_RESEARCH,
    source: source || NEEDS_RESEARCH,
    confidence: confidence || NEEDS_RESEARCH,
    researchStatus: statusLabel(layer.researchStatus as string),
    sourceUrl: layer.sourceUrl as string,
  }
}

export const hasExistingSolar = (property: PropertyInput = {}): boolean =>
  Boolean(
    property.existingSolar ||
      property.hasExistingSolar ||
      (property.solar && property.solar.existing) ||
      (property.ownerDecision &&
        (property.ownerDecision.existingSolarInstallerName || property.ownerDecision.existingSolarDeveloperName)),
  )

export const getOwnerDecisionBadges = (property: PropertyInput = {}): string[] => {
  const layer = normalizeOwnerDecisionLayer(
    (property.ownerDecision as AnyLayer) || (property as AnyLayer),
  ) as unknown as AnyLayer
  const badges: string[] = []
  const ownerKnown = isLegalOwnerKnown(layer)
  const decisionMakerKnown = isDecisionMakerKnown(layer)

  if (ownerKnown) badges.push('Owner known')
  if (decisionMakerKnown) badges.push('Decision maker found')
  if (
    layer.researchStatus === 'unknown' ||
    layer.researchStatus === 'needs_research' ||
    !ownerKnown ||
    !decisionMakerKnown
  ) {
    badges.push('Needs research')
  }
  if (hasExistingSolar(property)) badges.push('Existing solar')

  return badges
}

const propertyScore = (property: PropertyInput = {}): number =>
  Number(
    property.highValueScore ||
      property.leadScore ||
      property.solarPotentialScore ||
      property.roofAreaSqm ||
      0,
  )

// ---------------------------------------------------------------------------
// CRM / pipeline layer — turns a scanned property into an operable sales lead.
// ---------------------------------------------------------------------------
export const CRM_PIPELINE_STAGES: { key: CrmStage; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'survey', label: 'Site survey' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
]
export const CRM_STAGE_KEYS: CrmStage[] = CRM_PIPELINE_STAGES.map((stage) => stage.key)
export const CRM_PRIORITIES: Priority[] = ['A', 'B', 'C']

// Roof -> system size: ~65% usable roof, ~6.5 m² per kWp (tilt + spacing).
const KWP_PER_SQM = 0.65 / 6.5 // ≈ 0.10 kWp per m² of gross roof
// Thailand: ~1,450 kWh/kWp/yr saved at ~4 THB/kWh commercial PEA tariff.
const THB_PER_KWP_YEAR = 1450 * 4

export const computeEstimatedKwp = (property: PropertyInput = {}): number => {
  const roof = Number(property.roofAreaSqm)
  if (!Number.isFinite(roof) || roof <= 0) return 0
  return Math.round(roof * KWP_PER_SQM)
}

export const computeEstimatedAnnualThb = (property: PropertyInput = {}): number =>
  Math.round(computeEstimatedKwp(property) * THB_PER_KWP_YEAR)

export const derivePriority = (property: PropertyInput = {}): Priority => {
  const kwp = computeEstimatedKwp(property)
  const score = propertyScore(property)
  // Properties that already have solar are lower priority for a new EPC sale.
  if (hasExistingSolar(property)) return kwp >= 250 ? 'B' : 'C'
  // Deal value is size-driven; score (pre-filtered, all high) only bumps a B->A.
  if (kwp >= 100) return 'A'
  if (kwp >= 60) return score >= 92 ? 'A' : 'B'
  return 'C'
}

const normalizeStage = (value: unknown): CrmStage => {
  const clean = text(value).toLowerCase().replace(/\s+/g, '_')
  const alias: Record<string, string> = {
    lead: 'new',
    site_survey: 'survey',
    proposal_sent: 'proposal',
    negotiation: 'proposal',
  }
  const resolved = alias[clean] || clean
  return (CRM_STAGE_KEYS as string[]).includes(resolved) ? (resolved as CrmStage) : 'new'
}

const deriveNextAction = (stage: CrmStage, ownerLayer: AnyLayer = {}): string => {
  const ownerKnown = isDecisionMakerKnown(ownerLayer) || isLegalOwnerKnown(ownerLayer)
  if ((stage === 'new' || stage === 'contacted') && !ownerKnown) {
    return 'Research owner / decision maker'
  }
  const byStage: Record<string, string> = {
    new: 'Qualify fit & verify owner',
    contacted: 'Schedule site survey',
    survey: 'Complete load / PEA bill analysis',
    proposal: 'Follow up on proposal',
    won: 'Kick off procurement & install',
    lost: 'Archive / nurture',
  }
  return byStage[stage] || 'Qualify fit & verify owner'
}

// Reachability — can we actually contact a decision maker? A lead you can't
// reach is worth far less, regardless of roof size.
export const deriveReachability = (ownerLayer: AnyLayer = {}): Reachability => {
  const hasContact = Boolean(
    text(ownerLayer.decisionMakerPhone) ||
      text(ownerLayer.decisionMakerEmail) ||
      text(ownerLayer.decisionMakerLinkedIn),
  )
  if (isDecisionMakerKnown(ownerLayer) && hasContact) return 'contactable'
  if (isLegalOwnerKnown(ownerLayer) || hasContact) return 'partial'
  return 'cold'
}

// Blended 0-100 lead score: system size (50%) + reachability (30%) + solar fit (20%).
export const computeLeadScore = (property: PropertyInput, reachability: Reachability): number => {
  const kwp = computeEstimatedKwp(property)
  const sizeScore = Math.min(kwp / 120, 1) * 100
  const reachScore = reachability === 'contactable' ? 100 : reachability === 'partial' ? 50 : 0
  const solarScore = Math.min(Number(property.solarPotentialScore) || 0, 100)
  return Math.round(0.5 * sizeScore + 0.3 * reachScore + 0.2 * solarScore)
}

export const normalizeCrmLayer = (property: PropertyInput = {}): CrmLayer => {
  const input = (property.crm || {}) as Record<string, unknown>
  const ownerLayer = normalizeOwnerDecisionLayer(
    (property.ownerDecision as AnyLayer) || {},
  ) as unknown as AnyLayer
  const stage = normalizeStage(input.crm_stage || input.stage)
  const priority = (CRM_PRIORITIES as string[]).includes(text(input.priority).toUpperCase())
    ? (text(input.priority).toUpperCase() as Priority)
    : derivePriority(property)
  const reachability = deriveReachability(ownerLayer)

  return {
    crm_stage: stage,
    priority,
    reachability,
    lead_score: computeLeadScore(property, reachability),
    estimated_kWp: Number(input.estimated_kWp) > 0 ? Number(input.estimated_kWp) : computeEstimatedKwp(property),
    estimated_annual_thb:
      Number(input.estimated_annual_thb) > 0
        ? Number(input.estimated_annual_thb)
        : computeEstimatedAnnualThb(property),
    next_action: text(input.next_action) || deriveNextAction(stage, ownerLayer),
    assigned_to: text(input.assigned_to),
    last_verified_at: text(input.last_verified_at) || text(ownerLayer.lastResearchedAt),
    source_confidence:
      normalizeConfidence(input.source_confidence) || (ownerLayer.ownerConfidence as Confidence) || '',
  }
}

export interface CrmSummary {
  byStage: Record<string, number>
  byPriority: Record<Priority, number>
  byReachability: Record<Reachability, number>
  totalPipelineKwp: number
}

export const summarizeCrmRecords = (properties: PropertyInput[] = []): CrmSummary => {
  const byStage: Record<string, number> = Object.fromEntries(CRM_STAGE_KEYS.map((key) => [key, 0]))
  const byPriority: Record<Priority, number> = { A: 0, B: 0, C: 0 }
  const byReachability: Record<Reachability, number> = { contactable: 0, partial: 0, cold: 0 }
  let pipelineKwp = 0
  properties.forEach((property) => {
    const crm = normalizeCrmLayer(property)
    byStage[crm.crm_stage] = (byStage[crm.crm_stage] || 0) + 1
    if (byPriority[crm.priority] != null) byPriority[crm.priority] += 1
    if (byReachability[crm.reachability] != null) byReachability[crm.reachability] += 1
    if (crm.crm_stage !== 'lost') pipelineKwp += crm.estimated_kWp
  })
  return { byStage, byPriority, byReachability, totalPipelineKwp: pipelineKwp }
}

export { OWNER_DECISION_CSV_HEADERS, NEEDS_RESEARCH }
