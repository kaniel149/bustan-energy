import { useLanguage } from './useLanguage'
import { translations } from './translations'

export function useTranslation() {
  const { lang } = useLanguage()
  return { t: translations[lang], lang }
}
