import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { initAttribution } from './lib/attribution'
import { initSentry } from './lib/sentry'

initSentry()

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
