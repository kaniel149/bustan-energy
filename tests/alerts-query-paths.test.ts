import { describe, expect, it } from 'vitest'
import { alertQueryPaths } from '../api/_lib/alerts-core'

describe('alertQueryPaths', () => {
  const since = '2026-09-14T04:30:31.342+00:00' // exactly what PostgREST returns for timestamptz

  it('URL-encodes the timezone offset so PostgREST does not receive a space', () => {
    const paths = alertQueryPaths(since)
    for (const path of Object.values(paths)) {
      expect(path).toContain('gt.2026-09-14T04%3A30%3A31.342%2B00%3A00')
      expect(path).not.toContain('+00:00')
    }
  })

  it('keeps the four alert queries on their own tables', () => {
    const paths = alertQueryPaths(since)
    expect(paths.approved).toMatch(/^properties\?/)
    expect(paths.newA).toMatch(/^scan_candidates\?/)
    expect(paths.firstViews).toMatch(/^proposals\?/)
    expect(paths.signatures).toMatch(/^proposal_signatures\?/)
  })
})
