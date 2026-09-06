import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Globe2, Menu, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { useLanguage } from '../../i18n/useLanguage'
import { useTranslation } from '../../i18n/useTranslation'
import type { Lang } from '../../i18n/translations'

const labels = {
  en: { navigation: 'Main navigation', open: 'Open menu', close: 'Close menu', language: 'Choose language' },
  th: { navigation: 'เมนูหลัก', open: 'เปิดเมนู', close: 'ปิดเมนู', language: 'เลือกภาษา' },
  he: { navigation: 'ניווט ראשי', open: 'פתיחת תפריט', close: 'סגירת תפריט', language: 'בחירת שפה' },
}

const languages: { value: Lang; name: string }[] = [
  { value: 'en', name: 'English' },
  { value: 'th', name: 'ไทย' },
  { value: 'he', name: 'עברית' },
]

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bustan-paper)]'

export function Navbar() {
  const [openAtLocation, setOpenAtLocation] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { lang, langPath } = useLanguage()
  const { t } = useTranslation()
  const headerRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  // A route transition closes the disclosure immediately, including back/forward.
  const mobileOpen = openAtLocation === location.key
  if (openAtLocation !== null && openAtLocation !== location.key) {
    setOpenAtLocation(null)
  }
  const ui = labels[lang]

  const navLinks = [
    { label: t.nav.services, path: '/services' },
    { label: t.nav.howItWorks, path: '/how-it-works' },
    { label: t.nav.pricing, path: '/pricing' },
    { label: t.nav.projects, path: '/projects' },
    { label: t.nav.about, path: '/about' },
    { label: t.nav.blog, path: '/blog' },
    { label: t.nav.contact, path: '/contact' },
  ]

  useEffect(() => {
    if (!mobileOpen) return

    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    })
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpenAtLocation(null)
      toggleRef.current?.focus()
    }
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setOpenAtLocation(null)
      }
    }
    const desktop = window.matchMedia('(min-width: 1280px)')
    const closeOnDesktop = () => {
      if (desktop.matches) {
        const focusWasInMenu = headerRef.current?.contains(document.activeElement)
        setOpenAtLocation(null)
        if (focusWasInMenu) headerRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutside)
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOutside)
      desktop.removeEventListener('change', closeOnDesktop)
    }
  }, [mobileOpen])

  function switchLanguage(next: Lang) {
    const path = location.pathname.replace(/^\/(th|he)(?=\/|$)/, '') || '/'
    const translated = next === 'en' ? path : `/${next}${path === '/' ? '' : path}`
    const focusWasInMenu = menuRef.current?.contains(document.activeElement)
    setOpenAtLocation(null)
    navigate(`${translated}${location.search}${location.hash}`)
    if (focusWasInMenu) toggleRef.current?.focus()
  }

  function languagePicker(compact = false) {
    return (
      <label className={`relative flex shrink-0 items-center text-grove ${compact ? '' : 'w-full'}`}>
        <Globe2 size={15} aria-hidden="true" className="pointer-events-none absolute start-3" />
        <span className="sr-only">{ui.language}</span>
        <select
          value={lang}
          onChange={(event) => switchLanguage(event.target.value as Lang)}
          className={`h-11 appearance-none rounded-sm border border-grove/20 bg-transparent ps-9 pe-8 text-sm font-medium cursor-pointer transition-colors hover:bg-grove/5 ${focusRing} ${compact ? 'w-[108px]' : 'w-full'}`}
        >
          {languages.map((language) => (
            <option key={language.value} value={language.value} lang={language.value}>
              {compact ? language.value.toUpperCase() : `${language.value.toUpperCase()} — ${language.name}`}
            </option>
          ))}
        </select>
        <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute end-3" />
      </label>
    )
  }

  return (
    <header
      ref={headerRef}
      className="fixed top-0 inset-x-0 z-50 h-20 border-b border-grove/15 bg-[var(--bustan-paper)] text-grove"
      onBlur={(event) => {
        if (mobileOpen && !event.currentTarget.contains(event.relatedTarget)) setOpenAtLocation(null)
      }}
    >
      <div className="max-w-7xl mx-auto flex h-full items-center justify-between gap-5 px-5 sm:px-8">
        <Link to={langPath('/')} className={`shrink-0 rounded-sm ${focusRing}`}>
          <img
            src="/bustan/bustan-energy-logo.png"
            alt="Bustan Energy"
            className="h-12 w-[146px] object-contain object-left rtl:object-right"
            fetchPriority="high"
          />
        </Link>

        <nav aria-label={ui.navigation} className="hidden xl:flex items-center gap-0.5">
          {navLinks.map((link) => {
            const href = langPath(link.path)
            const active = location.pathname === href || location.pathname.startsWith(`${href}/`)
            return (
              <Link
                key={link.path}
                to={href}
                aria-current={active ? 'page' : undefined}
                className={`relative whitespace-nowrap px-2.5 py-3 text-[13px] font-medium transition-colors hover:text-grove ${focusRing} ${active ? 'text-grove after:absolute after:inset-x-2.5 after:bottom-1.5 after:h-0.5 after:bg-gold' : 'text-grove/75'}`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden xl:flex shrink-0 items-center gap-3">
          {languagePicker(true)}
          <Button variant="primary" size="sm" to={langPath('/contact')} className="min-h-11 whitespace-nowrap">
            {t.nav.getQuote}
          </Button>
        </div>

        <div className="flex xl:hidden items-center gap-3">
          <div className="hidden sm:block">
            <Button variant="primary" size="sm" to={langPath('/contact')} className="min-h-11">
              {t.nav.getQuote}
            </Button>
          </div>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpenAtLocation(mobileOpen ? null : location.key)}
            aria-label={mobileOpen ? ui.close : ui.open}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            className={`flex h-11 w-11 items-center justify-center rounded-sm border border-grove/25 text-grove transition-colors hover:bg-grove/5 ${focusRing}`}
          >
            {mobileOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <nav
        ref={menuRef}
        id="mobile-navigation"
        aria-label={ui.navigation}
        hidden={!mobileOpen}
        className="absolute top-full inset-x-0 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-b border-grove/20 bg-[var(--bustan-paper)] px-5 pb-6 pt-2 shadow-lift sm:px-8 xl:hidden"
      >
        <div className="mx-auto max-w-7xl">
          {navLinks.map((link, index) => {
            const href = langPath(link.path)
            const active = location.pathname === href || location.pathname.startsWith(`${href}/`)
            return (
              <Link
                key={link.path}
                to={href}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setOpenAtLocation(null)
                  document.getElementById('main-content')?.focus({ preventScroll: true })
                }}
                className={`flex min-h-12 items-center gap-4 border-b border-grove/10 py-3 text-base font-medium transition-colors hover:bg-grove/5 ${focusRing} ${active ? 'text-grove' : 'text-grove/75'}`}
              >
                <span aria-hidden="true" className="w-5 text-[10px] tabular-nums text-grove/45">{String(index + 1).padStart(2, '0')}</span>
                {link.label}
                {active && <span aria-hidden="true" className="ms-auto h-1.5 w-1.5 bg-gold" />}
              </Link>
            )
          })}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {languagePicker()}
            <Button
              variant="primary"
              size="md"
              to={langPath('/contact')}
              className="w-full"
              onClick={() => {
                setOpenAtLocation(null)
                document.getElementById('main-content')?.focus({ preventScroll: true })
              }}
            >
              {t.nav.getQuote}
            </Button>
          </div>
        </div>
      </nav>
    </header>
  )
}
