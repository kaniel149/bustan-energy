import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { initAttribution } from './lib/attribution'

// Initialize PostHog + GA4 + Meta Pixel (no-ops if env vars are not set)
initAnalytics()

// Capture UTM params / click IDs / referrer (first-touch, localStorage)
initAttribution()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
