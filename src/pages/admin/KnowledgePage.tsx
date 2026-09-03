/**
 * /admin/knowledge — searchable index of every bustan-index doc, grouped by
 * layer (internal / team / client) and group. Static manifest, client filter.
 */
import { useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import manifest from '../../data/knowledge-manifest.json'
import { filterKnowledge, groupByLayer, LAYERS, LAYER_LABELS } from '../../lib/knowledge'
import type { KnowledgeRow, Layer } from '../../lib/knowledge'

const ROWS: KnowledgeRow[] = manifest

export default function KnowledgePage() {
  const [q, setQ] = useState('')
  const [layer, setLayer] = useState<Layer | 'all'>('all')

  const counts = useMemo(() => {
    const byText = filterKnowledge(ROWS, q, 'all')
    return { all: byText.length, ...Object.fromEntries(LAYERS.map((l) => [l, byText.filter((r) => r.layer === l).length])) } as Record<Layer | 'all', number>
  }, [q])
  const filtered = useMemo(() => filterKnowledge(ROWS, q, layer), [q, layer])
  const grouped = useMemo(() => groupByLayer(filtered), [filtered])

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-[1200px] mx-auto pb-24 sm:pb-6">
      <div>
        <h1 className="text-xl font-bold text-white">מאגר ידע</h1>
        <p className="text-sm text-white/40 mt-1">{ROWS.length} מסמכים מ-bustan-index, לפי שכבה וקבוצה</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="חיפוש לפי שם, קבוצה או כתובת…"
          className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#24463E]"
          aria-label="חיפוש במאגר הידע"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="שכבות">
        {(['all', ...LAYERS] as const).map((l) => (
          <button
            key={l}
            role="tab"
            aria-selected={layer === l}
            onClick={() => setLayer(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              layer === l
                ? 'bg-[#24463E] text-[#FFF4E2] border-[#24463E]'
                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
            }`}
          >
            {l === 'all' ? 'הכל' : LAYER_LABELS[l].split(' — ')[0]} <span className="opacity-70">({counts[l]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-12">אין תוצאות</p>
      ) : (
        LAYERS.map((l) => {
          const groups = grouped[l]
          const names = Object.keys(groups)
          if (names.length === 0) return null
          return (
            <section key={l} className="space-y-3" aria-label={LAYER_LABELS[l]}>
              <h2 className="text-sm font-semibold text-white border-b border-white/10 pb-2">{LAYER_LABELS[l]}</h2>
              {names.map((g) => (
                <div key={g}>
                  <h3 className="text-[11px] uppercase tracking-[0.15em] text-white/40 mb-2">{g}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {groups[g].map((r) => (
                      <a
                        key={r.url}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate" dir={r.lang === 'he' ? 'rtl' : 'ltr'} title={r.title}>{r.title}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50 uppercase">{r.lang}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#24463E]/10 text-[#24463E]">{r.group}</span>
                          </div>
                        </div>
                        <ExternalLink size={14} className="text-white/40 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )
        })
      )}
    </div>
  )
}
