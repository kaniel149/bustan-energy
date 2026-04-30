// ─── i18n/LanguageContext.tsx ─────────────────────────────────────────────────
// URL-based language detection: /th/* = Thai, everything else = English
// Provides langPath() and switchLangPath() helpers for navigation

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { Lang } from './translations'
import { LanguageContext } from './language-context'
import type { LanguageContextType } from './language-context'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  const value = useMemo<LanguageContextType>(() => {
    // Detect Thai: URL is exactly /th or starts with /th/
    const isThai = pathname === '/th' || pathname.startsWith('/th/')
    const lang: Lang = isThai ? 'th' : 'en'

    function langPath(path: string): string {
      const normalized = path.startsWith('/') ? path : `/${path}`
      if (lang === 'th') {
        return normalized === '/' ? '/th' : `/th${normalized}`
      }
      return normalized
    }

    function switchLangPath(): string {
      if (lang === 'en') {
        // English → Thai: prepend /th
        return pathname === '/' ? '/th' : `/th${pathname}`
      } else {
        // Thai → English: strip /th prefix
        const withoutPrefix = pathname.replace(/^\/th/, '') || '/'
        return withoutPrefix
      }
    }

    return { lang, langPath, switchLangPath }
  }, [pathname])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
