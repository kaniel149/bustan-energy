import { describe, expect, it } from 'vitest'
import { calculateFinancials } from '../src/lib/financial-calc'
import {
  calculateGridProximity,
  calculateSolar,
  classifyGridGrade,
  estimateConnectionCost,
} from '../src/lib/solar-calc'

describe('solar calculations', () => {
  it('sizes rooftop systems from usable area and applies Thailand net-metering rate', () => {
    const result = calculateSolar(100, 5, 5, true)

    expect(result.usableArea).toBe(70)
    expect(result.panelCount).toBe(35)
    expect(result.capacityKwp).toBeCloseTo(19.25, 2)
    expect(result.annualKwh).toBeCloseTo(25715, 0)
    expect(result.annualSavingsTHB).toBeCloseTo(109030, 0)
    expect(result.epcCost).toBeCloseTo(616000, 0)
    expect(result.paybackYears).toBeGreaterThan(6)
    expect(result.paybackYears).toBeLessThan(10)
  })

  it('classifies grid distance and connection cost bands consistently', () => {
    expect(classifyGridGrade(500)).toBe('A')
    expect(classifyGridGrade(2000)).toBe('B')
    expect(classifyGridGrade(5000)).toBe('C')
    expect(classifyGridGrade(5001)).toBe('D')

    expect(estimateConnectionCost(500)).toBe(200000)
    expect(estimateConnectionCost(2000)).toBe(1050000)
    expect(estimateConnectionCost(5000)).toBe(3100000)
  })

  it('finds the nearest grid feature from GeoJSON data', () => {
    const grid: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { power_type: 'substation', name: 'Near Substation' },
          geometry: { type: 'Point', coordinates: [100.0005, 9.0005] },
        },
        {
          type: 'Feature',
          properties: { power_type: 'distribution', name: 'Far Line' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [100.1, 9.1],
              [100.2, 9.2],
            ],
          },
        },
      ],
    }

    const result = calculateGridProximity(100, 9, grid)

    expect(result.nearestFeatureName).toBe('Near Substation')
    expect(result.nearestFeatureType).toBe('substation')
    expect(result.distanceMeters).toBeLessThan(100)
    expect(result.grade).toBe('A')
  })
})

describe('financial model', () => {
  it('produces bankable 25-year economics with degradation and O&M', () => {
    const result = calculateFinancials({
      capacityKwp: 10,
      annualGHI: 5,
      tariffModel: {
        retailRate: 5,
        exportRate: 3.1,
        selfConsumptionPct: 0.6,
      },
    })

    expect(result.panelCount).toBe(18)
    expect(result.epcCost).toBe(320000)
    expect(result.annualOMCost).toBe(3200)
    expect(result.annualKwhYear1).toBeCloseTo(13358, 0)
    expect(result.annualSavingsYear1).toBeCloseTo(56639, 0)
    expect(result.monthlyKwh).toHaveLength(12)
    expect(result.monthlyRevenue).toHaveLength(12)
    expect(result.paybackYears).toBeGreaterThan(6)
    expect(result.paybackYears).toBeLessThan(9)
    expect(result.npv).toBeGreaterThan(200000)
    expect(result.irr).toBeGreaterThan(0.15)
    expect(result.lcoe).toBeGreaterThan(1.5)
    expect(result.lcoe).toBeLessThan(3)
  })
})
