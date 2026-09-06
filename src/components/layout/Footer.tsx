import { Link } from 'react-router-dom'
import { MessageCircle, Mail, MapPin, Phone } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage'
import { useTranslation } from '../../i18n/useTranslation'

// Shared link treatment — quiet ink that warms to ocean on hover.
const footerLink =
  'inline-block py-1 text-sm text-grove/75 hover:text-ocean transition-colors duration-[var(--duration-fast)] ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2'

const iconBox =
  'flex h-11 w-11 items-center justify-center rounded-sm bg-transparent border border-grove/20 text-grove/75 hover:text-ocean hover:border-ocean/30 hover:bg-mist/60 transition-colors duration-[var(--duration-fast)] ease-out-soft'

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
    { label: lang === 'th' ? 'เครื่องมือโซลาร์' : lang === 'he' ? 'כלים סולאריים' : 'Solar Tools', path: '/tools' },
  ]

  const SERVICES = [
    { label: t.footer.residential, path: '/services#residential' },
    { label: t.footer.commercial, path: '/services#commercial' },
    { label: t.footer.solarFarms, path: '/services#farm' },
    { label: t.footer.batteryStorage, path: '/services#battery' },
    { label: t.footer.maintenance, path: '/services#maintenance' },
  ]

  return (
    <footer className="bg-[var(--bustan-paper)] border-t border-grove/20">
      {/* Main columns */}
      <div className="max-w-7xl mx-auto px-5 py-16 sm:px-8 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.1fr] gap-10 lg:gap-8">

          {/* Col 1: Brand */}
          <div className="flex flex-col gap-5">
            {/* Logo */}
            <Link to={langPath('/')} className="inline-flex w-fit rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-4">
              <img
                src="/bustan/bustan-energy-logo.png"
                alt="Bustan Energy"
                className="h-14 w-[172px] object-contain object-left rtl:object-right"
                loading="lazy"
              />
            </Link>

            {/* Serif brand line */}
            <p className="font-serif text-xl text-ink/80 leading-snug max-w-[260px]">
              {t.footer.tagline}
            </p>

            {/* Social / contact quick icons */}
            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://wa.me/66946692011"
                target="_blank"
                rel="noopener noreferrer"
                className={iconBox}
                aria-label="WhatsApp"
              >
                <Phone size={15} />
              </a>
              <a
                href="https://line.me/R/ti/p/@bustanenergy"
                target="_blank"
                rel="noopener noreferrer"
                className={iconBox}
                aria-label="LINE"
              >
                <MessageCircle size={15} />
              </a>
              <Link
                to={langPath('/contact')}
                className={iconBox}
                aria-label="Contact Bustan Energy"
              >
                <Mail size={15} />
              </Link>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-grove/75">
              {t.footer.quickLinks}
            </p>
            <ul className="flex flex-col gap-1.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.path}>
                  <Link to={langPath(link.path)} className={footerLink}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Services */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-grove/75">
              {t.footer.servicesTitle}
            </p>
            <ul className="flex flex-col gap-1.5">
              {SERVICES.map((svc) => (
                <li key={svc.path}>
                  <Link to={langPath(svc.path)} className={footerLink}>
                    {svc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-grove/75">
              {t.footer.contactTitle}
            </p>
            <ul className="flex flex-col gap-4">
              <li>
                <a
                  href="https://wa.me/66946692011"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-start gap-3 ${footerLink}`}
                >
                  <Phone size={15} className="mt-0.5 shrink-0 text-ocean/60 group-hover:text-ocean transition-colors duration-[var(--duration-fast)]" />
                  <span>WhatsApp: +66 94 669 2011</span>
                </a>
              </li>
              <li>
                <a
                  href="https://line.me/R/ti/p/@bustanenergy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-start gap-3 ${footerLink}`}
                >
                  <MessageCircle size={15} className="mt-0.5 shrink-0 text-ocean/60 group-hover:text-ocean transition-colors duration-[var(--duration-fast)]" />
                  <span>LINE: @bustanenergy</span>
                </a>
              </li>
              <li>
                <Link
                  to={langPath('/contact')}
                  className={`group flex items-start gap-3 ${footerLink}`}
                >
                  <Mail size={15} className="mt-0.5 shrink-0 text-ocean/60 group-hover:text-ocean transition-colors duration-[var(--duration-fast)]" />
                  <span>{t.nav.contact}</span>
                </Link>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-grove/75">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-ocean/60" />
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
      <div className="border-t border-grove/14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-grove/75 text-xs">
            {t.footer.copyright}
          </p>
          <div className="flex items-center gap-5">
            <Link
              to={langPath('/privacy')}
              className="text-xs text-grove/75 hover:text-ocean transition-colors duration-[var(--duration-fast)] ease-out-soft"
            >
              {lang === 'he' ? 'מדיניות פרטיות' : lang === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
            </Link>
            <Link
              to={langPath('/terms')}
              className="text-xs text-grove/75 hover:text-ocean transition-colors duration-[var(--duration-fast)] ease-out-soft"
            >
              {lang === 'he' ? 'תנאי שימוש' : lang === 'th' ? 'ข้อกำหนดการใช้งาน' : 'Terms of Service'}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
