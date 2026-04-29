import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ClipboardCheck, PenLine, Wrench, BarChart3, ArrowRight, Zap } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { serviceSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const fadeLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7 } },
}

const fadeRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const stepIcons = [ClipboardCheck, PenLine, Wrench, BarChart3]
const stepNumbers = ['01', '02', '03', '04']
const stepColors = ['#E8A820', '#2E7D32', '#0A3D5C', '#E8A820']

export default function HowItWorksPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()

  return (
    <>
      <SEOHead
        title={t.seo.howItWorks.title}
        description={t.seo.howItWorks.description}
        path="/how-it-works"
        lang={lang}
        schema={[
          serviceSchema(lang),
          breadcrumbSchema(pageBreadcrumb(lang, t.nav.howItWorks, '/how-it-works')),
        ]}
      />
      <div className="min-h-screen bg-[var(--color-dark)]">
        {/* Hero */}
        <section className="relative pt-32 pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(46,125,50,0.4), transparent)',
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
                  <Zap className="w-3.5 h-3.5" />
                  {t.howItWorks.hero.tag}
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-3xl mx-auto leading-tight"
              >
                {t.howItWorks.hero.title}
              </motion.h1>

              <motion.p variants={fadeUp} className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
                {t.howItWorks.hero.subtitle}
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-12 pb-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="relative">
              {/* Connecting line (desktop) */}
              <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--color-gold)]/30 via-white/10 to-transparent -translate-x-1/2" />

              <div className="space-y-8">
                {t.howItWorks.steps.map((step, index) => {
                  const Icon = stepIcons[index]
                  const isEven = index % 2 === 0
                  const color = stepColors[index]
                  const number = stepNumbers[index]

                  return (
                    <motion.div
                      key={number}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: '-60px' }}
                      variants={stagger}
                      className={`flex flex-col lg:flex-row items-center gap-12 ${isEven ? '' : 'lg:flex-row-reverse'}`}
                    >
                      {/* Content card */}
                      <motion.div
                        variants={isEven ? fadeLeft : fadeRight}
                        className="flex-1 w-full"
                      >
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors duration-300">
                          <div className="flex items-start gap-5 mb-6">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                            >
                              <Icon className="w-6 h-6" style={{ color }} />
                            </div>
                            <div>
                              <span
                                className="text-xs font-bold tracking-widest uppercase"
                                style={{ color }}
                              >
                                Step {number}
                              </span>
                              <h3 className="font-[family-name:var(--font-serif)] text-2xl md:text-3xl text-white mt-1">
                                {step.title}
                              </h3>
                            </div>
                          </div>

                          <p className="text-white/60 text-base leading-relaxed mb-6">{step.description}</p>

                          <div className="flex items-center gap-2 pt-4 border-t border-white/8">
                            <span className="text-xs text-white/35 uppercase tracking-wider">Timeline:</span>
                            <span className="text-sm font-semibold" style={{ color }}>
                              {step.duration}
                            </span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Center node */}
                      <motion.div
                        variants={fadeUp}
                        className="hidden lg:flex flex-shrink-0 relative z-10"
                      >
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border-2"
                          style={{
                            backgroundColor: `${color}15`,
                            borderColor: `${color}60`,
                            color,
                            boxShadow: `0 0 24px ${color}20`,
                          }}
                        >
                          {number}
                        </div>
                      </motion.div>

                      {/* Spacer (opposite side) */}
                      <div className="hidden lg:block flex-1" />
                    </motion.div>
                  )
                })}
              </div>
            </div>
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
              className="rounded-3xl overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-ocean)]" />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: 'radial-gradient(ellipse 60% 60% at 80% 50%, rgba(232,168,32,0.2), transparent)',
                }}
              />
              <div className="relative p-12 md:p-16 text-center">
                <h3 className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl lg:text-5xl text-white mb-4">
                  {t.howItWorks.cta.title}
                </h3>
                <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
                  {t.howItWorks.cta.subtitle}
                </p>
                <Link
                  to={langPath('/contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[var(--color-gold)] text-[var(--color-dark)] font-semibold text-base hover:bg-[var(--color-gold-light)] transition-colors duration-200"
                >
                  {t.howItWorks.cta.button}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  )
}
