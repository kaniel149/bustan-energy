// ── Safe number formatter ───────────────────────────────────
// Prevents NaN from leaking into emails / HTML when a numeric
// field is missing or undefined.

export function fmt(n: number | string | null | undefined): string {
  if (n == null) return '—'
  const parsed = Number(n)
  if (isNaN(parsed)) return '—'
  return parsed.toLocaleString('en-US')
}
