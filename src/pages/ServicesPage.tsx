import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Sun, Home, Building2, BatteryFull, Wrench } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { serviceSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
import {
  fadeUp,
  stagger,
  revealViewport,
  arrowSlide,
  ServiceHero,
  Divider,
  RelatedCard,
  ServiceCTA,
} from './services/shared'

interface ServiceSectionProps {
  image: string
  imgWidth: number
  imgHeight: number
  title: string
  description: string
  benefits: readonly string[]
  cta: string
  ctaLink: string
  reversed?: boolean
  badge: string
}

function ServiceSection({ image, imgWidth, imgHeight, title, description, benefits, cta, ctaLink, reversed, badge, altText }: ServiceSectionProps & { altText?: string }) {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-16 items-center`}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
          variants={stagger}
        >
          {/* Image */}
          <motion.div variants={fadeUp} className="flex-1 w-full">
            <div className="group relative overflow-hidden rounded-card shadow-lift">
              <img
                src={image}
                alt={altText ?? title}
                width={imgWidth}
                height={imgHeight}
                loading="lazy"
                className="w-full h-[420px] object-cover transition-transform duration-[var(--duration-slow)] ease-out-soft group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-grove/45 to-transparent to-60%" />
              <div className="absolute top-6 left-6">
                <span className="rounded-full bg-gold/90 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase text-grove">
                  {badge}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div variants={stagger} className="flex-1 space-y-8">
            <motion.div variants={fadeUp}>
              <h2 className="font-serif text-display-md md:text-display-lg leading-[1.1] text-ink mb-4">
                {title}
              </h2>
              <p className="text-ink/74 text-lg leading-relaxed">{description}</p>
            </motion.div>

            <motion.ul variants={stagger} className="space-y-3">
              {benefits.map((b, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
                  <CheckCircle2 size={20} strokeWidth={1.5} className="text-ocean mt-0.5 flex-shrink-0" aria-hidden />
                  <span className="text-ink/78 text-base">{b}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div variants={fadeUp}>
              <Button variant="primary" size="md" to={ctaLink} className="group">
                {cta}
                <ArrowRight size={16} className={arrowSlide} aria-hidden />
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default function ServicesPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()
  // SEO stays EN/TH (Hebrew is operator-facing, not a public SEO target).
  const seoLang: 'en' | 'th' = lang === 'th' ? 'th' : 'en'

  return (
    <>
      <SEOHead
        title={t.seo.services.title}
        description={t.seo.services.description}
        path="/services"
        lang={seoLang}
        schema={[
          serviceSchema(seoLang),
          breadcrumbSchema(pageBreadcrumb(seoLang, t.nav.services, '/services')),
        ]}
      />
      <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
        {/* Hero */}
        <ServiceHero
          icon={<Sun size={14} strokeWidth={1.5} aria-hidden />}
          badge={t.services.hero.tag}
          title={t.services.hero.title}
          titleAccent={t.services.hero.titleAccent}
          subtitle={t.services.hero.subtitle}
        />

        <Divider />

        {/* Residential */}
        <div id="residential">
          <ServiceSection
            badge={t.services.residential.title}
            image="/assets/images/bizplan-05-villa.png"
            imgWidth={1024}
            imgHeight={510}
            title={t.services.residential.title}
            description={t.services.residential.description}
            benefits={t.services.residential.benefits}
            cta={t.services.residential.cta}
            ctaLink={langPath('/contact')}
            reversed={false}
            altText="Residential solar panel installation on a villa roof in Ko Phangan"
          />
        </div>

        <Divider />

        {/* Commercial */}
        <div id="commercial">
          <ServiceSection
            badge={t.services.commercial.title}
            image="/assets/images/strategy-03-resort.png"
            imgWidth={1024}
            imgHeight={681}
            title={t.services.commercial.title}
            description={t.services.commercial.description}
            benefits={t.services.commercial.benefits}
            cta={t.services.commercial.cta}
            ctaLink={langPath('/contact')}
            reversed={true}
            altText="Commercial solar system installed on a resort rooftop in Ko Phangan"
          />
        </div>

        <Divider />

        {/* Solar Farm */}
        <div id="farm">
          <ServiceSection
            badge={t.services.solarFarm.title}
            image="/assets/images/strategy-01-aerial.png"
            imgWidth={1024}
            imgHeight={574}
            title={t.services.solarFarm.title}
            description={t.services.solarFarm.description}
            benefits={t.services.solarFarm.benefits}
            cta={t.services.solarFarm.cta}
            ctaLink={langPath('/contact')}
            reversed={false}
            altText="Aerial view of solar farm installation on Ko Phangan island"
          />
        </div>

        {/* Explore Services */}
        <section className="py-24 bg-mist/35">
          <div className="max-w-7xl mx-auto px-6">
            <SectionHeader
              title="Explore Our Services"
              subtitle="Dive deeper into each service to find the right solution for your property."
              className="mb-12"
            />

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={revealViewport}
              variants={stagger}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {[
                {
                  icon: Home,
                  title: 'Residential Solar',
                  desc: 'Rooftop systems for homes and villas. 3kW to 10kW with battery backup options.',
                  link: '/services/residential',
                },
                {
                  icon: Building2,
                  title: 'Commercial Solar',
                  desc: 'Hotel, resort, and business solar. 30kW to 500kW with PPA financing.',
                  link: '/services/commercial',
                },
                {
                  icon: BatteryFull,
                  title: 'Off-Grid & Battery',
                  desc: 'Energy independence with Huawei LUNA batteries and hybrid systems.',
                  link: '/services/off-grid',
                },
                {
                  icon: Wrench,
                  title: 'Maintenance & Support',
                  desc: 'Monitoring, cleaning, repairs, and annual inspections for all systems.',
                  link: '/services/maintenance',
                },
              ].map((card) => (
                <RelatedCard
                  key={card.title}
                  to={langPath(card.link)}
                  icon={<card.icon size={22} strokeWidth={1.5} aria-hidden />}
                  title={card.title}
                  desc={card.desc}
                />
              ))}
            </motion.div>
          </div>
        </section>

        {/* Bottom CTA */}
        <ServiceCTA
          title={t.services.bottomCta.title}
          subtitle={t.services.bottomCta.subtitle}
          primaryLabel={t.services.bottomCta.cta}
          primaryTo={langPath('/contact')}
        />
      </div>
    </>
  )
}
