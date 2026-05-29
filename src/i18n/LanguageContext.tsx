// ─── i18n/LanguageContext.tsx ─────────────────────────────────────────────────
// URL-based language detection: /th/* = Thai, /he/* = Hebrew, else English.
// Provides langPath() (prefix a path for the current lang) and switchLangPath()
// (cycle en → th → he → en). Sets <html lang/dir> for RTL (Hebrew).

import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { isRTL, type Lang } from './translations'
import { LanguageContext } from './language-context'
import type { LanguageContextType } from './language-context'

const LANG_ORDER: Lang[] = ['en', 'th', 'he']

// Strip any leading /th or /he segment, returning the bare path.
function stripPrefix(pathname: string): string {
  return pathname.replace(/^\/(th|he)(?=\/|$)/, '') || '/'
}

// Prefix a bare path for a language ('en' = no prefix).
function withPrefix(lang: Lang, path: string): string {
  const base = path === '/' ? '' : path
  return lang === 'en' ? base || '/' : `/${lang}${base}`
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  const value = useMemo<LanguageContextType>(() => {
    const lang: Lang =
      pathname === '/th' || pathname.startsWith('/th/')
        ? 'th'
        : pathname === '/he' || pathname.startsWith('/he/')
          ? 'he'
          : 'en'

    function langPath(path: string): string {
      const normalized = path.startsWith('/') ? path : `/${path}`
      return withPrefix(lang, normalized)
    }

    function switchLangPath(): string {
      const next = LANG_ORDER[(LANG_ORDER.indexOf(lang) + 1) % LANG_ORDER.length]
      return withPrefix(next, stripPrefix(pathname))
    }

    return { lang, langPath, switchLangPath }
  }, [pathname])

  // Reflect language + direction on <html> (RTL for Hebrew).
  useEffect(() => {
    document.documentElement.lang = value.lang
    document.documentElement.dir = isRTL(value.lang) ? 'rtl' : 'ltr'
  }, [value.lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
