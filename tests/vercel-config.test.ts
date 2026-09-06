import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
type Rule = { source: string; destination: string; has?: { type: string; value: string }[]; permanent?: boolean }
const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as { redirects: Rule[]; rewrites: Rule[] }

describe('vercel.json external layer', () => {
  it('redirects the academy vanity host to the canonical GitHub Pages academy (no proxy); SPA catch-all stays last', () => {
    const r = cfg.redirects.find((x) => x.has?.some((h) => h.type === 'host' && h.value === 'academy.bustan-energy.com'))
    expect(r).toMatchObject({ source: '/:path*', destination: 'https://index.bustan-energy.com/academy/:path*', permanent: true })
    expect(cfg.rewrites.some((x) => x.source.startsWith('/academy'))).toBe(false)
    expect(cfg.rewrites.at(-1)).toEqual({ source: '/(.*)', destination: '/index.html' })
  })
})
