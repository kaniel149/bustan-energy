import { useLocation } from 'react-router-dom'
import { useLanguage } from '../../i18n/useLanguage'

/** Single source of truth for the Bustan WhatsApp line. */
const WHATSAPP_NUMBER = '66946692011'

type Segment = 'factory' | 'villa' | 'default'

/** Decide the audience segment from the current route. */
function segmentFor(pathname: string): Segment {
  const p = pathname.toLowerCase()
  if (/(factory|factories|commercial|industrial|resort|ppa|epc|bill)/.test(p)) return 'factory'
  if (/(villa|home|residential|house|battery)/.test(p)) return 'villa'
  return 'default'
}

const LABELS: Record<Segment, Record<'en' | 'th' | 'he', string>> = {
  factory: {
    en: 'Factory solar? Chat now',
    th: 'โซลาร์โรงงาน? แชทเลย',
    he: 'סולארי למפעל? דברו איתנו',
  },
  villa: {
    en: 'Solar for your home? Chat',
    th: 'โซลาร์บ้าน/วิลล่า? แชท',
    he: 'סולארי לבית? דברו איתנו',
  },
  default: {
    en: 'Chat on WhatsApp',
    th: 'แชทผ่าน WhatsApp',
    he: 'דברו איתנו ב-WhatsApp',
  },
}

const PREFILL: Record<Segment, string> = {
  factory:
    "Hi Bustan Energy, I'd like to talk about solar (PPA / EPC) for my factory or commercial site.",
  villa:
    "Hi Bustan Energy, I'd like to talk about solar and battery backup for my home / villa.",
  default: "Hi Bustan Energy, I'd like to learn about my solar options.",
}

/**
 * Floating, segment-aware WhatsApp CTA.
 * The prefilled message + label adapt to the page the visitor is on
 * (factory/C&I vs. villa/home vs. generic). Hidden on admin/crm/platform.
 */
export function StickyWhatsApp() {
  const { pathname } = useLocation()
  const { lang } = useLanguage()

  // Never show on internal app surfaces.
  if (/^\/(admin|crm|platform|preview-scroll)/.test(pathname)) return null

  const segment = segmentFor(pathname)
  const label = LABELS[segment][lang] ?? LABELS[segment].en
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILL[segment])}`

  const onClick = () => {
    try {
      // Fire-and-forget analytics if PostHog is present.
      ;(window as unknown as { posthog?: { capture?: (e: string, p?: unknown) => void } }).posthog?.capture?.(
        'whatsapp_click',
        { segment, path: pathname },
      )
    } catch {
      /* no-op */
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={label}
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-0 rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] transition-all duration-300 hover:shadow-[0_14px_38px_rgba(37,211,102,0.6)] sm:bottom-6 sm:right-6"
    >
      {/* Icon — always visible, 56px tap target */}
      <span className="grid h-14 w-14 place-items-center">
        <span className="absolute inline-flex h-14 w-14 animate-ping rounded-full bg-[#25D366]/40 [animation-duration:2.5s]" aria-hidden />
        <svg viewBox="0 0 32 32" className="relative h-7 w-7 fill-current" aria-hidden>
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.13 6.744 3.05 9.38L1.05 31.3l6.116-1.954A15.9 15.9 0 0 0 16.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0Zm9.31 22.59c-.386 1.09-1.92 1.994-3.142 2.258-.836.178-1.928.32-5.604-1.204-4.7-1.948-7.726-6.724-7.962-7.034-.226-.31-1.9-2.53-1.9-4.826 0-2.296 1.166-3.426 1.636-3.906.386-.394.846-.574 1.36-.574.165 0 .314.008.448.015.39.017.586.04.844.656.32.77 1.1 2.69 1.193 2.884.094.194.157.42.03.73-.12.31-.226.453-.45.72-.226.266-.43.47-.656.756-.21.25-.446.52-.187.97.26.44 1.156 1.906 2.48 3.086 1.71 1.523 3.114 1.996 3.62 2.21.376.157.823.12 1.097-.18.347-.386.776-1.026 1.21-1.656.31-.45.7-.504 1.11-.35.42.146 2.65 1.25 3.106 1.476.456.226.756.336.87.524.115.187.115 1.09-.27 2.18Z" />
        </svg>
      </span>
      {/* Label — expands on hover (desktop); compact pill on touch */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap pr-0 text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[220px] group-hover:pr-5 group-hover:opacity-100">
        {label}
      </span>
    </a>
  )
}

export default StickyWhatsApp
