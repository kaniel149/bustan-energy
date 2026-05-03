import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Shield, Users, Eye, Lightbulb, ArrowRight, Sun } from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { organizationSchema, breadcrumbSchema, pageBreadcrumb } from '../components/seo/schemas'

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const valueIcons = [Shield, Users, Eye, Lightbulb]
const valueColors = ['#E8A820', '#2E7D32', '#0A3D5C', '#E8A820']

function AnimatedCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!inView) return
    const duration = 1800
    const steps = 60
    const increment = value / steps
    let step = 0
    const timer = setInterval(() => {
      step++
      setCurrent(Math.min(Math.round(increment * step), value))
      if (step >= steps) clearInterval(timer)
    }, duration / steps)
    return () => clearInterval(timer)
  }, [inView, value])

  return (
    <div ref={ref} className="text-center">
      <div className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl text-[var(--color-gold)] mb-2">
        {current}{suffix}
      </div>
      <div className="text-white/40 text-sm uppercase tracking-wider">{label}</div>
    </div>
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
    <div className="min-h-screen bg-[var(--color-dark)]">
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

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-[var(--color-dark)] to-[var(--color-dark)]" />
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(46,125,50,0.35), transparent)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/10">
                <Sun className="w-3.5 h-3.5" />
                {p.hero.tag}
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-white max-w-4xl mx-auto leading-tight"
            >
              {p.hero.title}
            </motion.h1>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <motion.div variants={fadeUp}>
              <img
                src="/assets/images/strategy-01-aerial.png"
                alt="Aerial view of Ko Phangan island showing solar energy potential across tropical rooftops"
                loading="lazy"
                className="w-full h-[480px] object-cover rounded-3xl"
              />
            </motion.div>

            <motion.div variants={stagger} className="space-y-6">
              <motion.h2 variants={fadeUp} className="font-[family-name:var(--font-serif)] text-4xl md:text-5xl text-white leading-tight">
                {p.story.title}
              </motion.h2>

              {p.story.paragraphs.map((paragraph, i) => (
                <motion.p key={i} variants={fadeUp} className="text-white/55 text-lg leading-relaxed">
                  {paragraph}
                </motion.p>
              ))}

              <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-[var(--color-gold)] text-xs uppercase tracking-widest font-bold mb-2">Mission</div>
                  <p className="text-white/65 text-sm leading-relaxed">
                    {p.mission}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-[var(--color-gold)] text-xs uppercase tracking-widest font-bold mb-2">Vision</div>
                  <p className="text-white/65 text-sm leading-relaxed">
                    {p.vision}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white text-center mb-12"
            >
              {p.values.title}
            </motion.h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {p.values.items.map((v, i) => {
                const Icon = valueIcons[i] ?? Shield
                const color = valueColors[i] ?? '#E8A820'
                return (
                  <motion.div
                    key={v.title}
                    variants={fadeUp}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors duration-300 group"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${color}15`, border: `1px solid ${color}35` }}
                    >
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">{v.title}</h3>
                    <p className="text-white/45 text-sm leading-relaxed">{v.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Numbers */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="font-[family-name:var(--font-serif)] text-3xl md:text-4xl text-white text-center mb-16"
            >
              By The Numbers
            </motion.h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {counters.map((c) => (
                <AnimatedCounter key={c.label} value={c.value} suffix={c.suffix} label={c.label} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team photo / visual */}
      <section className="py-16 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="relative rounded-3xl overflow-hidden"
          >
            <img
              src="/assets/images/sales-10-happy.png"
              alt="Bustan Energy solar installation team on Ko Phangan ready for a commercial project"
              loading="lazy"
              className="w-full h-[400px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117]/70 via-[#0D1117]/20 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
              <p className="text-white/50 text-sm mb-2 uppercase tracking-wider">Meet the team</p>
              <p className="text-white text-xl font-medium max-w-lg">
                Local experts committed to making solar accessible for every property on the island.
              </p>
            </div>
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
