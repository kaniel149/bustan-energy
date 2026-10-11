import { describe, expect, it } from 'vitest'
import { PRODUCTION_TRACKING_IDS, resolveTrackingId } from './tracking-ids'

describe('resolveTrackingId', () => {
  it('prefers a configured env value on any host', () => {
    expect(resolveTrackingId(' G-OVERRIDE ', 'G-PROD', 'localhost')).toBe('G-OVERRIDE')
    expect(resolveTrackingId('G-OVERRIDE', 'G-PROD', 'bustan-energy.com')).toBe('G-OVERRIDE')
  })

  it.each(['bustan-energy.com', 'www.bustan-energy.com', 'BUSTAN-ENERGY.COM'])(
    'falls back to the production id on the production host: %s',
    (hostname) => {
      expect(resolveTrackingId(undefined, 'G-PROD', hostname)).toBe('G-PROD')
      expect(resolveTrackingId('   ', 'G-PROD', hostname)).toBe('G-PROD')
    },
  )

  it.each(['localhost', '127.0.0.1', 'bustan-energy-git-branch.vercel.app', 'notbustan-energy.com', undefined])(
    'stays disabled elsewhere so previews do not pollute production data: %s',
    (hostname) => {
      expect(resolveTrackingId(undefined, 'G-PROD', hostname)).toBeUndefined()
    },
  )

  it('ships the production ids used by the live site', () => {
    expect(PRODUCTION_TRACKING_IDS.ga4MeasurementId).toMatch(/^G-[A-Z0-9]{10}$/)
    expect(PRODUCTION_TRACKING_IDS.metaPixelId).toMatch(/^\d{15,16}$/)
    expect(PRODUCTION_TRACKING_IDS.clarityProjectId).toMatch(/^[a-z0-9]{8,12}$/)
  })
})
