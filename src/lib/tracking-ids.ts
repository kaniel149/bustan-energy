// Public tracking identifiers for the production site (bustan-energy.com).
//
// These IDs are not secrets: every tag ships them in the page source of the
// site. Keeping them here makes the production build self-contained, so a
// deploy does not depend on dashboard env vars. Env vars still take priority
// (set VITE_* in Vercel or .env to override), and the defaults only apply when
// the page is served from the production host, so local dev and Vercel
// previews never report into the production properties.

export const PRODUCTION_HOST = /(^|\.)bustan-energy\.com$/i

export const PRODUCTION_TRACKING_IDS = {
  /** GA4 property "Bustan Energy" (KANIEL HQ account), web stream for https://bustan-energy.com */
  ga4MeasurementId: 'G-BSCLNWNXM3',
  /** Meta Pixel / dataset "Bustan Energy Pixel" (Tm energy business portfolio) */
  metaPixelId: '1621087386057868',
  /** Microsoft Clarity project "Bustan Energy" */
  clarityProjectId: 'xla28au1ss',
} as const

/** Env var wins; otherwise the production default, but only on the production host. */
export function resolveTrackingId(
  envValue: string | undefined,
  productionValue: string,
  hostname: string | undefined,
): string | undefined {
  const fromEnv = envValue?.trim()
  if (fromEnv) return fromEnv
  if (hostname && PRODUCTION_HOST.test(hostname)) return productionValue
  return undefined
}
