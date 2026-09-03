import { describe, it, expect } from 'vitest'
import manifest from '../data/knowledge-manifest.json'
import { filterKnowledge, groupByLayer, LAYERS } from './knowledge'

describe('knowledge manifest', () => {
  it('every row is complete and unique', () => {
    const urls = new Set<string>()
    for (const r of manifest) {
      expect(r.title.length).toBeGreaterThan(2); expect(r.url).toMatch(/^https:\/\//)
      expect(LAYERS).toContain(r.layer); expect(['he', 'en']).toContain(r.lang); expect(r.group.length).toBeGreaterThan(1)
      expect(urls.has(r.url)).toBe(false); urls.add(r.url)
    }
    expect(manifest.length).toBeGreaterThan(60)
  })
  it('filters by text (title/group) and by layer, case-insensitive', () => {
    expect(filterKnowledge(manifest, 'pea', 'all').every((r) => /pea/i.test(r.title + r.group + r.url))).toBe(true)
    expect(filterKnowledge(manifest, 'pea', 'all').length).toBeGreaterThanOrEqual(5)
    expect(filterKnowledge(manifest, '', 'client').every((r) => r.layer === 'client')).toBe(true)
    const g = groupByLayer(filterKnowledge(manifest, '', 'all'))
    expect(Object.keys(g)).toEqual(['internal', 'team', 'client'])
  })
})
