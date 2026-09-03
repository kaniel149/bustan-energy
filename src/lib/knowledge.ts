// Pure helpers for /admin/knowledge — the manifest lives in src/data/knowledge-manifest.json.
export const LAYERS = ['internal', 'team', 'client'] as const
export type Layer = (typeof LAYERS)[number]
export interface KnowledgeRow { title: string; url: string; layer: Layer | string; group: string; lang: 'he' | 'en' | string }
export const LAYER_LABELS: Record<Layer, string> = {
  internal: 'פנימי — קניאל/ארז',
  team: 'צוות — SOPs והדרכה',
  client: 'לקוח — מצגות וחוזים',
}

export function filterKnowledge(rows: KnowledgeRow[], q: string, layer: Layer | 'all'): KnowledgeRow[] {
  const s = q.trim().toLowerCase()
  return rows.filter((r) => (layer === 'all' || r.layer === layer) && (!s || `${r.title} ${r.group} ${r.url}`.toLowerCase().includes(s)))
}

export function groupByLayer(rows: KnowledgeRow[]): Record<Layer, Record<string, KnowledgeRow[]>> {
  const out = { internal: {}, team: {}, client: {} } as Record<Layer, Record<string, KnowledgeRow[]>>
  for (const r of rows) {
    const l = (LAYERS.includes(r.layer as Layer) ? r.layer : 'internal') as Layer
    ;(out[l][r.group] ??= []).push(r)
  }
  return out
}
