// Old @energy-tm.com addresses kept until Stage 4 of the Bustan rebrand
const DEFAULT_ADMIN_EMAILS = 'k@kanielt.com,erez@bustan-energy.com,kaniel@bustan-energy.com,erez@energy-tm.com,kaniel@energy-tm.com'

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
  // Match on the domain part only. A bare endsWith() would accept
  // attacker@notbustan-energy.com for the allowed domain "bustan-energy.com".
  const at = normalized.lastIndexOf('@')
  if (at < 1 || at === normalized.length - 1) return false
  const domainPart = normalized.slice(at + 1)

  return explicitEmails.includes(normalized) ||
    allowedDomains.some((domain) => domainPart === domain.replace(/^@/, ''))
}
