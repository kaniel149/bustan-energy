import { describe, it, expect } from 'vitest'
import { signedPage, NEXT_STEPS } from './proposal-signed-page.js'

describe('signedPage', () => {
  const html = signedPage({ ref: 'BE-2026-0042', clientName: '<script>x</script>Villa Mango', kwp: 32.5, signedAt: '2026-09-03T04:00:00Z' })
  it('is a noindex page that names the ref, escapes the client and lists the four PEA steps', () => {
    expect(html).toContain('noindex')
    expect(html).toContain('BE-2026-0042')
    expect(html).not.toContain('<script>x</script>')
    expect(html).toContain('&lt;script&gt;')
    expect(NEXT_STEPS).toHaveLength(4)
    for (const s of NEXT_STEPS) expect(html).toContain(s.title)
    expect(html).toContain('wa.me/66946692011')
    expect(html).toContain('32.5 kWp')
    expect(signedPage({ ref: 'X1' })).toContain('X1')   // optional fields absent
  })
})
