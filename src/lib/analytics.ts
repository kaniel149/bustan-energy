// ── GA4 ────────────────────────────────────────────────────
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined

/** Inject the GA4 gtag.js script dynamically */
function initGA4() {
  if (!GA4_ID) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA4_ID)
}

// ── Public API ─────────────────────────────────────────────

/** Call once at app startup (e.g. in main.tsx) */
export function initAnalytics() {
  // PostHog is initialized via snippet in index.html
  // GA4 is initialized dynamically here
  initGA4()
}

/** Identify a logged-in user (call after auth) */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
) {
  if (window.posthog?.identify) {
    window.posthog.identify(userId, properties)
  }
  if (GA4_ID && window.gtag) {
    window.gtag('set', { user_id: userId })
  }
}

/** Track a custom event */
export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
) {
  if (window.posthog?.capture) {
    window.posthog.capture(name, properties)
  }
  if (GA4_ID && window.gtag) {
    window.gtag('event', name, properties)
  }
}

/** Reset analytics state on logout */
export function resetAnalytics() {
  if (window.posthog?.reset) {
    window.posthog.reset()
  }
}
