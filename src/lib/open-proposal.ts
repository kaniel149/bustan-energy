import type { Property } from '../types'
import type { FinancialAnalysis } from './financial-calc'
import { REGIONS } from './regions'
import { getSatelliteImageUrl } from './enrich-building'

const DEFAULT_PPA_DISCOUNT = 0.80  // PPA price = 80% of grid tariff
const DEFAULT_PHONE = '66946692011' // Bustan Energy Thailand (+66 94 669 2011)
const LINE_OA_ID = import.meta.env.VITE_LINE_OA_ID || '%40bustan-energy'

export function openProposal(params: {
  property: Property
  financial: FinancialAnalysis
  regionId: string
}) {
  const { property, financial, regionId } = params
  const region = REGIONS[regionId]
  const tariff = property.category === 'residential'
    ? region.tariffResidential
    : region.tariffCommercial

  const ref = `BU-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${property.id.slice(0, 6).toUpperCase()}`

  const q = new URLSearchParams()
  q.set('n', property.ownerName || property.title || `Building ${property.id.slice(0, 8)}`)
  q.set('a', String(Math.round(property.area || property.sizeM2 || 0)))
  q.set('u', String(Math.round((property.area || property.sizeM2 || 0) * 0.7)))
  q.set('kw', String(Math.round(financial.capacityKwp * 10) / 10))
  q.set('p', String(financial.panelCount))
  q.set('kwh', String(Math.round(financial.annualKwhYear1)))
  q.set('epc', String(Math.round(financial.epcCost)))
  q.set('pea', String(tariff))
  q.set('ppa', String(Math.round(tariff * DEFAULT_PPA_DISCOUNT * 100) / 100))
  q.set('la', String(property.lat))
  q.set('lo', String(property.lng))
  q.set('ref', ref)
  q.set('ph', property.phone?.replace(/[^0-9]/g, '') || DEFAULT_PHONE)
  q.set('line', LINE_OA_ID)

  // Satellite image — proxy URL served by /api/enrich-place (no key in bundle).
  // Build an absolute URL so proposal.html can load it from any origin.
  const proxyPath = getSatelliteImageUrl(property.lat, property.lng)
  const imgUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${proxyPath}`
    : proxyPath
  q.set('img1', imgUrl)

  window.open(`/proposal.html?${q.toString()}`, '_blank')
}
