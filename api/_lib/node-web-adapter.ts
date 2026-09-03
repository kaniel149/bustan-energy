// ── Node runtime ⇄ Web handler adapter ──
//
// With `export const config = { runtime: 'nodejs' }` Vercel invokes the default
// export with Node's (IncomingMessage, ServerResponse) — NOT a web Request
// (prod 2026-09-03: `TypeError: req.headers.get is not a function` in
// cron-detect-solar). Handlers in this repo are written against the web API so
// they can move between edge and Node; wrap them with `nodeHandler` when the
// file needs the Node runtime (sharp, maxDuration > 25 s).
//
//   export default nodeHandler(handler)
import type { IncomingMessage, ServerResponse } from 'node:http'

export type WebHandler = (req: Request) => Promise<Response>

function toWebHeaders(raw: IncomingMessage['headers']): Headers {
  const h = new Headers()
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue
    h.set(k, Array.isArray(v) ? v.join(', ') : v)
  }
  return h
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c)
  return Buffer.concat(chunks)
}

export function toWebRequest(req: IncomingMessage): Promise<Request> {
  const method = (req.method ?? 'GET').toUpperCase()
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] || 'https'
  const host = req.headers.host || 'localhost'
  const url = `${proto}://${host}${req.url ?? '/'}`
  const headers = toWebHeaders(req.headers)
  if (method === 'GET' || method === 'HEAD') return Promise.resolve(new Request(url, { method, headers }))
  return readBody(req).then((body) => new Request(url, { method, headers, body: new Uint8Array(body) }))
}

export function nodeHandler(fn: WebHandler): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    let r: Response
    try {
      r = await fn(await toWebRequest(req))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('nodeHandler: unhandled error', message)
      r = Response.json({ ok: false, error: message }, { status: 500 })
    }
    res.statusCode = r.status
    r.headers.forEach((v, k) => res.setHeader(k, v))
    res.end(Buffer.from(await r.arrayBuffer()))
  }
}
