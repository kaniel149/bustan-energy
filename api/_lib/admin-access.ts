const DEFAULT_ADMIN_EMAILS = 'k@kanielt.com,erez@energy-tm.com,kaniel@energy-tm.com'

function list(value: string | undefined, fallback = ''): string[] {
  return (value || fallback)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function isAllowedAdmin(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  const explicitEmails = list(process.env.ADMIN_EMAILS, DEFAULT_ADMIN_EMAILS)
  const allowedDomains = list(process.env.ADMIN_EMAIL_DOMAINS)
  return explicitEmails.includes(normalized) || allowedDomains.some((domain) => normalized.endsWith(domain))
}
