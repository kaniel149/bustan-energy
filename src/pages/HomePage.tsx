import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowRight, Battery, Check, ChevronDown, FileText, MapPin, MessageCircle, Play, Sun, Wrench, X } from 'lucide-react'
import { getSession, isAdmin } from '../lib/admin-auth'
import { useLanguage } from '../i18n/useLanguage'
import { homepageCopy } from '../i18n/homepage-copy'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, homeBreadcrumb, faqSchema } from '../components/seo/schemas'
import './home.css'

const SolarInstallationPlayer = lazy(() => import('../components/SolarInstallationPlayer'))
const WHATSAPP = 'https://wa.me/66946692011'
const propertyImages = [
  { src: '/assets/images/home-villa.webp', width: 1024, height: 510 },
  { src: '/assets/images/home-resort.webp', width: 1024, height: 681 },
  { src: '/assets/images/home-island.webp', width: 1024, height: 574 },
]
const propertyRoutes = ['/services/residential', '/services/commercial', '/factory-electricity-bill-solar-assessment']
const systemIcons = [Sun, Battery, Wrench]

export default function HomePage() {
  const { lang, langPath } = useLanguage()
  const copy = homepageCopy[lang]
  const navigate = useNavigate()
  const [propertyIndex, setPropertyIndex] = useState(0)
  const [walkthroughOpen, setWalkthroughOpen] = useState(() => window.location.hash === '#installation-walkthrough')
  const [showAdminBanner, setShowAdminBanner] = useState(false)
  const walkthroughToggle = useRef<HTMLButtonElement>(null)
  const property = copy.properties[propertyIndex]
  const propertyImage = propertyImages[propertyIndex]

  // Preserve the existing authenticated admin handoff.
  useEffect(() => {
    let cancelled = false
    getSession().then((session) => {
      if (cancelled || !session?.user?.email || !isAdmin(session.user.email)) return
      if (sessionStorage.getItem('bustan_admin_skip_redirect') === '1') {
        setShowAdminBanner(true)
        return
      }
      sessionStorage.setItem('bustan_admin_skip_redirect', '1')
      navigate('/admin', { replace: true })
    })
    return () => { cancelled = true }
  }, [navigate])

  function closeWalkthrough() {
    setWalkthroughOpen(false)
    walkthroughToggle.current?.focus()
    walkthroughToggle.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }

  const schemas = [
    breadcrumbSchema(homeBreadcrumb(lang)),
    faqSchema(copy.faqs),
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: copy.processTitle.replace('\n', ' '),
      description: copy.processIntro,
      step: copy.steps.map((step, i) => ({ '@type': 'HowToStep', position: i + 1, name: step.title, text: step.description })),
    },
  ]

  return (
    <>
      <SEOHead title={copy.seoTitle} description={copy.seoDescription} path="/" lang={lang} schema={schemas} localizedHebrew />
      {showAdminBanner && (
        <aside className="home-admin-note" dir="rtl">
          אתה מחובר כאדמין · <Link to="/admin">מעבר לדשבורד האדמין ←</Link>
        </aside>
      )}
      <div className="bustan-home bustan-home-refresh">
        <section className="home-hero home-wrap" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <p className="home-eyebrow"><span className="home-status-dot" />{copy.location}</p>
            <h1 id="home-title">{copy.title}<br /><em>{copy.accent}</em></h1>
            <p className="home-hero-intro">{copy.intro}</p>
            <div className="home-hero-actions">
              <Link className="home-button" to={langPath('/contact')}>{copy.primary}<ArrowRight size={18} aria-hidden /></Link>
              <a className="home-text-link" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden />{copy.whatsapp}</a>
            </div>
            <p className="home-reassurance"><Check size={14} aria-hidden />{copy.reassurance}</p>
            <a className="home-scroll-link" href="#property-types"><ArrowDown size={17} aria-hidden /><span>{copy.propertyLegend}</span></a>
          </div>
          <figure className="home-hero-figure">
            <div className="home-hero-photo">
              <img src="/assets/images/home-island.webp" width={1024} height={574} fetchPriority="high" decoding="async" alt={copy.imageAlt} />
              <span className="home-photo-location"><MapPin size={13} aria-hidden />Koh Phangan, Thailand</span>
              <span className="home-survey-corner home-survey-corner-start" aria-hidden />
              <span className="home-survey-corner home-survey-corner-end" aria-hidden />
              <div className="home-photo-note"><span className="home-sunline" aria-hidden /><strong>{copy.photoTitle}</strong><span>{copy.photoNote}</span></div>
            </div>
            <figcaption><span>9° N / 100° E</span><span>{copy.illustration}</span></figcaption>
          </figure>
        </section>

        <div className="home-essentials">
          <div className="home-wrap">
            {copy.essentials.map((item, i) => <div key={item}><span className="home-small-number">0{i + 1}</span><span>{item}</span></div>)}
          </div>
        </div>

        <section className="home-section home-wrap" id="property-types" aria-labelledby="property-title">
          <div className="home-section-heading">
            <div><p className="home-eyebrow">{copy.propertyTag}</p><h2 id="property-title">{copy.propertyTitle}</h2></div>
            <p>{copy.propertyIntro}</p>
          </div>
          <fieldset className="home-property-options">
            <legend className="sr-only">{copy.propertyLegend}</legend>
            {copy.properties.map((item, i) => (
              <label className={propertyIndex === i ? 'is-selected' : ''} key={item.name}>
                <input type="radio" name="property-type" value={i} checked={propertyIndex === i} onChange={() => setPropertyIndex(i)} aria-controls="property-panel" />
                <span className="home-small-number" aria-hidden>0{i + 1}</span><span>{item.name}</span><ArrowRight size={18} aria-hidden />
              </label>
            ))}
          </fieldset>
          <div className="home-property-panel" id="property-panel">
            <figure id="work">
              <img src={propertyImage.src} width={propertyImage.width} height={propertyImage.height} alt={`${property.name} · ${copy.illustration}`} loading="lazy" decoding="async" />
              <figcaption>{copy.illustration}</figcaption>
            </figure>
            <div className="home-property-content" aria-live="polite" aria-atomic="true">
              <p className="home-eyebrow">{property.name}</p>
              <h3>{property.title}</h3><p>{property.description}</p>
              <div className="home-property-priorities"><span>{copy.propertyFocus}</span><ul>{property.priorities.map(item => <li key={item}><Check size={15} aria-hidden />{item}</li>)}</ul></div>
              <Link className="home-text-link" to={langPath(propertyRoutes[propertyIndex])}>{property.cta}<ArrowRight size={18} aria-hidden /></Link>
            </div>
          </div>
        </section>

        <section className="home-systems" id="services" aria-labelledby="systems-title">
          <div className="home-wrap home-section">
            <div className="home-section-heading">
              <div><p className="home-eyebrow">{copy.systemsTag}</p><h2 id="systems-title">{copy.systemsTitle}</h2></div><p>{copy.systemsIntro}</p>
            </div>
            <div className="home-system-grid">
              {copy.systems.map((system, i) => {
                const Icon = systemIcons[i]
                return <article key={system.name}>
                  <div className="home-system-label"><Icon size={27} strokeWidth={1.3} aria-hidden /><span>{system.name}</span></div>
                  <h3>{system.title}</h3><p>{system.description}</p><span className="home-system-note">{system.note}</span>
                </article>
              })}
            </div>
            <Link className="home-text-link" to={langPath('/services')}>{copy.explore}<ArrowRight size={18} aria-hidden /></Link>
          </div>
        </section>

        <section className="home-process home-section home-wrap" id="process" aria-labelledby="process-title">
          <div className="home-process-intro"><p className="home-eyebrow">{copy.processTag}</p><h2 id="process-title">{copy.processTitle}</h2><p>{copy.processIntro}</p><Link className="home-text-link" to={langPath('/contact')}>{copy.primary}<ArrowRight size={18} aria-hidden /></Link></div>
          <ol className="home-process-steps">{copy.steps.map((step, i) => <li key={step.title}><span>0{i + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol>
        </section>

        <section className="home-demo" aria-labelledby="demo-title">
          <div className="home-wrap home-demo-intro">
            <div className="home-demo-preview"><img src="/assets/images/home-installation.webp" width={1000} height={545} loading="lazy" decoding="async" alt={copy.illustration} /></div>
            <div><p className="home-eyebrow">{copy.demoTag}</p><h2 id="demo-title">{copy.demoTitle}</h2><p>{copy.demoIntro}</p>
              <button ref={walkthroughToggle} type="button" className="home-button home-button-outline" aria-expanded={walkthroughOpen} aria-controls="installation-walkthrough" onClick={() => setWalkthroughOpen(open => !open)}>
                {walkthroughOpen ? <X size={17} aria-hidden /> : <Play size={17} aria-hidden />}{walkthroughOpen ? copy.demoClose : copy.demoOpen}
              </button>
            </div>
          </div>
          <div id="installation-walkthrough" hidden={!walkthroughOpen}>
            {walkthroughOpen && <><Suspense fallback={<p className="home-demo-loading" role="status">{copy.demoLoading}</p>}><SolarInstallationPlayer /></Suspense><div className="home-demo-close"><button type="button" className="home-button home-button-outline" onClick={closeWalkthrough}><X size={17} aria-hidden />{copy.demoClose}</button></div></>}
          </div>
        </section>

        <section className="home-faq home-section home-wrap" id="faq" aria-labelledby="faq-title">
          <div><p className="home-eyebrow">{copy.faqTag}</p><h2 id="faq-title">{copy.faqTitle}</h2><p>{copy.faqIntro}</p></div>
          <div className="home-faq-list">{copy.faqs.map((item, i) => <details key={item.question} open={i === 0}><summary>{item.question}<ChevronDown size={18} aria-hidden /></summary><p>{item.answer}</p></details>)}</div>
        </section>

        <section className="home-contact" id="contact" aria-labelledby="contact-title">
          <div className="home-wrap home-contact-inner">
            <div><p className="home-eyebrow">{copy.contactTag}</p><h2 id="contact-title">{copy.contactTitle}</h2><p>{copy.contactIntro}</p></div>
            <div className="home-contact-desk"><FileText size={28} strokeWidth={1.3} aria-hidden /><ul>{copy.checklist.map(item => <li key={item}><Check size={17} aria-hidden />{item}</li>)}</ul>
              <Link className="home-button home-button-sun" to={langPath('/contact')}>{copy.primary}<ArrowRight size={18} aria-hidden /></Link>
              <a className="home-text-link" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden />{copy.whatsapp}</a>
              <p className="home-contact-phone">{copy.call} <a href="tel:+66946692011"><bdi>+66 94 669 2011</bdi></a></p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
