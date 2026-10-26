import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  discoverOwnerBusinesses, meaningfulBusinessName, publicWebsite, researchBusinessOwner,
  selectBusiness, validateOwnerFindings,
} from './scan-owner-research-core'
import type { ResearchCandidate, SourcePage } from './scan-owner-research-core'
import type { OwnerBusinessMatch, OwnerResearchResult } from '../../src/lib/scan-owner-types'

const candidate: ResearchCandidate = { id: 'candidate-1', name: 'Building (320m²)', lat: 9.75, lon: 100.03, area_name: 'Koh Phangan' }
const business: OwnerBusinessMatch = { id: 'place-1', name: 'Palm Garden Resort', website: 'https://palm.example.com/', source: 'google_places' }
const sourceUrl = 'https://palm.example.com/about'
const result = (nearby: OwnerBusinessMatch[] = [business]): OwnerResearchResult => ({ version: 1, status: 'needs_identity', searchedAt: new Date().toISOString(), nearby, findings: [], sources: [], issues: [] })
const page = (text: string, url = sourceUrl, title = business.name): SourcePage => ({ url, title, text })
const finding = (overrides: Record<string, unknown> = {}) => ({ kind: 'business_owner', name: 'Jane Doe', role: 'owner', sourceUrl, excerpt: 'Palm Garden Resort owner Jane Doe welcomes guests.', ...overrides })
const providerJSON = (body: unknown, status = 200) => Response.json(body, { status })

beforeEach(() => {
  vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-places-key')
  vi.stubEnv('FIRECRAWL_API_KEY', 'test-firecrawl-key')
  vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')
  vi.stubEnv('NANOBANANA_API_KEY', '')
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('public business identity inputs', () => {
  it.each(['javascript:alert(1)', 'ftp://example.com/file', 'https://user:pass@example.com', 'http://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://internal', 'http://example.com:8000', 'https://host.internal', 'https://host.test'])('rejects unsafe or non-public URL %s', (url) => {
    expect(publicWebsite(url)).toBeUndefined()
  })
  it('normalizes a public domain and keeps its path/query without a fragment', () => {
    expect(publicWebsite('www.example.com/about?lang=en#team')).toBe('https://www.example.com/about?lang=en')
  })
  it.each(['Building (320m²)', 'Roof 42', 'גג 22', 'Untitled', '320 m²', 'Unknown'])('does not treat %s as a named business', (name) => {
    expect(meaningfulBusinessName(name)).toBeUndefined()
  })
  it('requires a saved identity for a non-manual selection and ignores client-forged identity details', () => {
    expect(selectBusiness({ source: 'google_places', id: 'unknown', name: 'Forged owner' }, result())).toBeNull()
    expect(selectBusiness({ source: 'google_places', id: business.id, name: 'Forged owner', website: 'https://evil.example.com' }, result())).toEqual(business)
  })
  it('permits a manual name-only business search but rejects an explicitly invalid website', () => {
    expect(selectBusiness({ source: 'manual', name: 'Palm Garden Resort' }, null)).toMatchObject({ id: 'manual', name: 'Palm Garden Resort', source: 'manual' })
    expect(selectBusiness({ source: 'manual', name: 'Palm Garden Resort', website: 'javascript:alert(1)' }, null)).toBeNull()
    expect(selectBusiness({ source: 'manual', name: 'Building 5' }, null)).toBeNull()
  })
})

describe('nearby business discovery', () => {
  it('returns nearby match candidates and distances without selecting a business or asserting any owner', async () => {
    const fetcher = vi.fn().mockResolvedValue(providerJSON({ places: [{
      id: 'nearest-place', displayName: { text: 'Neighbour Business' }, location: { latitude: 9.7501, longitude: 100.03 },
      formattedAddress: 'Public business address', websiteUri: 'https://neighbour.example.com', internationalPhoneNumber: '+66000000000',
    }] }))
    const found = await discoverOwnerBusinesses(candidate, fetcher)
    expect(found).toMatchObject({ status: 'needs_identity', nearby: [expect.objectContaining({ id: 'nearest-place', source: 'google_places', distanceM: expect.any(Number) })], findings: [], sources: [] })
    expect(found.selectedBusiness).toBeUndefined()
    expect(found.nearby[0].mapsUrl).toContain('query_place_id=nearest-place')
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ maxResultCount: 5, locationRestriction: { circle: { radius: 200 } } })
  })
  it('keeps a seed business only as an identity candidate when Places is unavailable', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '')
    const fetcher = vi.fn()
    const found = await discoverOwnerBusinesses({ ...candidate, name: business.name, website: business.website }, fetcher)
    expect(found.nearby).toEqual([expect.objectContaining({ id: `candidate:${candidate.id}`, source: 'candidate' })])
    expect(found.status).toBe('needs_identity')
    expect(found.findings).toEqual([])
    expect(found.issues.length).toBeGreaterThan(0)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it.each([null, Number.NaN, 100])('does not send invalid latitude %s to a provider', async (lat) => {
    const fetcher = vi.fn()
    const found = await discoverOwnerBusinesses({ ...candidate, lat }, fetcher)
    expect(fetcher).not.toHaveBeenCalled()
    expect(found.issues.length).toBeGreaterThan(0)
  })
  it('reports a provider failure without invented business findings', async () => {
    const found = await discoverOwnerBusinesses(candidate, vi.fn().mockResolvedValue(providerJSON({}, 503)))
    expect(found).toMatchObject({ status: 'needs_identity', findings: [], nearby: [] })
    expect(found.issues.length).toBeGreaterThan(0)
  })
})

describe('source-grounded professional role validation', () => {
  it('accepts an explicit named role only from a retrieved matching page', () => {
    const excerpt = finding().excerpt
    expect(validateOwnerFindings([finding()], [page(excerpt)], business)).toEqual([finding()])
  })
  it.each([
    { label: 'invented source', value: finding({ sourceUrl: 'https://invented.example.com/about' }) },
    { label: 'script URL', value: finding({ sourceUrl: 'javascript:alert(1)' }) },
    { label: 'invented quote', value: finding({ excerpt: 'Palm Garden Resort owner Jane Doe founded the business in 2020.' }) },
    { label: 'unpublished name', value: finding({ name: 'Alice Roe' }) },
    { label: 'unpublished role', value: finding({ role: 'chief executive' }) },
    { label: 'legal owner claim', value: finding({ kind: 'legal_owner' }) },
    { label: 'unsupported owner inference', value: finding({ excerpt: 'Palm Garden Resort contact Jane Doe welcomes guests.' }) },
  ])('rejects $label', ({ value }) => {
    const text = `${finding().excerpt} Palm Garden Resort contact Jane Doe welcomes guests.`
    expect(validateOwnerFindings([value], [page(text)], business)).toEqual([])
  })
  it('rejects an unrelated business source even when it names a person and role', () => {
    const unrelated = 'Other Lagoon Resort owner Jane Doe welcomes guests.'
    const url = 'https://directory.example.com/lagoon'
    expect(validateOwnerFindings([finding({ sourceUrl: url, excerpt: unrelated })], [page(unrelated, url, 'Other Lagoon Resort')], { ...business, website: undefined })).toEqual([])
  })
  it('does not trust an unrelated Google Sites tenant merely because the hostname matches', () => {
    const excerpt = 'Other Lagoon Resort owner Jane Doe welcomes guests.'
    const url = 'https://sites.google.com/view/other-lagoon'
    expect(validateOwnerFindings([finding({ sourceUrl: url, excerpt })], [page(excerpt, url, 'Other Lagoon Resort')], {
      ...business, website: 'https://sites.google.com/view/palm-garden',
    })).toEqual([])
  })
  it('rejects a person explicitly described as not the owner', () => {
    const excerpt = 'Palm Garden Resort: Jane Doe is not the owner. Alice Roe is the owner.'
    expect(validateOwnerFindings([finding({ excerpt })], [page(excerpt)], business)).toEqual([])
  })
  it('does not assign another person’s explicit owner role to a manager in the same excerpt', () => {
    const excerpt = 'Palm Garden Resort manager Jane Doe works with owner Alice Roe.'
    expect(validateOwnerFindings([finding({ excerpt })], [page(excerpt)], business)).toEqual([])
  })
  it('does not match a short person name inside another published name', () => {
    const excerpt = 'Palm Garden Resort owner Joanna Doe welcomes guests.'
    expect(validateOwnerFindings([finding({ name: 'Ann', excerpt })], [page(excerpt)], business)).toEqual([])
  })
  it('does not match a business token only as a substring of an unrelated business', () => {
    const excerpt = 'Martin Resort owner Jane Doe welcomes guests.'
    const url = 'https://directory.example.com/martin'
    expect(validateOwnerFindings([finding({ sourceUrl: url, excerpt })], [page(excerpt, url, 'Martin Resort')], { ...business, name: 'Art Resort', website: undefined })).toEqual([])
  })
  it('enforces a cumulative quote budget per domain and deduplicates roles', () => {
    const excerpt = 'Palm Garden Resort owner Jane Doe welcomes guests to this island business and carefully manages the public restaurant operations daily.'
    const second = 'Palm Garden Resort manager Alice Roe welcomes guests every morning.'
    expect(excerpt.split(/\s+/).length).toBeLessThanOrEqual(25)
    const accepted = validateOwnerFindings([finding({ excerpt }), finding({ excerpt }), finding({ kind: 'manager', name: 'Alice Roe', role: 'manager', excerpt: second })], [page(`${excerpt} ${second}`)], business)
    expect(accepted).toHaveLength(1)
  })
  it('keeps a complete source-backed prefix when a model appends an unsupported sentence', () => {
    const grounded = 'Jane Doe. Founder of Palm Garden Resort.'
    const proposed = finding({ kind: 'founder', role: 'Founder', excerpt: grounded + ' Invented unrelated project details.' })
    expect(validateOwnerFindings([proposed], [page(grounded)], business)).toEqual([{ ...proposed, excerpt: grounded }])
  })
  it('does not trim away a contradictory negation from a proposed passage', () => {
    const grounded = 'Palm Garden Resort owner Jane Doe welcomes guests.'
    expect(validateOwnerFindings([finding({ excerpt: grounded + ' She is not the owner.' })], [page(grounded)], business)).toEqual([])
  })
  it('omits a source date that is not published on the retrieved page', () => {
    expect(validateOwnerFindings([finding({ sourceDate: '2026-09-07' })], [page(finding().excerpt)], business)[0].sourceDate).toBeUndefined()
  })
})

describe('research provider workflow', () => {
  it('uses a name and area query without requiring a website, then validates the extraction', async () => {
    const manual = { ...business, source: 'manual' as const, website: undefined }
    const excerpt = finding().excerpt
    const fetcher = vi.fn()
      .mockResolvedValueOnce(providerJSON({ success: true, data: { web: [{ url: sourceUrl, title: business.name, markdown: excerpt }] } }))
      .mockResolvedValueOnce(providerJSON({ candidates: [{ content: { parts: [{ text: JSON.stringify({ findings: [finding()] }) }] } }] }))
    const researched = await researchBusinessOwner(candidate, manual, result(), fetcher)
    expect(JSON.parse(fetcher.mock.calls[0][1].body).query).toContain('"Palm Garden Resort" "Koh Phangan"')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(researched.status).toBe('findings')
    expect(researched.findings).toEqual([finding()])
    expect(researched.sources).toEqual([{ url: sourceUrl, title: business.name }])
  })
  it('returns failed without provider requests when research is not configured', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', '')
    const fetcher = vi.fn()
    expect((await researchBusinessOwner(candidate, business, result(), fetcher)).status).toBe('failed')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('distinguishes no matching sources from provider failure', async () => {
    const noSource = vi.fn().mockResolvedValue(providerJSON({ success: true, data: { web: [] } }))
    expect((await researchBusinessOwner(candidate, { ...business, website: undefined }, result(), noSource)).status).toBe('not_found')
    const unavailable = vi.fn().mockResolvedValue(providerJSON({}, 503))
    expect((await researchBusinessOwner(candidate, { ...business, website: undefined }, result(), unavailable)).status).toBe('failed')
  })
  it('retains fetched matching sources on extractor failure', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(providerJSON({ success: true, data: { web: [{ url: sourceUrl, title: business.name, markdown: finding().excerpt }] } }))
      .mockResolvedValueOnce(providerJSON({}, 429))
    const researched = await researchBusinessOwner(candidate, { ...business, website: undefined }, result(), fetcher)
    expect(researched.status).toBe('failed')
    expect(researched.findings).toEqual([])
    expect(researched.sources).toHaveLength(1)
  })
  it('keeps a usable website source when web search fails', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(providerJSON({}, 503))
      .mockResolvedValueOnce(providerJSON({ success: true, data: { metadata: { sourceURL: sourceUrl, title: business.name }, markdown: finding().excerpt } }))
      .mockResolvedValueOnce(providerJSON({ candidates: [{ content: { parts: [{ text: JSON.stringify({ findings: [finding()] }) }] } }] }))
    const researched = await researchBusinessOwner(candidate, business, result(), fetcher)
    expect(researched.status).toBe('findings')
    expect(researched.issues.length).toBeGreaterThan(0)
  })
})
