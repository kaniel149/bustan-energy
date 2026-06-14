import { useCallback, useEffect, useState } from 'react'
import {
  fetchOutreachMessages,
  outreachAction,
  type OutreachMessage,
} from '../../lib/admin-service'

const TABS = [
  { key: 'draft', label: 'ממתינות לאישור' },
  { key: 'approved', label: 'מאושרות' },
  { key: 'sent', label: 'נשלחו' },
  { key: 'replied', label: 'הגיבו' },
  { key: 'bounced', label: 'נכשלו' },
] as const

export default function OutreachPage() {
  const [tab, setTab] = useState<string>('draft')
  const [rows, setRows] = useState<OutreachMessage[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<OutreachMessage | null>(null)
  const [editBody, setEditBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setRows(await fetchOutreachMessages(tab))
    setSelected(new Set())
    setLoading(false)
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (
    action: 'approve' | 'skip' | 'edit' | 'bulk_approve',
    payload: Parameters<typeof outreachAction>[1],
  ) => {
    setBusy(true)
    setError(null)
    const ok = await outreachAction(action, payload)
    if (!ok) setError('הפעולה נכשלה — נסה שוב')
    await load()
    setBusy(false)
  }

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <div dir="rtl" className="p-3 sm:p-6 max-w-[1200px] mx-auto pb-24 sm:pb-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">פניות יזומות</h1>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all min-h-[36px] ${
              tab === t.key
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bulk approve bar */}
      {tab === 'draft' && selected.size > 0 && (
        <button
          onClick={() => act('bulk_approve', { ids: [...selected] })}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
        >
          ✅ אשר {selected.size} הודעות
        </button>
      )}

      {/* Error banner */}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white/40 text-sm">טוען…</span>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
          <p className="text-white/40 text-sm">אין הודעות בסטטוס זה.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
            >
              {/* Meta row */}
              <div className="flex items-center gap-3 text-sm flex-wrap">
                {tab === 'draft' && (
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggle(m.id)}
                    className="accent-emerald-500"
                  />
                )}
                <span className="font-semibold text-white">{m.facts.companyName ?? '—'}</span>
                <span className="text-white/50">{m.facts.district ?? ''}</span>
                <span className="text-white/50">{m.facts.roofSqm ?? '?'} מ״ר</span>
                <span className="text-emerald-400">
                  ฿{(m.facts.monthlySavingThb ?? 0).toLocaleString()}/חודש
                </span>
                <span className="text-white/40">
                  {m.channel} · {m.language}
                </span>
                <span className="text-white/40" dir="ltr">
                  {m.recipient}
                </span>
              </div>

              {/* Subject */}
              {m.subject && (
                <div className="text-sm font-medium text-white/80" dir="auto">
                  {m.subject}
                </div>
              )}

              {/* Body */}
              <pre className="text-sm whitespace-pre-wrap font-sans text-white/80" dir="auto">
                {m.body}
              </pre>

              {/* Actions (draft only) */}
              {tab === 'draft' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => act('approve', { id: m.id })}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    ✅ אשר
                  </button>
                  <button
                    onClick={() => {
                      setEditing(m)
                      setEditBody(m.body)
                    }}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors disabled:opacity-50"
                  >
                    ✏️ ערוך
                  </button>
                  <button
                    onClick={() => act('skip', { id: m.id })}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors disabled:opacity-50"
                  >
                    ⏭️ דלג
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-xl space-y-3 border border-white/10">
            <h2 className="font-semibold text-white">
              עריכת הודעה — {editing.facts.companyName}
            </h2>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              dir="auto"
              rows={10}
              className="w-full rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-y"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={async () => {
                  if (!editBody.trim()) return
                  await act('edit', { id: editing.id, body: editBody })
                  setEditing(null)
                }}
                disabled={busy || !editBody.trim()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
