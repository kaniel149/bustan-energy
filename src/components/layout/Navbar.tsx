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

  // Detect scroll to toggle glassmorphism background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function handleSwitchLang() {
    setMobileOpen(false)
    navigate(switchLangPath())
  }

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={[
          'fixed top-0 inset-x-0 z-50',
          'transition-all duration-300',
          scrolled
            ? 'bg-dark/80 backdrop-blur-xl border-b border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'bg-transparent',
        ].join(' ')}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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
              <span className="font-serif text-xl text-gold leading-none">TM</span>
              <span className="font-sans text-sm font-medium text-white/80 tracking-wide leading-none">
                ENERGY
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const href = langPath(link.path)
              const active = location.pathname === href
              return (
                <Link
                  key={link.path}
                  to={href}
                  className={[
                    'px-3 py-1.5 rounded-lg text-sm font-medium',
                    'transition-colors duration-200',
                    active
                      ? 'text-gold'
                      : 'text-white/70 hover:text-white',
                  ].join(' ')}
                >
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
                'bg-white/8 border border-white/15',
                'text-white/60 hover:text-white hover:border-white/30 hover:bg-white/12',
                'transition-colors duration-200 cursor-pointer',
              ].join(' ')}
              aria-label={lang === 'en' ? 'Switch to Thai' : 'Switch to English'}
            >
              {lang === 'en' ? 'TH' : 'EN'}
            </button>

            <Button variant="primary" size="sm" href={langPath('/contact')}>
              {t.nav.getQuote}
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
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
            className={[
              'fixed top-16 inset-x-0 z-40',
              'bg-dark/95 backdrop-blur-xl',
              'border-b border-white/10',
              'shadow-[0_16px_48px_rgba(0,0,0,0.5)]',
            ].join(' ')}
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
                        'flex items-center px-4 py-3 rounded-xl text-base font-medium',
                        'transition-colors duration-200',
                        active
                          ? 'text-gold bg-gold/10'
                          : 'text-white/70 hover:text-white hover:bg-white/8',
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
                    'px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide',
                    'bg-white/8 border border-white/15',
                    'text-white/60 hover:text-white hover:border-white/30 hover:bg-white/12',
                    'transition-colors duration-200 cursor-pointer',
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
                  href={langPath('/contact')}
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
