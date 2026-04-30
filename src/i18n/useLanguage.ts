import { useContext } from 'react'
import { LanguageContext } from './language-context'
import type { LanguageContextType } from './language-context'

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext)
}
