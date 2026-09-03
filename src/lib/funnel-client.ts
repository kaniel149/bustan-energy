import { getSession } from './admin-auth'

export interface FunnelStage {
  key: string
  label: string
  all: number
  kp: number | null
  rest: number | null
  d7: number
  pending?: number
  added?: number
  rejected?: number
  pendingA?: number
  kpPendingA?: number
}
export interface PendingA {
  id: string
  name: string | null
  estimated_kwp: number | null
  lat: number
  lon: number
  footprint_class: string | null
  existing_solar: boolean | null
  external_id: string | null
}
export interface FunnelResponse {
  ok: boolean
  generated_at: string
  stages: FunnelStage[]
  attention: {
    pending_a: PendingA[]
    no_contact: { id: string; name: string | null; kp: boolean }[]
    viewed_unsigned: { ref_number: string; client_name: string | null; first_viewed_at: string | null }[]
  }
}

/** Bar widths (%) relative to the largest stage; 4% floor keeps empty stages visible. */
export function funnelWidths(stages: { all: number }[]): number[] {
  const max = Math.max(1, ...stages.map((s) => s.all))
  return stages.map((s) => Math.max(4, Math.round((s.all / max) * 100)))
}

export async function fetchAdminFunnel(): Promise<FunnelResponse | null> {
  const session = await getSession()
  if (!session?.access_token) return null
  const res = await fetch('/api/admin-funnel', { headers: { Authorization: `Bearer ${session.access_token}` } })
  if (!res.ok) return null
  const json: FunnelResponse = await res.json()
  return json.ok ? json : null
}
