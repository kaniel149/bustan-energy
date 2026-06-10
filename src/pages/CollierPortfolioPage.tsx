/**
 * CollierPortfolioPage.tsx
 *
 * Sales-demo read-only page: "Colliers Thailand Solar Portfolio"
 * Route: /colliers (public — no auth gate, suitable for in-meeting demo)
 *
 * Data flow handled by useColliersPortfolio hook:
 *   fetch('/data/colliers-listings.md') → parseColliersMarkdown → summarizeColliers
 *
 * Styling: dark glassmorphism (#0A1628 background), matching PlatformPage /
 *          FilterBar aesthetic. Tier colors mirror the map legend.
 */

import { Helmet } from 'react-helmet-async'
import { ColliersPortfolio } from '../components/Colliers/ColliersPortfolio'

// ---------------------------------------------------------------------------
// Main page — wraps ColliersPortfolio in the standalone /colliers page chrome.
// The component is self-contained (data + state), so the page only provides
// the sticky header chrome + SEO helmet.
// ---------------------------------------------------------------------------

export default function CollierPortfolioPage() {
  return (
    <>
      <Helmet>
        <title>Colliers Thailand — Solar Portfolio Demo | Bustan Energy</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-[#0A1628] text-white">
        {/* HEADER */}
        <header className="sticky top-0 z-20 bg-[#0A1628]/95 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8A820] to-[#E85D3A] flex items-center justify-center text-sm font-bold shrink-0">
                ☀
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white leading-tight">
                  Colliers Thailand — Solar Portfolio
                </h1>
                <p className="text-[10px] text-white/40">Demo · Bustan Energy</p>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-[10px] text-white/30">
              <span>*Solar estimates are preliminary — demo only</span>
            </div>
          </div>
        </header>

        {/* Body — ColliersPortfolio is self-contained (data + loading/error states) */}
        <main className="max-w-[1400px] mx-auto">
          <ColliersPortfolio />
        </main>
      </div>
    </>
  )
}
