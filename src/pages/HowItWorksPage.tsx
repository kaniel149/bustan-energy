import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ClipboardCheck, PenLine, Wrench, BarChart3, Zap } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { serviceSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import {
  fadeUp,
  stagger,
  revealViewport,
  cardHover,
  ServiceHero,
  ServiceCTA,
  IconTile,
} from './services/shared'

const stepIcons = [ClipboardCheck, PenLine, Wrench, BarChart3]
const stepNumbers = ['01', '02', '03', '04']

// Numbered timeline node — serif number, grove/ocean treatment. Solid shell
// disc so it masks the connecting line passing behind it.
function StepNode({ number, className = '' }: { number: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-grove/20 bg-shell font-serif text-ocean shadow-soft ${className}`}
    >
      {number}
    </div>
  )
}

export default function HowItWorksPage() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()

  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
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

      {/* Hero — mount-animated, never scroll-gated */}
      <ServiceHero
        icon={<Zap size={14} strokeWidth={1.5} aria-hidden />}
        badge={t.howItWorks.hero.tag}
        title={t.howItWorks.hero.title}
        subtitle={t.howItWorks.hero.subtitle}
      />

      {/* Steps — vertical timeline.
          AUDIT FIX (mobile overflow): the old page animated alternating cards
          with fadeLeft/fadeRight (initial x: ±40). The x:+40 cards extended
          scrollWidth to 406px on a 390px viewport (390 − 24px padding + 40px
          translate). Steps now reveal with fadeUp only (no horizontal
          translate), and the section carries overflow-x-clip as a guard. */}
      <section className="py-12 pb-28 overflow-x-clip">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative">
            {/* Connecting line — desktop center spine */}
            <div
              aria-hidden
              className="hidden lg:block absolute left-1/2 top-8 bottom-8 -translate-x-1/2 border-l border-grove/14"
            />
            {/* Connecting line — mobile left rail */}
            <div
              aria-hidden
              className="lg:hidden absolute left-7 top-8 bottom-8 border-l border-grove/14"
            />

            <div className="space-y-10 lg:space-y-8">
              {t.howItWorks.steps.map((step, index) => {
                const Icon = stepIcons[index]
                const isEven = index % 2 === 0
                const number = stepNumbers[index]

                return (
                  <motion.div
                    key={number}
                    initial="hidden"
                    whileInView="visible"
                    viewport={revealViewport}
                    variants={stagger}
                    className={`relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12 pl-20 lg:pl-0 ${isEven ? '' : 'lg:flex-row-reverse'}`}
                  >
                    {/* Timeline node — mobile (left rail) */}
                    <motion.div variants={fadeUp} className="lg:hidden absolute left-0 top-1">
                      <StepNode number={number} className="h-14 w-14 text-xl" />
                    </motion.div>

                    {/* Content card */}
                    <motion.div variants={fadeUp} className="flex-1 w-full">
                      {/* Hover transforms live on this plain inner div (never the motion.div) */}
                      <div
                        className={`rounded-card border border-grove/14 bg-shell/76 p-6 md:p-8 shadow-soft hover:border-ocean/30 ${cardHover}`}
                      >
                        <div className="flex items-start gap-5 mb-6">
                          <IconTile>
                            <Icon size={22} strokeWidth={1.5} aria-hidden />
                          </IconTile>
                          <div>
                            <span className="text-xs font-bold tracking-widest uppercase text-ocean">
                              Step {number}
                            </span>
                            <h3 className="font-serif text-2xl md:text-3xl text-ink mt-1">
                              {step.title}
                            </h3>
                          </div>
                        </div>

                        <p className="text-ink/74 text-base leading-relaxed mb-6">{step.description}</p>

                        <div className="flex items-center gap-2 pt-4 border-t border-grove/14">
                          <span className="text-xs text-ink/55 uppercase tracking-wider">Timeline:</span>
                          <span className="text-sm font-semibold text-ocean">
                            {step.duration}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Timeline node — desktop (center spine) */}
                    <motion.div variants={fadeUp} className="hidden lg:flex shrink-0 relative z-10">
                      <StepNode number={number} className="h-16 w-16 text-2xl" />
                    </motion.div>

                    {/* Spacer (opposite side) */}
                    <div className="hidden lg:block flex-1" aria-hidden />
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <ServiceCTA
        title={t.howItWorks.cta.title}
        subtitle={t.howItWorks.cta.subtitle}
        primaryLabel={t.howItWorks.cta.button}
        primaryTo={langPath('/contact')}
      />
    </div>
  )
}
