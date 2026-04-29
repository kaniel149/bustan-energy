import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Sun, Home, Building2, BatteryFull, Wrench } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { serviceSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

interface ServiceSectionProps {
  image: string
  title: string
  description: string
  benefits: readonly string[]
  cta: string
  ctaLink: string
  reversed?: boolean
  badge: string
}

function ServiceSection({ image, title, description, benefits, cta, ctaLink, reversed, badge, altText }: ServiceSectionProps & { altText?: string }) {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-16 items-center`}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
        >
          {/* Image */}
          <motion.div variants={fadeUp} className="flex-1 w-full">
            <div className="relative rounded-3xl overflow-hidden group">
              <img
                src={image}
                alt={altText ?? title}
                loading="lazy"
                className="w-full h-[420px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/60 to-transparent" />
              <div className="absolute top-6 left-6">
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/40 text-[var(--color-gold)] backdrop-blur-sm">
                  {badge}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div variants={stagger} className="flex-1 space-y-8">
            <motion.div variants={fadeUp}>
              <h2 className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-white mb-4 leading-tight">
                {title}
              </h2>
              <p className="text-white/60 text-lg leading-relaxed">{description}</p>
            </motion.div>

            <motion.ul variants={stagger} className="space-y-3">
              {benefits.map((b, i) => (
                <motion.li key={i} variants={fadeUp} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
                  <span className="text-white/75 text-base">{b}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div variants={fadeUp}>
              <Link
                to={ctaLink}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold text-sm hover:bg-[var(--color-gold-light)] transition-colors duration-200"
              >
                {cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
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

  return (
    <>
      <SEOHead
        title={t.seo.services.title}
        description={t.seo.services.description}
        path="/services"
        lang={lang}
        schema={[
          serviceSchema(lang),
          breadcrumbSchema(pageBreadcrumb(lang, t.nav.services, '/services')),
        ]}
      />
      <div className="min-h-screen bg-[var(--color-dark)]">
        {/* Hero */}
        <section className="relative pt-32 pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,168,32,0.3), transparent)',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-6 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-6"
            >
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                  <Sun className="w-3.5 h-3.5" />
                  {t.services.hero.tag}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl mx-auto leading-tight"
              >
                {t.services.hero.title}{' '}
                <span className="text-[var(--color-gold)]">{t.services.hero.titleAccent}</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
                {t.services.hero.subtitle}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Residential */}
        <div id="residential">
          <ServiceSection
            badge={t.services.residential.title}
            image="/assets/images/bizplan-05-villa.png"
            title={t.services.residential.title}
            description={t.services.residential.description}
            benefits={t.services.residential.benefits}
            cta={t.services.residential.cta}
            ctaLink={langPath('/contact')}
            reversed={false}
            altText="Residential solar panel installation on a villa roof in Ko Phangan"
          />
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Commercial */}
        <div id="commercial">
          <ServiceSection
            badge={t.services.commercial.title}
            image="/assets/images/strategy-03-resort.png"
            title={t.services.commercial.title}
            description={t.services.commercial.description}
            benefits={t.services.commercial.benefits}
            cta={t.services.commercial.cta}
            ctaLink={langPath('/contact')}
            reversed={true}
            altText="Commercial solar system installed on a resort rooftop in Ko Phangan"
          />
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Solar Farm */}
        <div id="farm">
          <ServiceSection
            badge={t.services.solarFarm.title}
            image="/assets/images/strategy-01-aerial.png"
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
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="text-center mb-12"
            >
              <motion.h2
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white mb-4"
              >
                Explore Our Services
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/50 text-lg max-w-2xl mx-auto">
                Dive deeper into each service to find the right solution for your property.
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
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
                <motion.div key={card.title} variants={fadeUp}>
                  <Link
                    to={langPath(card.link)}
                    className="block bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-[var(--color-gold)]/30 hover:-translate-y-1 transition-all duration-300 h-full"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 flex items-center justify-center mb-4">
                      <card.icon className="w-5 h-5 text-[var(--color-gold)]" />
                    </div>
                    <h3 className="font-[family-name:var(--font-serif)] text-lg text-white mb-2">{card.title}</h3>
                    <p className="text-white/45 text-sm leading-relaxed mb-4">{card.desc}</p>
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-gold)] text-sm font-medium">
                      Learn more <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center"
            >
              <h3 className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white mb-4">
                {t.services.bottomCta.title}
              </h3>
              <p className="text-white/55 text-lg mb-8">
                {t.services.bottomCta.subtitle}
              </p>
              <Link
                to={langPath('/contact')}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
              >
                {t.services.bottomCta.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  )
}
