import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
const xml = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
describe('public sitemap', () => {
  it('lists the new public pages in en + th; never private surfaces or other hosts', () => {
    for (const p of ['/partners', '/th/partners', '/about', '/th/about']) expect(locs).toContain(`https://bustan-energy.com${p}`)
    for (const l of locs) { expect(l).toMatch(/^https:\/\/bustan-energy\.com\//); expect(l).not.toMatch(/\/(admin|crm|platform|p|proposals|colliers)\b/) }
  })
})
