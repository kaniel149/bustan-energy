import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { useLanguage } from '../../i18n/useLanguage'
import { useTranslation } from '../../i18n/useTranslation'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { lang, langPath, switchLangPath } = useLanguage()
  const { t } = useTranslation()

  const NAV_LINKS = [
    { label: t.nav.services, path: '/services' },
    { label: t.nav.howItWorks, path: '/how-it-works' },
    { label: t.nav.pricing, path: '/pricing' },
    { label: t.nav.projects, path: '/projects' },
    { label: t.nav.about, path: '/about' },
    { label: t.nav.blog, path: '/blog' },
    { label: t.nav.contact, path: '/contact' },
  ]

  // Detect scroll to toggle the warmer Bustan navigation surface.
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Solid surface when scrolled or when the mobile panel is open.
  const solid = scrolled || mobileOpen
  // Home is the only page with a dark photo hero behind the transparent navbar —
  // there the links stay shell (light) over a subtle grove scrim. Every other
  // page is tropical-light, so the transparent state uses ink links directly.
  const isHome = location.pathname === langPath('/')
  const overHero = isHome && !solid

  function handleSwitchLang() {
    setMobileOpen(false)
    navigate(switchLangPath())
  }

  const desktopLink = (active: boolean) =>
    [
      'relative px-3 py-1.5 text-sm font-medium',
      'transition-colors duration-[var(--duration-fast)] ease-out-soft',
      active
        ? [
            overHero ? 'text-shell' : 'text-ink',
            // Gold (--bustan-sun) underline marker for the current route.
            'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gold',
          ].join(' ')
        : overHero
          ? 'text-shell/78 hover:text-shell'
          : 'text-ink/74 hover:text-ink',
    ].join(' ')

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={[
          'fixed top-0 inset-x-0 z-50',
          'transition-all duration-[var(--duration-base)] ease-out-soft',
          solid
            ? 'bg-shell/85 backdrop-blur-md border-b border-grove/10 shadow-soft'
            : // Not scrolled: truly transparent — the Layout wrapper behind
              // pt-16 is paper, so light pages need no painted workaround.
              'bg-transparent border-b border-transparent',
        ].join(' ')}
      >
        {/* Hero scrim — only visible over the Home hero photo so the shell
            links keep contrast against bright patches of sky. */}
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-x-0 top-0 h-28',
            'bg-gradient-to-b from-grove/30 to-transparent',
            'transition-opacity duration-[var(--duration-base)] ease-out-soft',
            overHero ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />

        <div className="relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to={langPath('/')} className="flex items-center gap-2.5 group">
            <img
              src="/assets/logo/bustan-energy.svg"
              alt="Bustan Energy"
              className="h-8 w-auto"
              onError={(e) => {
                // Fallback to text logo if image missing
                const target = e.currentTarget as HTMLImageElement
                target.style.display = 'none'
                const sibling = target.nextElementSibling as HTMLElement | null
                if (sibling) sibling.style.display = 'flex'
              }}
            />
            {/* Text fallback (hidden by default, shown if image fails) */}
            <span
              className="hidden items-center gap-1"
              aria-hidden="true"
              style={{ display: 'none' }}
            >
              <span
                className={[
                  'font-serif text-xl leading-none',
                  overHero ? 'text-[var(--bustan-sun)]' : 'text-[var(--bustan-grove)]',
                ].join(' ')}
              >
                Bustan
              </span>
              <span
                className={[
                  'font-sans text-sm font-medium tracking-wide leading-none',
                  overHero ? 'text-[var(--bustan-shell)]' : 'text-ink/74',
                ].join(' ')}
              >
                Energy
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const href = langPath(link.path)
              const active = location.pathname === href
              return (
                <Link key={link.path} to={href} className={desktopLink(active)}>
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language switcher */}
            <button
              onClick={handleSwitchLang}
              className={[
                'px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide',
                overHero
                  ? 'bg-shell/10 border border-shell/20 text-shell/75 hover:text-shell hover:bg-shell/15'
                  : 'bg-grove/5 border border-grove/15 text-ink/70 hover:text-ink hover:bg-grove/10',
                'transition-colors duration-[var(--duration-fast)] ease-out-soft cursor-pointer',
              ].join(' ')}
              aria-label={lang === 'en' ? 'Switch to Thai' : 'Switch to English'}
            >
              {lang === 'en' ? 'TH' : 'EN'}
            </button>

            <Button variant="primary" size="sm" to={langPath('/contact')}>
              {t.nav.getQuote}
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className={[
              'md:hidden flex h-11 w-11 items-center justify-center rounded-lg',
              'transition-colors duration-[var(--duration-fast)] ease-out-soft',
              overHero
                ? 'text-shell/80 hover:text-shell hover:bg-shell/10'
                : 'text-ink/74 hover:text-ink hover:bg-grove/5',
            ].join(' ')}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-16 inset-x-0 z-40 bg-shell/95 backdrop-blur-md border-b border-grove/14 shadow-lift"
          >
            <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => {
                const href = langPath(link.path)
                const active = location.pathname === href
                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <Link
                      to={href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        'flex min-h-11 items-center px-4 py-3 rounded-xl text-base font-medium',
                        'transition-colors duration-[var(--duration-fast)] ease-out-soft',
                        active
                          ? 'text-ink bg-mist/60'
                          : 'text-ink/74 hover:text-ink hover:bg-mist/45',
                      ].join(' ')}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                )
              })}

              {/* Language switcher row */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: NAV_LINKS.length * 0.04, duration: 0.3 }}
                className="px-4 pt-1"
              >
                <button
                  onClick={handleSwitchLang}
                  className={[
                    'inline-flex min-h-11 items-center px-4 rounded-full text-xs font-semibold tracking-wide',
                    'bg-grove/5 border border-grove/15',
                    'text-ink/70 hover:text-ink hover:bg-grove/10',
                    'transition-colors duration-[var(--duration-fast)] ease-out-soft cursor-pointer',
                  ].join(' ')}
                  aria-label={lang === 'en' ? 'Switch to Thai' : 'Switch to English'}
                >
                  {lang === 'en' ? 'TH' : 'EN'}
                </button>
              </motion.div>

              <div className="pt-2 pb-1">
                <Button
                  variant="primary"
                  size="md"
                  to={langPath('/contact')}
                  className="w-full"
                  onClick={() => setMobileOpen(false)}
                >
                  {t.nav.getQuote}
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
