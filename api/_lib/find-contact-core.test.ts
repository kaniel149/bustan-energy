import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const propertyId = 'research-test-property'
const source = 'https://example.com/contact'
const company = { name: 'Nearby Resort Co.', phone: '+66000000000', website: 'https://example.com' }
const decisionMaker = { name: 'Public Professional', role: 'Operations manager', email: 'operations@example.com' }

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('BUSTAN_SUPABASE_URL', 'https://bustan.test')
  vi.stubEnv('BUSTAN_SUPABASE_SERVICE_ROLE_KEY', 'test-key')
  vi.stubEnv('SUPABASE_URL', 'https://legacy.test')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'legacy-test-key')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function mockRequests(...responses: Response[]) {
  const mocked = vi.fn()
  for (const response of responses) mocked.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', mocked)
  return mocked
}
const json = (data: unknown, status = 200) => Response.json(data, { status })

describe('contact research persistence', () => {
  it('uses the atomic research merge RPC without overwriting authoritative ownership or contact columns', async () => {
    const fetchMock = mockRequests(json(true))
    const { persistToProperty } = await import('./find-contact-core')
    expect(await persistToProperty(propertyId, company, decisionMaker, 0.8, [source], 'test')).toMatchObject({ saved: true })
    const [url, request] = fetchMock.mock.calls[0]
    const body = JSON.parse(request.body)
    expect(url).toBe('https://bustan.test/rest/v1/rpc/merge_contact_research')
    expect(request.method).toBe('POST')
    expect(request.headers['Content-Profile']).toBe('bustan')
    expect(request.headers.Authorization).toBe('Bearer test-key')
    expect(Object.keys(body).sort()).toEqual(['p_property_id', 'p_research'])
    expect(body.p_property_id).toBe(propertyId)
    expect(body.p_research).toMatchObject({
      company, decisionMaker, status: 'needs_review', confidence: 0.8,
      sources: [source], ownershipStatus: 'unverified', caller: 'test', researchedAt: expect.any(String),
    })
    expect(body.p_research.legalOwnerName).toBeUndefined()
    expect(body.p_research.decisionMakerName).toBeUndefined()
    expect(body.p_research.researchStatus).toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deduplicates source URLs and clamps confidence without asserting ownership verification', async () => {
    const fetchMock = mockRequests(json(true))
    const { persistToProperty } = await import('./find-contact-core')
    await persistToProperty(propertyId, company, decisionMaker, 2, [source, source])
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).p_research).toMatchObject({
      confidence: 1, sources: [source], status: 'needs_review', ownershipStatus: 'unverified',
    })
  })

  it('does not store inferred identities or contact details without usable source URLs', async () => {
    const fetchMock = mockRequests(json(true))
    const { persistToProperty } = await import('./find-contact-core')
    await persistToProperty(propertyId, company, decisionMaker, 0.9, [
      'google-places: Nearby Resort', 'javascript:alert(1)', 'https://username:secret@example.com/contact', 'invalid',
    ])
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).p_research).toMatchObject({
      status: 'needs_source', company: {}, decisionMaker: {}, confidence: 0, sources: [],
    })
  })

  it('records a no-result attempt without an authoritative research-status update', async () => {
    const fetchMock = mockRequests(json(true))
    const { persistToProperty } = await import('./find-contact-core')
    await persistToProperty(propertyId, {}, {}, Number.NaN, [])
    const research = JSON.parse(fetchMock.mock.calls[0][1].body).p_research
    expect(research).toMatchObject({ status: 'not_found', confidence: 0, researchedAt: expect.any(String) })
    expect(research.researchStatus).toBeUndefined()
  })

  it.each(['', '   '])('skips persistence entirely without a property ID (%j)', async (id) => {
    const fetchMock = mockRequests()
    const { persistToProperty } = await import('./find-contact-core')
    expect(await persistToProperty(id, company, decisionMaker, 0.8, [source])).toMatchObject({ saved: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not send an unconfigured service key', async () => {
    vi.stubEnv('BUSTAN_SUPABASE_SERVICE_ROLE_KEY', '')
    const fetchMock = mockRequests()
    const { persistToProperty } = await import('./find-contact-core')
    expect(await persistToProperty(propertyId, company, decisionMaker, 0.8, [source])).toMatchObject({ saved: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { label: 'missing property', response: json(false) },
    { label: 'write failure', response: json({}, 500) },
    { label: 'invalid response', response: json([]) },
  ])('does not claim a save or patch the legacy CRM on $label', async ({ response }) => {
    const fetchMock = mockRequests(response)
    const { persistToProperty } = await import('./find-contact-core')
    expect(await persistToProperty(propertyId, company, decisionMaker, 0.8, [source])).toMatchObject({ saved: false })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://bustan.test/rest/v1/rpc/merge_contact_research')
  })

  it('returns a failure instead of throwing or falling through to a legacy flat patch on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')))
    const { persistToProperty } = await import('./find-contact-core')
    expect(await persistToProperty(propertyId, company, decisionMaker, 0.8, [source])).toMatchObject({ saved: false })
  })
})

describe('retrieved source provenance', () => {
  it('does not turn model-invented URLs into research evidence and supports discovery without saving', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'test-firecrawl-key')
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '')
    const text = 'Public business contact and operations information. '.repeat(4)
    const fetchMock = mockRequests(
      json({ success: true, data: [{ url: source, markdown: text }] }),
      json({ success: true, data: { markdown: text } }),
      json({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        company, decision_maker: decisionMaker, confidence: 0.8,
        sources: [source, 'https://fabricated.example/ownership-proof'],
      }) }] } }] }),
    )
    const { runFindContactPipeline } = await import('./find-contact-core')
    const result = await runFindContactPipeline({ propertyId: '', name: company.name, website: company.website })
    expect(result.sources).toContain(source)
    expect(result.sources).not.toContain('https://fabricated.example/ownership-proof')
    expect(result.saved).toBe(false)
    expect(result.stages).toContainEqual(expect.objectContaining({ stage: 'persist', status: 'skipped' }))
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
