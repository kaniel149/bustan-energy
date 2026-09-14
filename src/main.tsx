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

// Initialize PostHog + GA4 + Meta Pixel (no-ops if env vars are not set)
initAnalytics()

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
