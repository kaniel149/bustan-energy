// ── HTML escape helper ──────────────────────────────────────
// Prevents XSS when injecting user-supplied strings into HTML templates.
// Use on ALL user-controlled fields before render().

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
}

export function escapeHtml(s: string | number | null | undefined): string {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, (c) => ESC[c] ?? c)
}
