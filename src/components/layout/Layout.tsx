import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { StickyWhatsApp } from './StickyWhatsApp'
import { useLanguage } from '../../i18n/useLanguage'

/**
 * Layout wraps every marketing page with Navbar + main + Footer.
 * Scroll position resets to top on every route change.
 */
export default function Layout() {
  const { pathname } = useLocation()
  const { lang } = useLanguage()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bustan-paper)]">
      <a
        href="#main-content"
        className="fixed start-5 top-4 z-[100] -translate-y-24 rounded-sm bg-grove px-5 py-3 text-shell shadow-lift transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
      >
        {lang === 'he' ? 'דילוג לתוכן' : lang === 'th' ? 'ข้ามไปยังเนื้อหา' : 'Skip to content'}
      </a>
      <Navbar />

      {/* The fixed navigation is 80px tall at every viewport size. */}
      <main id="main-content" tabIndex={-1} className="flex-1 pt-20 outline-none">
        <Outlet />
      </main>

      <Footer />
      <StickyWhatsApp />
    </div>
  )
}
