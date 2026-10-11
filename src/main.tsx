import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { initAttribution } from './lib/attribution'
import { initSentry } from './lib/sentry'

initSentry()

// After a deploy, a tab that still holds the previous index.html asks for
// hashed chunks that no longer exist ("Unable to preload CSS for /assets/…").
// Reload once so the browser picks up the new manifest instead of erroring.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'bustan:preload-reloaded'
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  event.preventDefault()
  window.location.reload()
})

// Initialize GA4 + Meta Pixel (no-ops if env vars are not set) once the page
// has loaded so the ~180 KB gtag bundle does not compete with the hero for
// bandwidth and main-thread time. PostHog is initialized via snippet in index.html.
function startAnalytics() {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => initAnalytics(), { timeout: 3000 })
  else setTimeout(() => initAnalytics(), 1)
}
if (document.readyState === 'complete') startAnalytics()
else window.addEventListener('load', startAnalytics, { once: true })

// Capture UTM params / click IDs / referrer (first-touch, localStorage)
initAttribution()

// Keep the HTML defaults for non-JS link scrapers. React 19 hoists route
// metadata but does not replace static tags, so hand ownership to SEOHead.
document.querySelectorAll('head [data-static-meta]').forEach((tag) => tag.remove())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
