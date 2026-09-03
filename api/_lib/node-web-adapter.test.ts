import { describe, it, expect } from 'vitest'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { nodeHandler } from './node-web-adapter.js'

function fakeReq(opts: { method?: string; url?: string; headers?: Record<string, string | string[]>; body?: string[] }): IncomingMessage {
  const r = Readable.from(opts.body ?? []) as unknown as IncomingMessage
  Object.assign(r, { method: opts.method ?? 'GET', url: opts.url ?? '/api/x', headers: { host: 'bustan-energy.com', ...(opts.headers ?? {}) } })
  return r
}

function fakeRes() {
  const headers: Record<string, string> = {}
  const chunks: Buffer[] = []
  const res = {
    statusCode: 200,
    setHeader: (k: string, v: string) => { headers[k.toLowerCase()] = v },
    end: (b?: Buffer | string) => { if (b) chunks.push(Buffer.from(b)); res.ended = true },
    ended: false,
  }
  return { res: res as unknown as ServerResponse, headers, body: () => Buffer.concat(chunks).toString('utf8'), state: res }
}

describe('nodeHandler', () => {
  it('exposes Bearer auth through req.headers.get and builds the URL from host + path', async () => {
    let seen: Request | null = null
    const h = nodeHandler(async (req) => { seen = req; return Response.json({ ok: true }) })
    const { res, state } = fakeRes()
    await h(fakeReq({ url: '/api/cron-detect-solar?x=1', headers: { authorization: 'Bearer s3cret' } }), res)
    expect(seen!.headers.get('authorization')).toBe('Bearer s3cret')
    expect(seen!.method).toBe('GET')
    expect(new URL(seen!.url).pathname).toBe('/api/cron-detect-solar')
    expect(new URL(seen!.url).searchParams.get('x')).toBe('1')
    expect(state.ended).toBe(true)
  })
  it('flattens string[] headers and parses a JSON POST body', async () => {
    let parsed: unknown = null; let cookie = ''
    const h = nodeHandler(async (req) => { parsed = await req.json(); cookie = req.headers.get('cookie') ?? ''; return new Response(null, { status: 204 }) })
    const { res } = fakeRes()
    await h(fakeReq({ method: 'POST', headers: { 'content-type': 'application/json', cookie: ['a=1', 'b=2'] }, body: ['{"limit":', '4}'] }), res)
    expect(parsed).toEqual({ limit: 4 })
    expect(cookie).toBe('a=1, b=2')
    expect(res.statusCode).toBe(204)
  })
  it('propagates status, headers and body to the ServerResponse', async () => {
    const h = nodeHandler(async () => Response.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: { 'x-test': 'yes' } }))
    const { res, headers, body } = fakeRes()
    await h(fakeReq({}), res)
    expect(res.statusCode).toBe(401)
    expect(headers['x-test']).toBe('yes')
    expect(headers['content-type']).toContain('application/json')
    expect(JSON.parse(body())).toEqual({ ok: false, error: 'unauthorized' })
  })
  it('answers 500 instead of crashing when the web handler throws', async () => {
    const h = nodeHandler(async () => { throw new Error('boom') })
    const { res, body } = fakeRes()
    await h(fakeReq({}), res)
    expect(res.statusCode).toBe(500)
    expect(JSON.parse(body()).error).toBe('boom')
  })
})
