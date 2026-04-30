import { createContext } from 'react'
import type { Lang } from './translations'

export interface LanguageContextType {
  lang: Lang
  /** Prefix path with language segment.
   *  en: /services  ->  /services
   *  th: /services  ->  /th/services
   */
  langPath: (path: string) => string
  /** Returns the current page URL in the alternate language. */
  switchLangPath: () => string
}

export const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  langPath: (p) => p,
  switchLangPath: () => '/',
})
