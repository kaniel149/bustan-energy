import { nodeHandler } from './_lib/node-web-adapter.js'
import { discoverOwnerBusinesses, researchBusinessOwner, selectBusiness } from './_lib/scan-owner-research-core.js'
import type { ResearchCandidate } from './_lib/scan-owner-research-core.js'
import type { OwnerResearchRecord } from '../src/lib/scan-owner-types.js'

export const config = { runtime: 'nodejs', maxDuration: 90 }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405)
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return response({ error: 'יש להתחבר כדי לחפש בעלים' }, 401)
  const base = process.env.BUSTAN_SUPABASE_URL || 'https://ygoiaabzkuvdsyyduvhv.supabase.co'
  const key = process.env.BUSTAN_SUPABASE_SERVICE_ROLE_KEY
  if (!key) return response({ error: 'חיבור מחקר הבעלים אינו זמין כרגע' }, 503)
  const headers = { apikey: key, Authorization: auth, 'Content-Type': 'application/json', 'Accept-Profile': 'bustan', 'Content-Profile': 'bustan' }
  async function db(path: string, body?: unknown): Promise<unknown> {
    const r = await fetch(`${base}/rest/v1/${path}`, { headers, method: body === undefined ? 'GET' : 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) })
    if (!r.ok) {
      const data = await r.json().catch(() => ({})) as { message?: string }
      throw new Error(r.status === 401 ? 'unauthorized' : data.message || 'database_error')
    }
    return r.json()
  }
  let runId: string | undefined
  let candidateId: string | undefined
  try {
    const raw = await req.text()
    if (raw.length > 8000) return response({ error: 'בקשת החיפוש ארוכה מדי' }, 413)
    let body: Record<string, unknown>
    try { body = JSON.parse(raw) as Record<string, unknown> } catch { return response({ error: 'בקשת חיפוש לא תקינה' }, 400) }
    if (!body || typeof body !== 'object' || typeof body.candidateId !== 'string' || !uuid.test(body.candidateId) || !['discover', 'research'].includes(String(body.action))) return response({ error: 'יש לבחור גג ופעולת חיפוש תקינים' }, 400)
    candidateId = body.candidateId
    // Use the Bustan user's JWT throughout: RPC role gates and RLS see the actual actor.
    const role = await db('rpc/current_role', {})
    if (!['admin', 'sales', 'engineer'].includes(String(role))) return response({ error: 'אין הרשאה לבצע מחקר בעלים' }, 403)
    const [rows, records] = await Promise.all([
      db(`scan_candidates?id=eq.${candidateId}&select=id,name,lat,lon,website,phone,area_name,status&limit=1`),
      db(`scan_owner_research?candidate_id=eq.${candidateId}&select=candidate_id,result,review,updated_at,reviewed_at&limit=1`),
    ])
    const candidate = (rows as Array<ResearchCandidate & { status: string }>)[0]
    if (candidate) {
      candidate.lat = candidate.lat == null ? null : Number(candidate.lat)
      candidate.lon = candidate.lon == null ? null : Number(candidate.lon)
    }
    if (!candidate) return response({ error: 'הגג לא נמצא במאגר' }, 404)
    if (candidate.status === 'rejected') return response({ error: 'הגג נדחה ואינו פתוח למחקר' }, 409)
    const previous = (records as OwnerResearchRecord[])[0] ?? null
    const business = body.action === 'research' ? selectBusiness(body.business, previous?.result ?? null) : null
    if (body.action === 'research' && !business) return response({ error: 'בחרו עסק מהרשימה או הזינו שם עסק ואתר ציבורי תקין' }, 400)
    const claim = await db('rpc/begin_scan_owner_research', { p_candidate_id: candidateId, p_action: body.action }) as { runId: string }
    runId = claim.runId
    if (!runId) throw new Error('database_error')
    const result = business ? await researchBusinessOwner(candidate, business, previous?.result ?? null) : await discoverOwnerBusinesses(candidate)
    const record = await db('rpc/finish_scan_owner_research', { p_candidate_id: candidateId, p_run_id: runId, p_result: result })
    runId = undefined
    return response({ record })
  } catch (error) {
    const reason = error instanceof Error ? error.message : ''
    // Release an acquired lease even when a provider/DB operation fails; existing review is always preserved.
    if (runId && candidateId) {
      await db('rpc/finish_scan_owner_research', { p_candidate_id: candidateId, p_run_id: runId, p_result: { version: 1, status: 'failed', searchedAt: new Date().toISOString(), nearby: [], findings: [], sources: [], issues: ['החיפוש לא הושלם. אפשר לנסות שוב.'] } }).catch(() => undefined)
    }
    if (/unauthorized|JWT|token.*expired/i.test(reason)) return response({ error: 'פג תוקף החיבור. יש להתחבר מחדש' }, 401)
    if (/active_research|research_cooldown/.test(reason)) return response({ error: 'חיפוש כבר מתבצע או הסתיים זה עתה. המתינו כדקה ונסו שוב.' }, 429)
    if (/forbidden|permission|not authorized/i.test(reason)) return response({ error: 'אין הרשאה לבצע מחקר בעלים' }, 403)
    if (/stale_research/.test(reason)) return response({ error: 'החיפוש ארך יותר מדי. המידע הקודם נשמר; נסו שוב.' }, 409)
    console.error('scan-owner-research failed', reason.replace(/https?:\/\/\S+/g, '[url]').slice(0, 120))
    return response({ error: 'לא ניתן להשלים את מחקר הבעלים כרגע. נסו שוב.' }, 502)
  }
}
export default nodeHandler(handler)
