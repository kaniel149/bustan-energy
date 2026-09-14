import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OwnerResearchResult } from '../../src/lib/scan-owner-types'

const providers = vi.hoisted(() => ({ discover: vi.fn(), research: vi.fn() }))
vi.mock('./scan-owner-research-core.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./scan-owner-research-core')>()
  return { ...actual, discoverOwnerBusinesses: providers.discover, researchBusinessOwner: providers.research }
})
import { handler } from '../scan-owner-research'

const candidateId = '11111111-1111-4111-8111-111111111111'
const runId = '22222222-2222-4222-8222-222222222222'
const business = { id: 'saved-place', name: 'Palm Garden Resort', source: 'google_places' as const, website: 'https://palm.example.com/' }
const researchResult: OwnerResearchResult = { version: 1, status: 'needs_identity', searchedAt: '2026-09-07T00:00:00.000Z', nearby: [business], findings: [], sources: [], issues: [] }
const record = { candidate_id: candidateId, result: researchResult, review: { legalOwnerName: 'Manually documented owner', status: 'document_verified' }, updated_at: '2026-09-07T00:00:00.000Z', reviewed_at: '2026-09-07T00:00:00.000Z' }
interface DatabaseOptions { role?: unknown; noCandidate?: boolean; candidateStatus?: string; beginError?: string; authError?: boolean; finishError?: string; missingRun?: boolean; coordinates?: { lat: unknown; lon: unknown } }

function database(options: DatabaseOptions = {}) {
  const calls: Array<{ path: string; body?: Record<string, unknown>; headers: HeadersInit | undefined }> = []
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    const path = url.pathname.replace('/rest/v1/', '')
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ path, body, headers: init?.headers })
    if (path === 'rpc/current_role') return options.authError ? Response.json({ message: 'expired token' }, { status: 401 }) : Response.json(options.role === undefined ? 'admin' : options.role)
    if (path === 'scan_candidates') return Response.json(options.noCandidate ? [] : [{ id: candidateId, name: 'Building (320m²)', lat: 9.75, lon: 100.03, ...options.coordinates, status: options.candidateStatus || 'new' }])
    if (path === 'scan_owner_research') return Response.json([record])
    if (path === 'rpc/begin_scan_owner_research') return options.beginError ? Response.json({ message: options.beginError }, { status: 400 }) : Response.json(options.missingRun ? {} : { runId })
    if (path === 'rpc/finish_scan_owner_research') return options.finishError ? Response.json({ message: options.finishError }, { status: 400 }) : Response.json(record)
    throw new Error(`Unexpected database path: ${path}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}
function request(body: unknown = { candidateId, action: 'discover' }, token = 'test-user-jwt') {
  return new Request('https://bustan.test/api/scan-owner-research', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
}
const expectNoProviders = () => {
  expect(providers.discover).not.toHaveBeenCalled()
  expect(providers.research).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('BUSTAN_SUPABASE_URL', 'https://bustan.test')
  vi.stubEnv('BUSTAN_SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
  providers.discover.mockResolvedValue(researchResult)
  providers.research.mockResolvedValue({ ...researchResult, selectedBusiness: business })
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('scan owner API input and authorization gates', () => {
  it('rejects unsupported methods and missing auth before any database or provider request', async () => {
    const { fetchMock } = database()
    expect((await handler(new Request('https://bustan.test/api/scan-owner-research'))).status).toBe(405)
    expect((await handler(request(undefined, ''))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    expectNoProviders()
  })
  it('returns configuration failure before requests when the service key is missing', async () => {
    vi.stubEnv('BUSTAN_SUPABASE_SERVICE_ROLE_KEY', '')
    const { fetchMock } = database()
    expect((await handler(request())).status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
    expectNoProviders()
  })
  it.each([null, [], {}, { candidateId: 'not-a-uuid', action: 'discover' }, { candidateId, action: 'unknown' }, { candidateId: 3, action: 'discover' }])('rejects malformed input %j before provider or DB calls', async (body) => {
    const { fetchMock } = database()
    expect((await handler(request(body))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expectNoProviders()
  })
  it('rejects invalid JSON and oversized requests', async () => {
    const { fetchMock } = database()
    for (const [body, expectedStatus] of [['{broken', 400], ['x'.repeat(8001), 413]] as const) {
      const req = new Request('https://bustan.test/api/scan-owner-research', { method: 'POST', headers: { Authorization: 'Bearer test-user-jwt' }, body })
      expect((await handler(req)).status).toBe(expectedStatus)
    }
    expect(fetchMock).not.toHaveBeenCalled()
    expectNoProviders()
  })
  it.each([null, '', 'viewer', 'unknown'])('rejects unauthorized role %j before candidate reads or providers', async (role) => {
    const { calls } = database({ role })
    expect((await handler(request())).status).toBe(403)
    expect(calls.map(call => call.path)).toEqual(['rpc/current_role'])
    expectNoProviders()
  })
  it('rejects an expired JWT before provider calls', async () => {
    const { calls } = database({ authError: true })
    expect((await handler(request())).status).toBe(401)
    expect(calls).toHaveLength(1)
    expectNoProviders()
  })
  it.each(['admin', 'sales', 'engineer'])('uses the actual user JWT for all %s role DB requests and claims a lease before providers', async (role) => {
    const { calls } = database({ role })
    providers.discover.mockImplementationOnce(async () => {
      expect(calls.at(-1)?.path).toBe('rpc/begin_scan_owner_research')
      return researchResult
    })
    const response = await handler(request())
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(await response.json()).toEqual({ record })
    expect(calls.every(call => new Headers(call.headers).get('authorization') === 'Bearer test-user-jwt')).toBe(true)
    expect(calls.every(call => new Headers(call.headers).get('apikey') === 'test-service-key')).toBe(true)
    expect(calls.at(-1)).toMatchObject({ path: 'rpc/finish_scan_owner_research', body: { p_candidate_id: candidateId, p_run_id: runId, p_result: researchResult } })
    expect(providers.discover).toHaveBeenCalledTimes(1)
    expect(providers.research).not.toHaveBeenCalled()
  })
  it('does not research a missing or rejected roof', async () => {
    for (const options of [{ noCandidate: true }, { candidateStatus: 'rejected' }]) {
      const { calls } = database(options)
      expect((await handler(request())).status).toBe(options.noCandidate ? 404 : 409)
      expect(calls.some(call => call.path === 'rpc/begin_scan_owner_research')).toBe(false)
      expectNoProviders()
    }
  })
})

describe('scan owner API business selection and persistence', () => {
  it('rejects an unknown saved business ID before acquiring a lease or researching', async () => {
    const { calls } = database()
    const response = await handler(request({ candidateId, action: 'research', business: { source: 'google_places', id: 'forged-place', name: 'Forged owner' } }))
    expect(response.status).toBe(400)
    expect(calls.some(call => call.path === 'rpc/begin_scan_owner_research')).toBe(false)
    expectNoProviders()
  })
  it('uses the saved business identity instead of forged client details', async () => {
    database()
    const response = await handler(request({ candidateId, action: 'research', business: { id: business.id, source: 'google_places', name: 'Forged owner', website: 'https://forged.example.com' } }))
    expect(response.status).toBe(200)
    expect(providers.research).toHaveBeenCalledWith(expect.objectContaining({ id: candidateId }), business, researchResult)
    expect(providers.discover).not.toHaveBeenCalled()
  })
  it('accepts a manually supplied name-only query and rejects an invalid manual website', async () => {
    database()
    expect((await handler(request({ candidateId, action: 'research', business: { source: 'manual', name: 'Palm Garden Resort' } }))).status).toBe(200)
    expect(providers.research).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ name: 'Palm Garden Resort', source: 'manual' }), researchResult)
    providers.research.mockClear()
    expect((await handler(request({ candidateId, action: 'research', business: { source: 'manual', name: 'Palm Garden Resort', website: 'javascript:alert(1)' } }))).status).toBe(400)
    expect(providers.research).not.toHaveBeenCalled()
  })
  it('normalizes database numeric coordinate strings before business discovery', async () => {
    database({ coordinates: { lat: '9.75', lon: '100.03' } })
    expect((await handler(request())).status).toBe(200)
    expect(providers.discover).toHaveBeenCalledWith(expect.objectContaining({ lat: 9.75, lon: 100.03 }))
  })
  it('sends only new research results to the finish RPC so manual review remains under DB ownership', async () => {
    const { calls } = database()
    await handler(request())
    const finished = calls.find(call => call.path === 'rpc/finish_scan_owner_research')!
    expect(Object.keys(finished.body!).sort()).toEqual(['p_candidate_id', 'p_result', 'p_run_id'])
    expect(finished.body?.p_result).not.toHaveProperty('review')
    expect(finished.body?.p_result).not.toHaveProperty('legalOwnerName')
  })
})

describe('scan owner API lease and provider failures', () => {
  it.each(['active_research', 'research_cooldown'])('returns 429 for %s before providers', async (beginError) => {
    const { calls } = database({ beginError })
    expect((await handler(request())).status).toBe(429)
    expectNoProviders()
    expect(calls.some(call => call.path === 'rpc/finish_scan_owner_research')).toBe(false)
  })
  it('honors a DB role gate at the lease stage before starting providers', async () => {
    database({ beginError: 'forbidden' })
    expect((await handler(request())).status).toBe(403)
    expectNoProviders()
  })
  it('does not start providers without a valid lease response', async () => {
    database({ missingRun: true })
    expect((await handler(request())).status).toBe(502)
    expectNoProviders()
  })
  it('releases an acquired lease with a failed result when a provider throws', async () => {
    const { calls } = database()
    providers.discover.mockRejectedValueOnce(new Error('provider failed'))
    expect((await handler(request())).status).toBe(502)
    const finished = calls.filter(call => call.path === 'rpc/finish_scan_owner_research')
    expect(finished).toHaveLength(1)
    expect(finished[0].body).toMatchObject({ p_candidate_id: candidateId, p_run_id: runId, p_result: { status: 'failed', findings: [] } })
  })
  it('persists an explicit provider-failure result for the UI without claiming found owners', async () => {
    const { calls } = database()
    const failed: OwnerResearchResult = { ...researchResult, status: 'failed', nearby: [], issues: ['Provider unavailable'] }
    providers.discover.mockResolvedValueOnce(failed)
    expect((await handler(request())).status).toBe(200)
    expect(calls.at(-1)?.body?.p_result).toEqual(failed)
  })
  it('maps a stale lease to 409 and attempts cleanup without rerunning the provider', async () => {
    const { calls } = database({ finishError: 'stale_research' })
    expect((await handler(request())).status).toBe(409)
    expect(providers.discover).toHaveBeenCalledTimes(1)
    expect(calls.filter(call => call.path === 'rpc/finish_scan_owner_research')).toHaveLength(2)
  })
})
