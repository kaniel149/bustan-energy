import { afterEach, describe, expect, it, vi } from 'vitest'
import handler, { parseCompanyFields } from '../enrich-owner'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('public company contact extraction', () => {
  it('removes the leaked Markdown closing parenthesis from the observed contacts', () => {
    const parsed = parseCompanyFields('Phone: +66946692011)\n[Skip to content](https://bustan-energy.com/#main-content)')
    expect(parsed.businessPhone).toBe('+66946692011')
    expect(parsed.website).toBe('https://bustan-energy.com/#main-content')
  })

  it('preserves balanced phone grouping while stripping an unmatched Markdown wrapper', () => {
    expect(parseCompanyFields('Phone: +66 (0)94 6692011)').businessPhone).toBe('+66 (0)94 6692011')
    expect(parseCompanyFields('Phone: +66 (094) 6692011').businessPhone).toBe('+66 (094) 6692011')
    expect(parseCompanyFields('Phone: +66 (946692011)').businessPhone).toBe('+66 (946692011)')
  })

  it('preserves balanced URL parentheses, underscores, queries and fragments', () => {
    const website = 'https://example.com/roof_(east)?view=(day)#main_content'
    const parsed = parseCompanyFields(`[Website](${website})`)
    expect(parsed.website).toBe(website)
    expect(new URL(parsed.website!).searchParams.get('view')).toBe('(day)')
    expect(parseCompanyFields('Website: https://example.com/roof_(east)').website).toBe('https://example.com/roof_(east)')
  })

  it('removes nested trailing wrappers without stripping a balanced path suffix', () => {
    expect(parseCompanyFields('[Website](https://example.com/roof_(east)))**').website).toBe('https://example.com/roof_(east)')
  })

  it('stops URL extraction at HTML delimiters', () => {
    expect(parseCompanyFields('Website: <https://example.com/contact>')).toMatchObject({ website: 'https://example.com/contact' })
    expect(parseCompanyFields('Website: https://example.com/contact</a>').website).toBe('https://example.com/contact')
  })

  it('preserves a scheme-less website supplied by structured extraction', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'test-provider-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, data: { json: {
      companyLegalName: 'Bustan Energy', website: 'bustan-energy.com', businessPhone: '+66 (946692011)',
    } } })))
    const response = await handler(new Request('https://test.local/api/enrich-owner', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://bustan-energy.com' }),
    }))
    expect(await response.json()).toMatchObject({ data: { website: 'bustan-energy.com', businessPhone: '+66 (946692011)' } })
  })

  it.each(['markdown', 'json'] as const)('returns clean %s contacts through the API handler', async (format) => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'test-provider-key')
    const data = format === 'markdown'
      ? { markdown: 'Phone: +66946692011)\n[Website](https://bustan-energy.com/#main_content)' }
      : { json: { companyLegalName: 'Bustan Energy', businessPhone: '+66946692011)', website: 'https://bustan-energy.com/#main_content)' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, data })))
    const response = await handler(new Request('https://test.local/api/enrich-owner', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://bustan-energy.com' }),
    }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ configured: true, source: 'firecrawl', data: {
      businessPhone: '+66946692011', website: 'https://bustan-energy.com/#main_content',
    } })
  })
})
