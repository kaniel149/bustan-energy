import { useRef, useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSession, isAdmin } from '../lib/admin-auth'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Sun,
  Zap,
  Shield,
  TrendingUp,
  ChevronDown,
  ArrowRight,
  Phone,
  Building2,
  Home,
  Battery,
  MapPin,
  ChevronRight,
  MessageCircle,
} from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { Button } from '../components/ui/Button'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, homeBreadcrumb, faqSchema } from '../components/seo/schemas'

const SolarInstallationScroll = lazy(
  () => import('../components/SolarInstallationScroll')
)

// ─── Image paths ────────────────────────────────────────────────────────────
const aerialImg = '/assets/images/strategy-01-aerial.png'
const longiImg = '/assets/images/longi-panel.png'
const huaweiImg = '/assets/images/huawei-inverter.png'
const villaImg = '/assets/images/bizplan-05-villa.png'
const resortImg = '/assets/images/strategy-03-resort.png'
const installImg = '/assets/images/install-06-panel.png'
const happyImg = '/assets/images/sales-10-happy.png'
const monitorImg = '/assets/images/monitor-02-app.png'

// ─── Project images mapped to 6 items ───────────────────────────────────────
const projectImages = [villaImg, resortImg, aerialImg, happyImg, monitorImg, installImg]

type HomeHeroExtra = { trustLine?: string }
type HomeServicesExtra = {
  batteryStorage?: { title?: string; description?: string; cta?: string }
}
type ScrollAnimationCopy = { sectionTag?: string; title?: string; subtitle?: string }
type ProcessExtra = { statsLine?: string }
type ProjectExtra = { type?: string }
type ProjectsExtra = { viewAll?: string }
type FAQCopy = { items?: Array<{ question: string; answer: string }> }
type CTAExtra = { ctaWhatsapp?: string; ctaCall?: string; urgency?: string }

// ─── Animation variants ─────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

// ─── Animated counter ───────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════
// 1. HERO
// ═══════════════════════════════════════════════════════════════════════════
function HeroSection() {
  const { t } = useTranslation()
  const { langPath } = useLanguage()
  const hero = t.home.hero as typeof t.home.hero & HomeHeroExtra

  return (
    <section className="bustan-home-hero relative min-h-[86vh] flex flex-col items-center justify-center overflow-hidden px-0 pt-20 pb-16 text-shell/82">
      {/* Aerial background image */}
      <div className="absolute inset-0">
        <img
          src={aerialImg}
          alt="Aerial view of solar panels on Ko Phangan"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(36,70,62,0.66) 0%, rgba(36,70,62,0.46) 44%, rgba(244,234,216,0.92) 100%)',
          }}
        />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,244,226,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,244,226,0.55) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Hero content */}
      <motion.div
        className="relative z-10 text-center px-6 max-w-4xl mx-auto"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="mb-4">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: 'rgba(255,244,226,0.14)',
              border: '1px solid rgba(255,244,226,0.24)',
              color: 'var(--bustan-shell)',
            }}
          >
            <Sun size={14} />
            {t.home.hero.badge}
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-[48px] md:text-[64px] lg:text-[80px] leading-none tracking-tight mb-6"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--bustan-shell)' }}
        >
          {t.home.hero.title}
          <br />
          <span style={{ color: 'var(--bustan-sun)' }}>
            {t.home.hero.titleAccent}
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-lg md:text-xl text-shell/82 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          {t.home.hero.subtitle}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to={langPath('/contact')}>
            <motion.span
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold cursor-pointer select-none"
              style={{
                background: 'var(--bustan-lagoon)',
                color: 'var(--bustan-shell)',
              }}
              whileHover={{
                scale: 1.04,
                boxShadow: '0 18px 44px rgba(0,111,107,0.28)',
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {t.home.hero.ctaPrimary}
              <ArrowRight size={18} />
            </motion.span>
          </Link>

          <a href="https://wa.me/66946692011" target="_blank" rel="noopener noreferrer">
            <motion.span
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-medium cursor-pointer select-none"
              style={{
                background: 'rgba(255,244,226,0.12)',
                border: '1px solid rgba(255,244,226,0.32)',
                color: 'var(--bustan-shell)',
              }}
              whileHover={{
                scale: 1.03,
                borderColor: 'rgba(255,244,226,0.55)',
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <MessageCircle size={16} />
              {t.home.hero.ctaSecondary}
            </motion.span>
          </a>
        </motion.div>

        {/* Trust line */}
        {hero.trustLine && (
          <motion.p
            variants={fadeUp}
            className="mt-8 text-sm text-shell/82 tracking-wide"
          >
            {hero.trustLine}
          </motion.p>
        )}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 text-shell/82"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. STATS BAR
// ═══════════════════════════════════════════════════════════════════════════
function StatItem({
  target,
  suffix,
  label,
  started,
  icon,
}: {
  target: number
  suffix: string
  label: string
  started: boolean
  icon: React.ReactNode
}) {
  const value = useCountUp(target, 1800, started)
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-8">
      <div className="text-ink/72 mb-1">{icon}</div>
      <span
        className="text-4xl md:text-5xl font-bold tabular-nums"
        style={{ fontFamily: 'var(--font-serif)', color: 'var(--bustan-lagoon)' }}
      >
        {value}
        {suffix}
      </span>
      <span className="text-sm text-ink/72 text-center">{label}</span>
    </div>
  )
}

function StatsBar() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px 0px' })
  const { t } = useTranslation()
  const hero = t.home.hero as typeof t.home.hero & HomeHeroExtra

  const icons = [
    <Home size={20} key="h" />,
    <Zap size={20} key="z" />,
    <TrendingUp size={20} key="t" />,
    <MapPin size={20} key="m" />,
  ]
  const stats = [
    t.home.stats.installations,
    t.home.stats.installed,
    t.home.stats.savings,
    t.home.stats.experience,
  ]

  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{
        background: 'rgba(255,244,226,0.64)',
        borderTop: '1px solid rgba(36,70,62,0.12)',
        borderBottom: '1px solid rgba(36,70,62,0.12)',
      }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-grove/14">
        {stats.map((stat, i) => (
          <StatItem
            key={stat.label}
            target={stat.value}
            suffix={stat.suffix}
            label={stat.label}
            started={inView}
            icon={icons[i]}
          />
        ))}
      </div>
      {/* Trust line */}
      {hero.trustLine && (
        <div className="text-center pb-6 pt-2">
          <p className="text-xs text-ink/72 tracking-widest uppercase">
            {hero.trustLine}
          </p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SERVICES (4 cards with images)
// ═══════════════════════════════════════════════════════════════════════════
function ServicesSection() {
  const { t } = useTranslation()
  const { langPath } = useLanguage()
  const servicesCopy = t.home.services as typeof t.home.services & HomeServicesExtra

  const services = [
    {
      icon: <Home size={24} />,
      title: t.home.services.residential.title,
      description: t.home.services.residential.description,
      cta: t.home.services.residential.cta,
      href: langPath('/services#residential'),
      image: villaImg,
      altText: 'Residential solar panel installation on a villa roof in Ko Phangan',
      bullets: ['Reduce daytime grid consumption', 'Increase property resilience', 'Battery backup available'],
    },
    {
      icon: <Building2 size={24} />,
      title: t.home.services.commercial.title,
      description: t.home.services.commercial.description,
      cta: t.home.services.commercial.cta,
      href: langPath('/services#commercial'),
      image: resortImg,
      altText: 'Commercial solar system installed on a resort rooftop in Ko Phangan',
      bullets: ['PPA — zero upfront cost', 'Maximize ROI', 'Reduce operating costs'],
    },
    {
      icon: <Sun size={24} />,
      title: t.home.services.solarFarm.title,
      description: t.home.services.solarFarm.description,
      cta: t.home.services.solarFarm.cta,
      href: langPath('/services#farm'),
      image: aerialImg,
      altText: 'Aerial view of a solar farm installation on Ko Phangan island',
      bullets: ['VSPP licensing', 'Grid connection', '1 MW to 100 MW'],
    },
    {
      icon: <Battery size={24} />,
      title: servicesCopy.batteryStorage?.title ?? 'Battery Storage',
      description:
        servicesCopy.batteryStorage?.description ??
        'Blackout protection and 24/7 power independence.',
      cta: servicesCopy.batteryStorage?.cta ?? 'Learn More',
      href: langPath('/services#battery'),
      image: huaweiImg,
      altText: 'Huawei battery storage system for off-grid solar power on Ko Phangan',
      bullets: ['Blackout protection', '24/7 power', 'Peak shaving'],
    },
  ]

  return (
    <section className="py-24 px-6" id="services">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-sm font-medium tracking-widest uppercase mb-3"
            style={{ color: 'var(--bustan-lagoon)' }}
          >
            {t.home.services.sectionTag}
          </p>
          <h2
            className="text-4xl md:text-5xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Solar Energy Services on Ko Phangan
          </h2>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {services.map((svc) => (
            <motion.div
              key={svc.title}
              variants={fadeUp}
              className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer"
              style={{
                border: '1px solid rgba(36,70,62,0.13)',
              }}
              whileHover={{
                y: -4,
                borderColor: 'rgba(0,111,107,0.34)',
                boxShadow:
                  '0 22px 52px rgba(36,70,62,0.14), 0 0 0 1px rgba(0,111,107,0.10)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={svc.image}
                  alt={svc.altText}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(36,70,62,0.08) 0%, rgba(36,70,62,0.58) 100%)',
                  }}
                />
                {/* Icon badge */}
                <div
                  className="absolute top-4 left-4 w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255,244,226,0.72)',
                    border: '1px solid rgba(255,244,226,0.5)',
                    color: 'var(--bustan-lagoon)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {svc.icon}
                </div>
              </div>

              {/* Content */}
              <div
                className="flex flex-col flex-1 p-6"
                style={{
                  background: 'rgba(255,244,226,0.82)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <h3 className="text-xl font-semibold mb-2">{svc.title}</h3>
                <p className="text-ink/72 text-sm leading-relaxed mb-4">
                  {svc.description}
                </p>
                <ul className="flex flex-col gap-1.5 mb-5">
                  {svc.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-center gap-2 text-sm text-ink/72"
                    >
                      <ChevronRight
                        size={12}
                        style={{ color: 'var(--bustan-lagoon)' }}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to={svc.href}
                  className="inline-flex items-center gap-1.5 mt-auto text-sm font-medium transition-colors duration-200"
                  style={{ color: 'var(--bustan-lagoon)' }}
                >
                  {svc.cta}
                  <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SCROLL ANIMATION (integrated)
// ═══════════════════════════════════════════════════════════════════════════
function ScrollAnimationSection() {
  const { t } = useTranslation()
  const scrollData = (t.home as typeof t.home & { scrollAnimation?: ScrollAnimationCopy }).scrollAnimation

  return (
    <section>
      {/* Header */}
      <div
        className="py-16 px-6 text-center"
        style={{
          background:
            'linear-gradient(to bottom, var(--bustan-paper), var(--bustan-shell))',
        }}
      >
        <p
          className="text-sm font-medium tracking-widest uppercase mb-3"
          style={{ color: 'var(--bustan-lagoon)' }}
        >
          {scrollData?.sectionTag ?? 'SEE THE PROCESS'}
        </p>
        <h2
          className="text-4xl md:text-5xl text-ink"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {scrollData?.title ?? 'Watch Your Solar System Come to Life'}
        </h2>
        <p className="text-gray-500 text-base mt-3 max-w-xl mx-auto">
          {scrollData?.subtitle ??
            'Scroll through a real installation — from bare roof to fully powered solar system'}
        </p>
      </div>

      {/* The scroll component */}
      <Suspense
        fallback={
          <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bustan-shell)' }}>
            <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid rgba(36,70,62,0.18)', borderTopColor: 'var(--bustan-lagoon)' }} />
          </div>
        }
      >
        <SolarInstallationScroll />
      </Suspense>

      {/* Transition back to the warm site canvas */}
      <div
        className="h-24"
        style={{
          background: 'linear-gradient(to bottom, var(--bustan-shell), var(--bustan-paper))',
        }}
      />
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. WHY BUSTAN ENERGY (split layout)
// ═══════════════════════════════════════════════════════════════════════════
const whyIcons = [
  <MapPin size={22} key="1" />,
  <Shield size={22} key="2" />,
  <Sun size={22} key="3" />,
  <Zap size={22} key="4" />,
]

function WhySection() {
  const { t } = useTranslation()

  return (
    <section
      className="py-24 px-6"
      style={{
        background:
          'linear-gradient(180deg, rgba(216,236,232,0.34) 0%, rgba(244,234,216,0) 62%)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-sm font-medium tracking-widest uppercase mb-3"
            style={{ color: 'var(--bustan-lagoon)' }}
          >
            {t.home.why.sectionTag}
          </p>
          <h2
            className="text-4xl md:text-5xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t.home.why.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — image */}
          <motion.div
            className="relative rounded-2xl overflow-hidden"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <img
              src={installImg}
              alt="Solar panel installation on Ko Phangan roof"
              className="w-full h-[400px] lg:h-[500px] object-cover"
              loading="lazy"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(36,70,62,0.54) 0%, transparent 55%)',
              }}
            />
            {/* Badge */}
            <div
              className="absolute bottom-6 left-6 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{
                background: 'rgba(255,244,226,0.9)',
                color: 'var(--bustan-grove)',
              }}
            >
              8+ Years Serving Ko Phangan
            </div>
          </motion.div>

          {/* Right — features */}
          <motion.div
            className="flex flex-col gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {t.home.why.items.map((feat, i) => (
              <motion.div
                key={feat.title}
                variants={fadeUp}
                className="flex gap-5 p-6 rounded-2xl"
                style={{
                  background: 'rgba(255,244,226,0.76)',
                  border: '1px solid rgba(36,70,62,0.12)',
                }}
              >
                <div
                  className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-0.5"
                  style={{
                    background: 'rgba(216,236,232,0.72)',
                    color: 'var(--bustan-lagoon)',
                    border: '1px solid rgba(0,111,107,0.16)',
                  }}
                >
                  {whyIcons[i]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1.5">{feat.title}</h3>
                  <p className="text-ink/72 text-sm leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. PROCESS
// ═══════════════════════════════════════════════════════════════════════════
const stepNums = ['01', '02', '03', '04']

function ProcessSection() {
  const { t } = useTranslation()
  const { langPath } = useLanguage()
  const processCopy = t.home.process as typeof t.home.process & ProcessExtra

  return (
    <section className="py-24 px-6" id="process">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <p
            className="text-sm font-medium tracking-widest uppercase mb-3"
            style={{ color: 'var(--bustan-lagoon)' }}
          >
            {t.home.process.sectionTag}
          </p>
          <h2
            className="text-4xl md:text-5xl mb-3"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t.home.process.title}
          </h2>
          <p className="text-ink/72 text-base">{t.home.process.subtitle}</p>
        </div>

        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-0 relative"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-[34px] left-[12.5%] right-[12.5%] h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(0,111,107,0.28) 20%, rgba(0,111,107,0.28) 80%, transparent)',
            }}
          />

          {t.home.process.steps.map((step, i) => (
            <motion.div
              key={stepNums[i]}
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, delay: i * 0.14 },
                },
              }}
              className="flex flex-col items-center text-center px-6 pb-8 md:pb-0 relative"
            >
              {i < t.home.process.steps.length - 1 && (
                <div
                  className="md:hidden absolute left-1/2 -translate-x-1/2 top-[68px] w-px h-full"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(0,111,107,0.28), transparent)',
                  }}
                />
              )}
              <div
                className="w-[68px] h-[68px] rounded-full flex items-center justify-center text-xl font-bold mb-5 relative z-10"
                style={{
                  background: 'rgba(255,244,226,0.84)',
                  border: '2px solid rgba(0,111,107,0.32)',
                  color: 'var(--bustan-lagoon)',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                {stepNums[i]}
              </div>
              <h3 className="text-base font-semibold mb-2">{step.title}</h3>
              <p className="text-ink/72 text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats line */}
        {processCopy.statsLine && (
          <div className="mt-10 text-center">
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--bustan-lagoon)' }}
            >
              {processCopy.statsLine}
            </p>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Link to={langPath('/contact')}>
            <motion.span
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold cursor-pointer select-none"
              style={{
                background: 'var(--bustan-lagoon)',
                color: 'var(--bustan-shell)',
              }}
              whileHover={{
                scale: 1.04,
                boxShadow: '0 18px 44px rgba(0,111,107,0.22)',
              }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {t.home.process.cta}
              <ArrowRight size={18} />
            </motion.span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. PROJECTS GALLERY (6 items)
// ═══════════════════════════════════════════════════════════════════════════
function ProjectsSection() {
  const { t } = useTranslation()
  const { langPath } = useLanguage()
  const projectsCopy = t.home.projects as typeof t.home.projects & ProjectsExtra

  return (
    <section className="py-24 px-6" id="work">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p
            className="text-sm font-medium tracking-widest uppercase mb-3"
            style={{ color: 'var(--bustan-lagoon)' }}
          >
            {t.home.projects.sectionTag}
          </p>
          <h2
            className="text-4xl md:text-5xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t.home.projects.title}
          </h2>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {t.home.projects.items.map((proj, i) => {
            const project = proj as typeof proj & ProjectExtra
            return (
            <motion.div
              key={project.name}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-2xl"
              style={{ border: '1px solid rgba(36,70,62,0.13)' }}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              {/* Image */}
              <div className="relative h-56 overflow-hidden">
                <img
                  src={projectImages[i % projectImages.length]}
                  alt={`Solar panel installation ${project.name} ${project.location} Ko Phangan`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(36,70,62,0.06) 0%, rgba(36,70,62,0.58) 100%)',
                  }}
                />
                {/* Savings badge */}
                <div
                  className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: 'rgba(242,184,75,0.92)',
                    color: 'var(--bustan-grove)',
                  }}
                >
                  Site-modeled
                </div>
                {/* Type badge */}
                {project.type && (
                  <div
                    className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: 'rgba(255,244,226,0.16)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,244,226,0.3)',
                      color: 'var(--bustan-shell)',
                    }}
                  >
                    {project.type}
                  </div>
                )}
              </div>

              {/* Details */}
              <div
                className="px-6 py-5"
                style={{
                  background: 'rgba(255,244,226,0.88)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-ink/72 text-sm flex items-center gap-1">
                    <MapPin size={12} />
                    {project.location}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--bustan-lagoon)' }}
                  >
                    {project.size}
                  </span>
                </div>
              </div>
            </motion.div>
          )})}
        </motion.div>

        {projectsCopy.viewAll && (
          <div className="mt-10 flex justify-center">
            <Button variant="ghost" size="sm" to={langPath('/projects')} icon={null}>
              {projectsCopy.viewAll}
              <ArrowRight size={14} />
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. FAQ (accordion)
// ═══════════════════════════════════════════════════════════════════════════
function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,244,226,0.74)',
        border: isOpen
          ? '1px solid rgba(0,111,107,0.28)'
          : '1px solid rgba(36,70,62,0.12)',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
      >
        <span className="text-base font-medium pr-4">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
          style={{ color: 'var(--bustan-lagoon)' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm text-ink/74 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FAQSection() {
  const { t } = useTranslation()
  const faqData = (t.home as typeof t.home & { faq?: FAQCopy }).faq
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (!faqData?.items?.length) return null

  return (
    <section className="py-24 px-6" id="faq">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p
            className="text-sm font-medium tracking-widest uppercase mb-3"
            style={{ color: 'var(--bustan-lagoon)' }}
          >
            {faqData.sectionTag}
          </p>
          <h2
            className="text-4xl md:text-5xl"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {faqData.title}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqData.items.map(
            (item: { question: string; answer: string }, i: number) => (
              <FAQItem
                key={i}
                question={item.question}
                answer={item.answer}
                isOpen={openIndex === i}
                onToggle={() =>
                  setOpenIndex(openIndex === i ? null : i)
                }
              />
            )
          )}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. FINAL CTA
// ═══════════════════════════════════════════════════════════════════════════
function CTASection() {
  const { t } = useTranslation()
  const { langPath } = useLanguage()
  const cta = t.home.cta as typeof t.home.cta & CTAExtra

  return (
    <section className="py-28 px-6" id="contact">
      <div
        className="max-w-3xl mx-auto rounded-3xl text-center px-8 py-16 relative overflow-hidden"
        style={{
          background: 'rgba(255,244,226,0.82)',
          border: '1px solid rgba(36,70,62,0.14)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Soft lagoon glow */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 110%, rgba(0,111,107,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <p
            className="text-sm font-medium tracking-widest uppercase mb-4"
            style={{ color: 'var(--bustan-lagoon)' }}
          >
            {t.home.cta.sectionTag}
          </p>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl mb-5 leading-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {t.home.cta.title}
          </h2>
          <p className="text-ink/74 text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            {t.home.cta.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary CTA */}
            <Link to={langPath('/contact')}>
              <motion.span
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold cursor-pointer select-none"
                style={{
                  background: 'var(--bustan-lagoon)',
                  color: 'var(--bustan-shell)',
                }}
                whileHover={{
                  scale: 1.04,
                  boxShadow: '0 18px 44px rgba(0,111,107,0.22)',
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {t.home.cta.ctaPrimary}
                <ArrowRight size={18} />
              </motion.span>
            </Link>

            {/* WhatsApp */}
            <a href="https://wa.me/66946692011" target="_blank" rel="noopener noreferrer">
              <motion.span
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-medium cursor-pointer select-none"
                style={{
                  background: 'rgba(216,236,232,0.7)',
                  border: '1px solid rgba(0,111,107,0.22)',
                  color: 'var(--bustan-lagoon)',
                }}
                whileHover={{
                  scale: 1.03,
                  borderColor: 'rgba(0,111,107,0.36)',
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <MessageCircle size={16} />
                {cta.ctaWhatsapp ?? 'WhatsApp Us'}
              </motion.span>
            </a>

            {/* Call */}
            <a href="tel:+66946692011">
              <motion.span
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-medium cursor-pointer select-none"
                style={{
                  background: 'rgba(36,70,62,0.08)',
                  border: '1px solid rgba(36,70,62,0.18)',
                  backdropFilter: 'blur(12px)',
                  color: 'var(--bustan-grove)',
                }}
                whileHover={{
                  scale: 1.03,
                  borderColor: 'rgba(36,70,62,0.34)',
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Phone size={16} />
                {cta.ctaCall ?? 'Call Now'}
              </motion.span>
            </a>
          </div>

          {/* Urgency line */}
          {cta.urgency && (
            <p className="mt-6 text-sm text-ink/72">
              {cta.urgency}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. PARTNERS BAR
// ═══════════════════════════════════════════════════════════════════════════
function PartnersBar() {
  const { t } = useTranslation()
  const partnerImages = [longiImg, huaweiImg, null]

  return (
    <section
      className="py-14 px-6"
      style={{
        borderTop: '1px solid rgba(36,70,62,0.12)',
        background: 'rgba(255,244,226,0.58)',
      }}
    >
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs font-medium tracking-widest uppercase text-ink/72 mb-10">
          {t.home.partners.title}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-12">
          {t.home.partners.items.map((p, i) => (
            <div
              key={p.name}
              className="flex flex-col items-center gap-3 opacity-40 hover:opacity-70 transition-opacity duration-300"
            >
              {partnerImages[i] ? (
                <img
                  src={partnerImages[i]!}
                  alt={`${p.name} — official solar equipment partner of Bustan Energy`}
                  loading="lazy"
                  className="h-10 w-auto object-contain grayscale opacity-75"
                />
              ) : (
                <div className="h-10 flex items-center">
                  <span className="text-2xl font-bold tracking-tight text-ink">
                    PEA
                  </span>
                </div>
              )}
              <div className="text-center">
                <p className="text-xs font-semibold text-ink/86">{p.name}</p>
                <p className="text-[11px] text-ink/72">{p.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Local SEO signal */}
        <p className="text-center text-xs text-ink/72 mt-8">
          Serving Ko Phangan, Ko Samui, and Surat Thani Province
        </p>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SEO SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════
function howToSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How Solar Installation Works on Ko Phangan',
    description:
      'Step-by-step guide to getting solar panels installed on your home or business in Ko Phangan, Thailand.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Free Site Survey',
        text: 'We visit your property, assess roof orientation, shading, and energy usage.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Custom Design',
        text: 'Solar system designed specifically for your home or business on Ko Phangan.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Professional Installation',
        text: 'PEA-certified team installs your system, typically 1-3 days.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Monitor & Maintain',
        text: 'Real-time app monitoring, handover guidance, and ongoing support.',
      },
    ],
    totalTime: 'P14D',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const { t, lang } = useTranslation()
  const faqData = (t.home as typeof t.home & { faq?: FAQCopy }).faq
  const navigate = useNavigate()
  const [showAdminBanner, setShowAdminBanner] = useState(false)

  // If admin is logged in, auto-redirect to /admin (once)
  useEffect(() => {
    let cancelled = false
    getSession().then((session) => {
      if (cancelled || !session?.user?.email) return
      if (!isAdmin(session.user.email)) return
      // Don't auto-redirect if user explicitly came to home (e.g. via nav click)
      if (sessionStorage.getItem('bustan_admin_skip_redirect') === '1') {
        setShowAdminBanner(true)
        return
      }
      sessionStorage.setItem('bustan_admin_skip_redirect', '1')
      navigate('/admin', { replace: true })
    })
    return () => {
      cancelled = true
    }
  }, [navigate])

  // Build FAQ schema from translation data
  const faqItems = faqData?.items ?? []
  const schemas = [
    breadcrumbSchema(homeBreadcrumb(lang)),
    howToSchema(),
    ...(faqItems.length > 0 ? [faqSchema(faqItems)] : []),
  ]

  return (
    <>
      {showAdminBanner && (
        <div style={{position:'fixed',top:0,left:0,right:0,zIndex:10000,background:'linear-gradient(135deg,var(--bustan-lagoon),var(--bustan-papaya))',color:'var(--bustan-shell)',padding:'12px 20px',textAlign:'center',fontWeight:700,fontFamily:'Heebo,sans-serif'}}>
          אתה מחובר כאדמין · <a href="/admin" style={{color:'var(--bustan-shell)',textDecoration:'underline',fontWeight:900}}>לחץ כאן לעבור לדשבורד האדמין ←</a>
        </div>
      )}
      <SEOHead
        title={
          lang === 'th'
            ? 'ติดตั้งโซลาร์เซลล์เกาะพะงัน — โซลาร์เซลล์บ้าน รีสอร์ท ธุรกิจ'
            : 'Solar Panel Installation Ko Phangan — Homes, Villas & Resorts'
        }
        description={
          lang === 'th'
            ? 'Bustan Energy ผู้เชี่ยวชาญโซลาร์บนเกาะพะงันและเกาะสมุย วิเคราะห์บิล สำรวจหน้างาน ออกแบบระบบ และยื่นเอกสาร กฟภ. สำหรับบ้าน วิลล่า และธุรกิจ'
            : 'Bustan Energy — solar design, EPC, PPA, PEA coordination, and O&M for homes, villas, resorts, and businesses on Ko Phangan and nearby islands.'
        }
        path="/"
        lang={lang}
        schema={schemas}
      />
      <div
        className="bustan-home min-h-screen"
        style={{ background: 'var(--bustan-paper)', color: 'var(--bustan-ink)' }}
      >
        <HeroSection />
        <StatsBar />
        <ServicesSection />
        <ScrollAnimationSection />
        <WhySection />
        <ProcessSection />
        <ProjectsSection />
        <FAQSection />
        <CTASection />
        <PartnersBar />
      </div>
    </>
  )
}
