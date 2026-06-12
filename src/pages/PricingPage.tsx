import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  BadgeDollarSign,
  ChevronDown,
  Zap,
  Building2,
  Home,
  Factory,
} from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { faqSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { SectionHeader } from '../components/ui/SectionHeader'
import { Badge } from '../components/ui/Badge'
import {
  fadeUp,
  stagger,
  revealViewport,
  cardHover,
  ServiceHero,
  ServiceCTA,
  Divider,
  IconTile,
} from './services/shared'

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-grove/14 last:border-0">
      <button
        type="button"
        aria-expanded={open}
        className="group flex min-h-11 w-full cursor-pointer items-center justify-between gap-4 py-5 text-start"
        onClick={() => setOpen(!open)}
      >
        <span className="text-base font-medium text-ink transition-colors duration-[var(--duration-fast)] ease-out-soft group-hover:text-ocean">
          {question}
        </span>
        <ChevronDown
          size={20}
          strokeWidth={1.5}
          aria-hidden
          className={`shrink-0 text-ocean transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-ink/74">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const packageIcons = [Home, Building2, Factory]

type PricingPackage = {
  icon: typeof Home
  name: string
  range: string
  ideal: string
  price: string
  features: readonly string[]
  highlight: boolean
  badge?: string
}

export default function PricingPage() {
  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()
  const p = t.pricing

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const packages: PricingPackage[] = [
    {
      icon: packageIcons[0],
      name: p.packages.starter.name,
      range: p.packages.starter.range,
      ideal: p.packages.starter.ideal,
      price: p.packages.starter.price,
      features: p.models.epc.features,
      highlight: false,
    },
    {
      icon: packageIcons[1],
      name: p.packages.standard.name,
      range: p.packages.standard.range,
      ideal: p.packages.standard.ideal,
      price: p.packages.standard.price,
      badge: p.packages.standard.badge,
      features: [...p.models.epc.features, ...p.models.ppa.features.slice(0, 1)],
      highlight: true,
    },
    {
      icon: packageIcons[2],
      name: p.packages.premium.name,
      range: p.packages.premium.range,
      ideal: p.packages.premium.ideal,
      price: p.packages.premium.price,
      features: p.models.ppa.features,
      highlight: false,
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
      <SEOHead
        title={t.seo.pricing.title}
        description={t.seo.pricing.description}
        path="/pricing"
        lang={lang}
        schema={[
          faqSchema(p.faqs.items),
          breadcrumbSchema(pageBreadcrumb(lang, p.hero.tag, '/pricing')),
        ]}
      />

      {/* Hero */}
      <ServiceHero
        icon={<BadgeDollarSign size={14} strokeWidth={1.5} aria-hidden />}
        badge={p.hero.tag}
        title={p.hero.title}
        titleAccent={p.hero.titleAccent}
        subtitle={p.hero.subtitle}
      />

      {/* EPC vs PPA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader title={p.models.title} className="mb-14" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* EPC */}
            <motion.div variants={fadeUp} className="h-full">
              <div
                className={`h-full rounded-card border border-grove/14 bg-shell/76 p-8 shadow-soft hover:border-ocean/30 ${cardHover}`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <IconTile>
                    <Zap size={22} strokeWidth={1.5} aria-hidden />
                  </IconTile>
                  <div>
                    <h3 className="text-xl font-semibold text-ink">{p.models.epc.title}</h3>
                    <p className="text-ink/60 text-sm">{p.models.epc.subtitle}</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {p.models.epc.features.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2
                        size={18}
                        strokeWidth={1.5}
                        className="text-ocean mt-0.5 shrink-0"
                        aria-hidden
                      />
                      <span className="text-ink/74 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 border-t border-grove/14">
                  <span className="text-xs text-ink/55 uppercase tracking-wider">Best for: </span>
                  <span className="text-ink/74 text-sm">{p.models.epc.bestFor}</span>
                </div>
              </div>
            </motion.div>

            {/* PPA — emphasized with a soft lagoon accent */}
            <motion.div variants={fadeUp} className="h-full">
              <div
                className={`relative h-full overflow-hidden rounded-card border border-ocean/28 bg-shell/82 p-8 shadow-soft hover:border-ocean/45 ${cardHover}`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse 70% 55% at 85% 0%, rgba(0,111,107,0.10) 0%, transparent 70%)',
                  }}
                />
                <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <IconTile>
                      <BadgeDollarSign size={22} strokeWidth={1.5} aria-hidden />
                    </IconTile>
                    <div>
                      <h3 className="text-xl font-semibold text-ink">{p.models.ppa.title}</h3>
                      <p className="text-ink/60 text-sm">{p.models.ppa.subtitle}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {p.models.ppa.features.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2
                          size={18}
                          strokeWidth={1.5}
                          className="text-ocean mt-0.5 shrink-0"
                          aria-hidden
                        />
                        <span className="text-ink/74 text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 border-t border-ocean/16">
                    <span className="text-xs text-ink/55 uppercase tracking-wider">Best for: </span>
                    <span className="text-ink/74 text-sm">{p.models.ppa.bestFor}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* Packages */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader title={p.packages.title} subtitle={p.note} className="mb-14" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-stretch"
          >
            {packages.map((pkg) => {
              const Icon = pkg.icon
              return (
                <motion.div key={pkg.name} variants={fadeUp} className="h-full">
                  <div
                    className={
                      pkg.highlight
                        ? 'relative flex h-full flex-col rounded-card border-2 border-ocean/35 bg-shell/92 p-8 shadow-float md:scale-[1.03] transition-all duration-[var(--duration-fast)] ease-out-soft hover:-translate-y-0.5 hover:border-ocean/50'
                        : `relative flex h-full flex-col rounded-card border border-grove/14 bg-shell/76 p-8 shadow-soft hover:border-ocean/30 ${cardHover}`
                    }
                  >
                    {pkg.highlight && pkg.badge && (
                      <div className="absolute top-5 right-5">
                        <Badge tone="sun" className="uppercase tracking-wider">
                          {pkg.badge}
                        </Badge>
                      </div>
                    )}

                    <IconTile className="mb-5">
                      <Icon size={24} strokeWidth={1.5} aria-hidden />
                    </IconTile>

                    <h3 className="text-2xl font-semibold text-ink mb-1">{pkg.name}</h3>
                    <p className="text-ocean text-sm font-semibold mb-1">{pkg.range}</p>
                    <p className="text-ink/60 text-sm mb-6">{pkg.ideal}</p>

                    <div className="font-serif text-2xl text-ink mb-6">{pkg.price}</div>

                    <ul className="space-y-2.5">
                      {pkg.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2
                            size={16}
                            strokeWidth={1.5}
                            className="text-ocean mt-0.5 shrink-0"
                            aria-hidden
                          />
                          <span className="text-ink/72 text-sm leading-relaxed">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-mist/35">
        <div className="max-w-3xl mx-auto px-6">
          <SectionHeader title={p.faqs.title} className="mb-12" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
            className="rounded-card border border-grove/14 bg-shell/82 px-6 sm:px-8 py-2 shadow-soft"
          >
            {p.faqs.items.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <ServiceCTA
        title={p.cta.title}
        subtitle={p.cta.subtitle}
        primaryLabel={p.cta.button}
        primaryTo={langPath('/contact')}
      />
    </div>
  )
}
