import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ArrowRight,
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

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      className="border-b border-white/10 last:border-0"
      initial={false}
    >
      <button
        className="w-full flex items-center justify-between py-5 text-left group"
        onClick={() => setOpen(!open)}
      >
        <span className="text-white/85 font-medium text-base pr-4 group-hover:text-white transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[var(--color-gold)] flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-white/50 text-sm leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const packageIcons = [Home, Building2, Factory]

export default function PricingPage() {
  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()
  const p = t.pricing

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const packages = [
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
    <div className="min-h-screen bg-[var(--color-dark)]">
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
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(232,168,32,0.35), transparent)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                <BadgeDollarSign className="w-3.5 h-3.5" />
                {p.hero.tag}
              </span>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-3xl mx-auto leading-tight"
            >
              {p.hero.title}{' '}
              <span className="text-[var(--color-gold)]">{p.hero.titleAccent}</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
              {p.hero.subtitle}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* EPC vs PPA */}
      <section className="py-16 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white text-center mb-12"
            >
              {p.models.title}
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* EPC */}
              <motion.div
                variants={fadeUp}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-[var(--color-gold)]/30 transition-colors duration-300"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-[var(--color-gold)]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">{p.models.epc.title}</h3>
                    <p className="text-white/40 text-sm">{p.models.epc.subtitle}</p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {p.models.epc.features.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
                      <span className="text-white/65 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 border-t border-white/10">
                  <span className="text-xs text-white/35 uppercase tracking-wider">Best for: </span>
                  <span className="text-white/65 text-sm">{p.models.epc.bestFor}</span>
                </div>
              </motion.div>

              {/* PPA */}
              <motion.div
                variants={fadeUp}
                className="bg-[var(--color-gold)]/8 backdrop-blur-xl border border-[var(--color-gold)]/25 rounded-2xl p-8 hover:border-[var(--color-gold)]/50 transition-colors duration-300 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-48 h-48 opacity-10"
                  style={{
                    backgroundImage: 'radial-gradient(circle, rgba(232,168,32,0.6), transparent)',
                  }}
                />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/40 flex items-center justify-center">
                      <BadgeDollarSign className="w-5 h-5 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl">{p.models.ppa.title}</h3>
                      <p className="text-white/40 text-sm">{p.models.ppa.subtitle}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {p.models.ppa.features.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
                        <span className="text-white/65 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4 border-t border-[var(--color-gold)]/20">
                    <span className="text-xs text-white/35 uppercase tracking-wider">Best for: </span>
                    <span className="text-white/65 text-sm">{p.models.ppa.bestFor}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-16 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white text-center mb-4"
            >
              {p.packages.title}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/40 text-center mb-12 text-sm">
              {p.note}
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const Icon = pkg.icon
                return (
                  <motion.div
                    key={pkg.name}
                    variants={fadeUp}
                    className={`rounded-2xl p-8 relative overflow-hidden transition-all duration-300 ${
                      pkg.highlight
                        ? 'bg-[var(--color-gold)]/10 border-2 border-[var(--color-gold)]/40 hover:border-[var(--color-gold)]/60'
                        : 'bg-white/5 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {pkg.highlight && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-gold)] text-[var(--color-dark)] uppercase tracking-wider">
                          {pkg.badge}
                        </span>
                      </div>
                    )}

                    <div className="w-12 h-12 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-[var(--color-gold)]" />
                    </div>

                    <h3 className="text-white font-bold text-2xl mb-1">{pkg.name}</h3>
                    <p className="text-[var(--color-gold)] text-sm font-semibold mb-1">{pkg.range}</p>
                    <p className="text-white/40 text-sm mb-6">{pkg.ideal}</p>

                    <div className="text-white font-bold text-lg mb-6">{pkg.price}</div>

                    <ul className="space-y-2.5">
                      {pkg.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[var(--color-gold)] mt-0.5 flex-shrink-0" />
                          <span className="text-white/55 text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white text-center mb-12"
            >
              {p.faqs.title}
            </motion.h2>

            <motion.div variants={fadeUp} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-4">
              {p.faqs.items.map((faq, i) => (
                <FAQItem key={i} question={faq.question} answer={faq.answer} />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-12 text-center"
          >
            <h3 className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white mb-4">
              {p.cta.title}
            </h3>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              {p.cta.subtitle}
            </p>
            <Link
              to={langPath('/contact')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold hover:bg-[var(--color-gold-light)] transition-colors duration-200"
            >
              {p.cta.button}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
