import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Shield, Users, Eye, Lightbulb, Sun } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { organizationSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'
import { SectionHeader } from '../components/ui/SectionHeader'
import {
  fadeUp,
  stagger,
  heroStagger,
  revealViewport,
  cardHover,
  Divider,
  IconTile,
  ServiceCTA,
} from './services/shared'

const valueIcons = [Shield, Users, Eye, Lightbulb]

// ─── Animated counter (HomePage StatsBar pattern) ────────────────────────────
// Eased rAF count-up, gated on a `started` flag so the trigger logic lives in
// one place (the stats section), not per-counter.
function useCountUp(target: number, duration = 1800, started = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!started) return
    const startTime = performance.now()
    let frame: number
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [started, target, duration])
  return value
}

function StatCounter({
  value,
  suffix,
  label,
  started,
}: {
  value: number
  suffix: string
  label: string
  started: boolean
}) {
  const current = useCountUp(value, 1800, started)
  return (
    <div className="text-center">
      <div className="font-serif text-5xl md:text-6xl tabular-nums text-gold mb-2">
        {current}
        {suffix}
      </div>
      <div className="text-shell/82 text-sm uppercase tracking-wider">{label}</div>
    </div>
  )
}

// Stats section — the one grove dark accent section on this page.
// AUDIT FIX: the old page gated counters on useInView({ margin: '-80px' }) AND
// wrapped the whole section in a whileInView opacity stagger, so on mobile the
// numbers could sit at "0+ / 0MW / 0" indefinitely. Now: the container is never
// opacity-gated, the trigger uses amount: 0.3 (reliable), and a timed fallback
// guarantees final values always render even if the observer never fires.
function StatsSection({
  counters,
}: {
  counters: { value: number; suffix: string; label: string }[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setFallback(true), 2500)
    return () => window.clearTimeout(id)
  }, [])

  const started = inView || fallback

  return (
    <section className="py-20 px-6">
      <div
        ref={ref}
        className="relative max-w-7xl mx-auto overflow-hidden rounded-card bg-grove px-6 py-14 md:py-16 shadow-float"
      >
        {/* Soft lagoon glow rising from the base */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 110%, rgba(0,143,138,0.20) 0%, transparent 70%)',
          }}
        />
        <div className="relative">
          <h2 className="font-serif text-display-sm md:text-display-md leading-[1.1] text-shell text-center mb-12">
            By The Numbers
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {counters.map((c) => (
              <StatCounter
                key={c.label}
                value={c.value}
                suffix={c.suffix}
                label={c.label}
                started={started}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function AboutPage() {
  const { t, lang } = useTranslation()
  const { langPath } = useLanguage()
  const p = t.about

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const counters = [
    { value: p.stats.systems.value, suffix: p.stats.systems.suffix, label: p.stats.systems.label },
    { value: p.stats.capacity.value, suffix: p.stats.capacity.suffix, label: p.stats.capacity.label },
    { value: p.stats.years.value, suffix: p.stats.years.suffix, label: p.stats.years.label },
    { value: p.stats.incidents.value, suffix: p.stats.incidents.suffix, label: p.stats.incidents.label },
  ]

  return (
    <div className="min-h-screen bg-[var(--bustan-paper)] text-ink">
      <SEOHead
        title={t.seo.about.title}
        description={t.seo.about.description}
        path="/about"
        lang={lang}
        schema={[
          organizationSchema(),
          breadcrumbSchema(pageBreadcrumb(lang, p.hero.tag, '/about')),
        ]}
      />

      {/* Hero — mount-animated (ServiceHero pattern, no subtitle on this page) */}
      <section className="relative overflow-hidden px-6 pt-32 pb-20">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-mist/55 via-mist/20 to-transparent"
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div variants={heroStagger} initial="hidden" animate="visible" className="space-y-6">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-ocean/20 bg-shell/70 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-ocean">
                <Sun size={14} strokeWidth={1.5} aria-hidden />
                {p.hero.tag}
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-serif text-display-md sm:text-display-lg md:text-display-xl leading-[1.05] tracking-tight text-ink"
            >
              {p.hero.title}
            </motion.h1>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={stagger}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          >
            <motion.div variants={fadeUp}>
              <img
                src="/assets/images/strategy-01-aerial.png"
                alt="Aerial view of Ko Phangan island showing solar energy potential across tropical rooftops"
                width={1024}
                height={574}
                loading="lazy"
                className="w-full h-[420px] object-cover rounded-card shadow-lift"
              />
            </motion.div>

            <motion.div variants={stagger} className="space-y-6">
              <motion.h2
                variants={fadeUp}
                className="font-serif text-display-sm md:text-display-md leading-[1.1] text-ink"
              >
                {p.story.title}
              </motion.h2>

              {p.story.paragraphs.map((paragraph, i) => (
                <motion.p key={i} variants={fadeUp} className="text-ink/74 text-lg leading-relaxed">
                  {paragraph}
                </motion.p>
              ))}

              <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="rounded-card border border-grove/14 bg-shell/76 p-5 shadow-soft">
                  <div className="text-ocean text-xs uppercase tracking-widest font-bold mb-2">Mission</div>
                  <p className="text-ink/74 text-sm leading-relaxed">
                    {p.mission}
                  </p>
                </div>
                <div className="rounded-card border border-grove/14 bg-shell/76 p-5 shadow-soft">
                  <div className="text-ocean text-xs uppercase tracking-widest font-bold mb-2">Vision</div>
                  <p className="text-ink/74 text-sm leading-relaxed">
                    {p.vision}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Divider />

      {/* Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeader title={p.values.title} className="mb-14" />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {p.values.items.map((v, i) => {
              const Icon = valueIcons[i] ?? Shield
              return (
                <motion.div key={v.title} variants={fadeUp} className="h-full">
                  {/* Hover transforms live on this plain inner div (never the motion.div) */}
                  <div
                    className={`h-full rounded-card border border-grove/14 bg-shell/76 p-6 shadow-soft hover:border-ocean/30 ${cardHover}`}
                  >
                    <IconTile className="mb-5">
                      <Icon size={22} strokeWidth={1.5} aria-hidden />
                    </IconTile>
                    <h3 className="text-lg font-semibold text-ink mb-2">{v.title}</h3>
                    <p className="text-ink/60 text-sm leading-relaxed">{v.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Numbers — grove dark accent section (counters never stay hidden) */}
      <StatsSection counters={counters} />

      {/* Team photo / visual */}
      <section className="py-4 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={fadeUp}
            className="relative rounded-card overflow-hidden shadow-lift"
          >
            <img
              src="/assets/images/sales-10-happy.png"
              alt="Bustan Energy solar installation team on Ko Phangan ready for a commercial project"
              width={1024}
              height={574}
              loading="lazy"
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-grove/75 via-grove/25 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-shell/82 text-sm mb-2 uppercase tracking-wider">Meet the team</p>
              <p className="text-shell text-xl font-medium max-w-lg">
                Local experts committed to making solar accessible for every property on the island.
              </p>
            </div>
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
