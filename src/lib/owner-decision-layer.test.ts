import { describe, it, expect } from 'vitest'
import {
  computeEstimatedKwp,
  computeEstimatedAnnualThb,
  derivePriority,
  deriveReachability,
  computeLeadScore,
  normalizeCrmLayer,
  summarizeCrmRecords,
  normalizeOwnerDecisionLayer,
  isLegalOwnerKnown,
  isDecisionMakerKnown,
  CRM_STAGE_KEYS,
} from './owner-decision-layer'

describe('computeEstimatedKwp', () => {
  it('uses ~0.10 kWp per gross m² and rounds', () => {
    expect(computeEstimatedKwp({ roofAreaSqm: 1000 })).toBe(100)
    expect(computeEstimatedKwp({ roofAreaSqm: 650 })).toBe(65)
  })
  it('returns 0 for missing/invalid roof', () => {
    expect(computeEstimatedKwp({})).toBe(0)
    expect(computeEstimatedKwp({ roofAreaSqm: 0 })).toBe(0)
    expect(computeEstimatedKwp({ roofAreaSqm: 'n/a' })).toBe(0)
  })
})

describe('computeEstimatedAnnualThb', () => {
  it('is kWp × 5,800 THB/yr', () => {
    expect(computeEstimatedAnnualThb({ roofAreaSqm: 1000 })).toBe(580000)
  })
})

describe('derivePriority', () => {
  it('A when ≥100 kWp', () => {
    expect(derivePriority({ roofAreaSqm: 1000 })).toBe('A')
  })
  it('60–99 kWp depends on score', () => {
    expect(derivePriority({ roofAreaSqm: 650, solarPotentialScore: 95 })).toBe('A')
    expect(derivePriority({ roofAreaSqm: 650, solarPotentialScore: 80 })).toBe('B')
  })
  it('C when small', () => {
    expect(derivePriority({ roofAreaSqm: 300 })).toBe('C')
  })
  it('existing solar caps priority', () => {
    expect(derivePriority({ roofAreaSqm: 3000, existingSolar: true })).toBe('B')
    expect(derivePriority({ roofAreaSqm: 1000, existingSolar: true })).toBe('C')
  })
})

const contactableOwner = {
  decisionMakerName: 'Somchai P.',
  decisionMakerConfidence: 'high',
  sourceName: 'LinkedIn',
  sourceUrl: 'https://linkedin.com/in/somchai',
  decisionMakerPhone: '+66 81 234 5678',
}

describe('reachability + known checks', () => {
  it('contactable: decision maker known + has contact', () => {
    expect(deriveReachability(normalizeOwnerDecisionLayer(contactableOwner))).toBe('contactable')
    expect(isDecisionMakerKnown(normalizeOwnerDecisionLayer(contactableOwner))).toBe(true)
  })
  it('partial: legal owner known via registry, no DM contact', () => {
    const layer = normalizeOwnerDecisionLayer({
      legalOwnerName: 'Acme Resort Co Ltd',
      ownerConfidence: 'medium',
      sourceName: 'DBD registry',
      sourceUrl: 'https://datawarehouse.dbd.go.th/x',
    })
    expect(isLegalOwnerKnown(layer)).toBe(true)
    expect(deriveReachability(layer)).toBe('partial')
  })
  it('cold: nothing known', () => {
    expect(deriveReachability(normalizeOwnerDecisionLayer({}))).toBe('cold')
  })
  it('operator-only source does not count as known legal owner', () => {
    const layer = normalizeOwnerDecisionLayer({
      legalOwnerName: 'Some Hotel',
      sourceName: 'OpenStreetMap',
      sourceUrl: 'https://openstreetmap.org/x',
    })
    expect(isLegalOwnerKnown(layer)).toBe(false)
    // promoted to tenant, flagged needs_research
    expect(layer.tenantName).toBe('Some Hotel')
    expect(layer.researchStatus).toBe('needs_research')
  })
})

describe('computeLeadScore', () => {
  it('blends size 50% / reachability 30% / solar 20%', () => {
    expect(computeLeadScore({ roofAreaSqm: 1000, solarPotentialScore: 80 }, 'contactable')).toBe(88)
    expect(computeLeadScore({ roofAreaSqm: 1000, solarPotentialScore: 80 }, 'cold')).toBe(58)
  })
})

describe('normalizeCrmLayer', () => {
  it('derives a full operable lead from a scanned property', () => {
    const crm = normalizeCrmLayer({
      roofAreaSqm: 1000,
      solarPotentialScore: 80,
      ownerDecision: contactableOwner,
    })
    expect(crm.crm_stage).toBe('new')
    expect(crm.priority).toBe('A')
    expect(crm.reachability).toBe('contactable')
    expect(crm.lead_score).toBe(88)
    expect(crm.estimated_kWp).toBe(100)
    expect(crm.estimated_annual_thb).toBe(580000)
    expect(crm.next_action).toBe('Qualify fit & verify owner')
  })
  it('respects explicit crm overrides + stage aliases', () => {
    const crm = normalizeCrmLayer({
      roofAreaSqm: 300,
      crm: { stage: 'proposal_sent', priority: 'a', assigned_to: 'dana' },
    })
    expect(crm.crm_stage).toBe('proposal')
    expect(crm.priority).toBe('A')
    expect(crm.assigned_to).toBe('dana')
  })
})

describe('summarizeCrmRecords', () => {
  it('counts by stage/priority/reachability and sums non-lost pipeline kWp', () => {
    const s = summarizeCrmRecords([
      { roofAreaSqm: 1000, ownerDecision: contactableOwner }, // A, contactable, 100 kWp
      { roofAreaSqm: 300 }, // C, cold, 30 kWp
      { roofAreaSqm: 1000, crm: { stage: 'lost' } }, // excluded from pipeline kWp
    ])
    expect(s.byPriority.A).toBe(2) // 1000 kWp props are both A
    expect(s.byPriority.C).toBe(1)
    expect(s.byReachability.contactable).toBe(1)
    expect(s.byStage.lost).toBe(1)
    expect(s.totalPipelineKwp).toBe(130) // 100 + 30, lost excluded
    expect(CRM_STAGE_KEYS).toContain('won')
  })
})
