import type { Lang } from './translations'

/**
 * Bare paths that have a prerendered Thai page. Blog posts are English-only
 * (see BlogPostPage `englishOnly`) and are intentionally absent.
 * Keep this aligned with the /th rewrites in vercel.json.
 */
const THAI_PATHS = new Set([
  '/',
  '/services',
  '/services/residential',
  '/services/commercial',
  '/services/off-grid',
  '/services/maintenance',
  '/how-it-works',
  '/pricing',
  '/projects',
  '/about',
  '/blog',
  '/contact',
  '/factory-electricity-bill-solar-assessment',
  '/resort-solar-assessment',
  '/solar-ppa-thailand',
  '/solar-epc-thailand',
  '/ppa-vs-epc-thailand',
  '/factories-commercial-solar-thailand',
  '/solar-battery-storage-thailand',
  '/villa-home-solar-thailand',
  '/solar-rooftop-ko-phangan',
  '/solar-installation-ko-samui',
  '/solar-rooftop-rayong',
  '/solar-rooftop-chonburi',
])

function splitPath(path: string): { pathname: string; suffix: string } {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const cut = normalized.search(/[?#]/)
  const end = cut === -1 ? normalized.length : cut
  const pathname = normalized.slice(0, end).replace(/\/$/, '') || '/'
  return { pathname, suffix: normalized.slice(end) }
}

/** English blog articles have no /th or /he page. */
export function isEnglishOnlyArticle(pathname: string): boolean {
  return /^\/blog\/[^/]+$/.test(pathname)
}

/**
 * Public URL for a marketing path in `lang`.
 * Hebrew content exists only at /he. Untranslated targets stay on the English route
 * so the site does not link to soft-404 language copies.
 */
export function localizedPublicPath(lang: Lang, path: string): string {
  const { pathname, suffix } = splitPath(path)
  if (lang === 'en' || isEnglishOnlyArticle(pathname)) return `${pathname}${suffix}`
  if (lang === 'he') return pathname === '/' ? `/he${suffix}` : `${pathname}${suffix}`
  if (THAI_PATHS.has(pathname)) return pathname === '/' ? `/th${suffix}` : `/th${pathname}${suffix}`
  return '/th'
}

/** Language-switch target. Never points at a route this site does not publish. */
export function languageSwitchPath(next: Lang, currentPathname: string): string {
  const bare = currentPathname.replace(/^\/(th|he)(?=\/|$)/, '') || '/'
  if (next === 'he') return '/he'
  if (next === 'en') return bare
  if (isEnglishOnlyArticle(bare)) return '/th/blog'
  return localizedPublicPath('th', bare)
}
