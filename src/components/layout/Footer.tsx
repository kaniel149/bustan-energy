import { Link } from 'react-router-dom'
import { MessageCircle, Mail, MapPin, Phone } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage'
import { useTranslation } from '../../i18n/useTranslation'

export function Footer() {
  const { langPath, lang } = useLanguage()
  const { t } = useTranslation()

  const QUICK_LINKS = [
    { label: t.nav.services, path: '/services' },
    { label: t.nav.howItWorks, path: '/how-it-works' },
    { label: t.nav.pricing, path: '/pricing' },
    { label: t.nav.projects, path: '/projects' },
    { label: t.nav.about, path: '/about' },
    { label: t.nav.blog, path: '/blog' },
    { label: t.nav.contact, path: '/contact' },
    { label: lang === 'th' ? 'เครื่องมือโซลาร์' : 'Solar Tools', path: '/tools' },
  ]

  const SERVICES = [
    { label: t.footer.residential, path: '/services#residential' },
    { label: t.footer.commercial, path: '/services#commercial' },
    { label: t.footer.solarFarms, path: '/services#farm' },
    { label: t.footer.batteryStorage, path: '/services#battery' },
    { label: t.footer.maintenance, path: '/services#maintenance' },
  ]

  return (
    <footer className="bg-[var(--bustan-grove)] border-t border-[rgba(255,244,226,0.14)]">
      {/* Main columns */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Col 1: Brand */}
          <div className="flex flex-col gap-5">
            {/* Logo */}
            <Link to={langPath('/')} className="inline-flex items-center gap-2 group w-fit">
              <img
                src="/assets/logo/bustan-energy.svg"
                alt="Bustan Energy"
                className="h-8 w-auto"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.style.display = 'none'
                  const sibling = target.nextElementSibling as HTMLElement | null
                  if (sibling) sibling.style.display = 'flex'
                }}
              />
              <span
                className="hidden items-center gap-1"
                style={{ display: 'none' }}
              >
                <span className="font-serif text-xl text-[var(--bustan-sun)]">
                  Bustan
                </span>
                <span className="font-sans text-sm font-medium text-[rgba(255,244,226,0.82)] tracking-wide">
                  Energy
                </span>
              </span>
            </Link>

            <p className="text-[rgba(255,244,226,0.66)] text-sm leading-relaxed max-w-[240px]">
              {t.footer.tagline}
            </p>

            {/* Social / contact quick icons */}
            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://wa.me/66946692011"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[rgba(255,244,226,0.09)] border border-[rgba(255,244,226,0.12)] flex items-center justify-center text-[rgba(255,244,226,0.62)] hover:text-[var(--bustan-shell)] hover:border-[rgba(255,244,226,0.28)] hover:bg-[rgba(255,244,226,0.14)] transition-colors"
                aria-label="WhatsApp"
              >
                <Phone size={15} />
              </a>
              <a
                href="https://line.me/R/ti/p/@bustanenergy"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[rgba(255,244,226,0.09)] border border-[rgba(255,244,226,0.12)] flex items-center justify-center text-[rgba(255,244,226,0.62)] hover:text-[var(--bustan-shell)] hover:border-[rgba(255,244,226,0.28)] hover:bg-[rgba(255,244,226,0.14)] transition-colors"
                aria-label="LINE"
              >
                <MessageCircle size={15} />
              </a>
              <Link
                to={langPath('/contact')}
                className="w-9 h-9 rounded-xl bg-[rgba(255,244,226,0.09)] border border-[rgba(255,244,226,0.12)] flex items-center justify-center text-[rgba(255,244,226,0.62)] hover:text-[var(--bustan-shell)] hover:border-[rgba(255,244,226,0.28)] hover:bg-[rgba(255,244,226,0.14)] transition-colors"
                aria-label="Contact Bustan Energy"
              >
                <Mail size={15} />
              </Link>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[rgba(255,244,226,0.42)]">
              {t.footer.quickLinks}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={langPath(link.path)}
                    className="text-sm text-[rgba(255,244,226,0.66)] hover:text-[var(--bustan-shell)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Services */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[rgba(255,244,226,0.42)]">
              {t.footer.servicesTitle}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {SERVICES.map((svc) => (
                <li key={svc.path}>
                  <Link
                    to={langPath(svc.path)}
                    className="text-sm text-[rgba(255,244,226,0.66)] hover:text-[var(--bustan-shell)] transition-colors"
                  >
                    {svc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[rgba(255,244,226,0.42)]">
              {t.footer.contactTitle}
            </h4>
            <ul className="flex flex-col gap-4">
              <li>
                <a
                  href="https://wa.me/66946692011"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm text-[rgba(255,244,226,0.66)] hover:text-[var(--bustan-shell)] transition-colors group"
                >
                  <Phone size={15} className="mt-0.5 shrink-0 text-[rgba(242,184,75,0.72)] group-hover:text-[var(--bustan-sun)] transition-colors" />
                  <span>WhatsApp: +66 94 669 2011</span>
                </a>
              </li>
              <li>
                <a
                  href="https://line.me/R/ti/p/@bustanenergy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm text-[rgba(255,244,226,0.66)] hover:text-[var(--bustan-shell)] transition-colors group"
                >
                  <MessageCircle size={15} className="mt-0.5 shrink-0 text-[rgba(242,184,75,0.72)] group-hover:text-[var(--bustan-sun)] transition-colors" />
                  <span>LINE: @bustanenergy</span>
                </a>
              </li>
              <li>
                <Link
                  to={langPath('/contact')}
                  className="flex items-start gap-3 text-sm text-[rgba(255,244,226,0.66)] hover:text-[var(--bustan-shell)] transition-colors group"
                >
                  <Mail size={15} className="mt-0.5 shrink-0 text-[rgba(242,184,75,0.72)] group-hover:text-[var(--bustan-sun)] transition-colors" />
                  <span>Contact Bustan Energy</span>
                </Link>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-[rgba(255,244,226,0.66)]">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-[rgba(242,184,75,0.72)]" />
                  <span>
                    Ko Phangan<br />
                    Surat Thani, Thailand
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[rgba(255,244,226,0.12)]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[rgba(255,244,226,0.42)] text-xs">
            {t.footer.copyright}
          </p>
          <div className="flex items-center gap-5">
            <Link to={langPath('/privacy')} className="text-[rgba(255,244,226,0.42)] text-xs hover:text-[rgba(255,244,226,0.74)] transition-colors">
              Privacy Policy
            </Link>
            <Link to={langPath('/terms')} className="text-[rgba(255,244,226,0.42)] text-xs hover:text-[rgba(255,244,226,0.74)] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
