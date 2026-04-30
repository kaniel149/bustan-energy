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
    <footer className="bg-dark border-t border-white/8">
      {/* Main columns */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

          {/* Col 1: Brand */}
          <div className="flex flex-col gap-5">
            {/* Logo */}
            <Link to={langPath('/')} className="inline-flex items-center gap-2 group w-fit">
              <img
                src="/assets/logo/tm-energy.png"
                alt="TM Energy"
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
                <span className="font-serif text-xl text-gold">TM</span>
                <span className="font-sans text-sm font-medium text-white/80 tracking-wide">
                  ENERGY
                </span>
              </span>
            </Link>

            <p className="text-white/50 text-sm leading-relaxed max-w-[240px]">
              {t.footer.tagline}
            </p>

            {/* Social / contact quick icons */}
            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://wa.me/66946692011"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/25 hover:bg-white/12 transition-colors"
                aria-label="WhatsApp"
              >
                <Phone size={15} />
              </a>
              <a
                href="https://line.me/ti/p/~your-line-id"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/25 hover:bg-white/12 transition-colors"
                aria-label="LINE"
              >
                <MessageCircle size={15} />
              </a>
              <a
                href="mailto:info@energy-tm.com"
                className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/25 hover:bg-white/12 transition-colors"
                aria-label="Email"
              >
                <Mail size={15} />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/30">
              {t.footer.quickLinks}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={langPath(link.path)}
                    className="text-sm text-white/55 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Services */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/30">
              {t.footer.servicesTitle}
            </h4>
            <ul className="flex flex-col gap-2.5">
              {SERVICES.map((svc) => (
                <li key={svc.path}>
                  <Link
                    to={langPath(svc.path)}
                    className="text-sm text-white/55 hover:text-white transition-colors"
                  >
                    {svc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="flex flex-col gap-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/30">
              {t.footer.contactTitle}
            </h4>
            <ul className="flex flex-col gap-4">
              <li>
                <a
                  href="https://wa.me/66946692011"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm text-white/55 hover:text-white transition-colors group"
                >
                  <Phone size={15} className="mt-0.5 shrink-0 text-gold/70 group-hover:text-gold transition-colors" />
                  <span>WhatsApp: +66 94 669 2011</span>
                </a>
              </li>
              <li>
                <a
                  href="https://line.me/ti/p/~your-line-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-sm text-white/55 hover:text-white transition-colors group"
                >
                  <MessageCircle size={15} className="mt-0.5 shrink-0 text-gold/70 group-hover:text-gold transition-colors" />
                  <span>LINE: @tm-energy</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@energy-tm.com"
                  className="flex items-start gap-3 text-sm text-white/55 hover:text-white transition-colors group"
                >
                  <Mail size={15} className="mt-0.5 shrink-0 text-gold/70 group-hover:text-gold transition-colors" />
                  <span>info@energy-tm.com</span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-3 text-sm text-white/55">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-gold/70" />
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
      <div className="border-t border-white/8">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs">
            {t.footer.copyright}
          </p>
          <div className="flex items-center gap-5">
            <Link to={langPath('/privacy')} className="text-white/30 text-xs hover:text-white/60 transition-colors">
              Privacy Policy
            </Link>
            <Link to={langPath('/terms')} className="text-white/30 text-xs hover:text-white/60 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
