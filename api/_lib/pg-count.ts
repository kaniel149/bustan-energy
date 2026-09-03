/** PostgREST `Content-Range: 0-0/42821` → 42821. `*` totals (no exact count) → null. */
export function parseContentRange(header: string | null): number | null {
  if (!header) return null
  const total = header.split('/')[1]
  if (!total || total === '*') return null
  const n = Number(total)
  return Number.isFinite(n) ? n : null
}
