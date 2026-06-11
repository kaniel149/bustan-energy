import { useRef, useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSession, isAdmin } from '../lib/admin-auth'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
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
} from 'lucide-react'
import { useTranslation } from '../i18n/useTranslation'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useLanguage } from '../i18n/useLanguage'
import { SEOHead } from '../components/seo/SEOHead'
import { breadcrumbSchema, homeBreadcrumb, faqSchema } from '../components/seo/schemas'

const SolarInstallationScroll = lazy(
  () => import('../components/SolarInstallationScroll')
)

// ─── Image paths (intrinsic dimensions for CLS prevention) ──────────────────
const aerialImg = '/assets/images/strategy-01-aerial.png' // 1024×574
const longiImg = '/assets/images/longi-panel.png' // 1024×1024
const huaweiImg = '/assets/images/huawei-inverter.png' // 1024×680
const villaImg = '/assets/images/bizplan-05-villa.png' // 1024×510
const resortImg = '/assets/images/strategy-03-resort.png' // 1024×681
const installImg = '/assets/images/install-06-panel.png' // 1024×508
const happyImg = '/assets/images/sales-10-happy.png' // 1024×574
const monitorImg = '/assets/images/monitor-02-app.png' // 1024×678

// ─── Project images mapped to 6 items ───────────────────────────────────────
const projectImages = [
  { src: villaImg, width: 1024, height: 510 },
  { src: resortImg, width: 1024, height: 681 },
  { src: aerialImg, width: 1024, height: 574 },
  { src: happyImg, width: 1024, height: 574 },
  { src: monitorImg, width: 1024, height: 678 },
  { src: installImg, width: 1024, height: 508 },
]

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
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const heroStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

// Standard scroll-reveal viewport — below-the-fold sections only.
const revealViewport = { once: true, margin: '-80px' } as const

// Shared micro-interaction classes
const cardHover =
  'transition-all duration-[var(--duration-fast)] ease-out-soft hover:-translate-y-0.5 hover:shadow-lift'
const arrowSlide =
  'transition-transform duration-[var(--duration-fast)] ease-out-soft group-hover:translate-x-1'

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

  return (
    <section className="bustan-home-hero relative min-h-[86vh] flex flex-col items-center justify-center overflow-hidden px-0 pt-20 pb-16 text-shell/82">
      {/* Aerial background image */}
      <div className="absolute inset-0">
        <img
          src={aerialImg}
          alt="Aerial view of solar panels on Ko Phangan"
          width={1024}
          height={574}
          className="w-full h-full object-cover"
        />
        {/* Grove overlay — deepened behind the text area so headline + subtitle pass contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-grove/85 via-grove/68 via-60% to-sand/92" />
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

      {/* Hero content — animates on mount (above the fold, never scroll-gated) */}
      <motion.div
        className="relative z-10 text-center px-6 max-w-4xl mx-auto"
        variants={heroStagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="mb-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-shell/25 bg-shell/15 px-4 py-1.5 text-sm font-medium text-shell">
            <Sun size={14} aria-hidden />
            {t.home.hero.badge}
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-serif text-display-md sm:text-display-lg md:text-display-xl leading-[1.05] tracking-tight text-shell mb-6"
        >
          {t.home.hero.title}
          <br />
          <span className="text-gold">{t.home.hero.titleAccent}</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-lg md:text-xl text-shell/90 max-w-3xl mx-auto mb-10 leading-relaxed"
        >
          {t.home.hero.subtitle}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            variant="primary"
            size="lg"
            to={langPath('/contact')}
            className="group w-full sm:w-auto shadow-lift"
          >
            {t.home.hero.ctaPrimary}
            <ArrowRight size={18} className={arrowSlide} aria-hidden />
          </Button>

          <Button
            variant="whatsapp"
            size="lg"
            href="https://wa.me/66946692011"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            {t.home.hero.ctaSecondary}
          </Button>
        </motion.div>

        {/* Trust line shown in StatsBar below (was duplicated here — lowest-contrast spot in hero) */}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 text-grove/50"
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
      <div className="text-ink/45 mb-1">{icon}</div>
      <span className="font-serif text-4xl md:text-5xl font-bold tabular-nums text-ocean">
        {value}
        {suffix}
      </span>
      <span className="text-sm text-ink/60 text-center">{label}</span>
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
    <div ref={ref} className="relative overflow-hidden border-y border-grove/12 bg-shell/64">
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
          <p className="text-xs text-ink/50 tracking-widest uppercase">
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
      imgWidth: 1024,
      imgHeight: 510,
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
      imgWidth: 1024,
      imgHeight: 681,
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
      imgWidth: 1024,
      imgHeight: 574,
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
      imgWidth: 1024,
      imgHeight: 680,
      altText: 'Huawei battery storage system for off-grid solar power on Ko Phangan',
      bullets: ['Blackout protection', '24/7 power', 'Peak shaving'],
    },
  ]

  return (
    <section className="py-24 px-6" id="services">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag={t.home.services.sectionTag}
          title="Solar Energy Services on Ko Phangan"
          className="mb-16"
        />

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
        >
          {services.map((svc) => (
            <motion.div key={svc.title} variants={fadeUp}>
              <div
                className={`group relative flex h-full flex-col overflow-hidden rounded-card border border-grove/14 shadow-soft hover:border-ocean/30 ${cardHover}`}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={svc.image}
                    alt={svc.altText}
                    width={svc.imgWidth}
                    height={svc.imgHeight}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] ease-out-soft group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-grove/10 to-grove/55" />
                  {/* Icon badge */}
                  <div className="absolute top-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl border border-shell/50 bg-shell/72 text-ocean backdrop-blur-md">
                    {svc.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col bg-shell/82 p-6 backdrop-blur-xl">
                  <h3 className="text-xl font-semibold text-ink mb-2">{svc.title}</h3>
                  <p className="text-ink/72 text-sm leading-relaxed mb-4">
                    {svc.description}
                  </p>
                  <ul className="flex flex-col gap-1.5 mb-5">
                    {svc.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-ink/64">
                        <ChevronRight size={12} className="shrink-0 text-ocean" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={svc.href}
                    className="mt-auto inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ocean"
                  >
                    {svc.cta}
                    <ArrowRight size={14} className={arrowSlide} aria-hidden />
                  </Link>
                </div>
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
      <div className="bg-gradient-to-b from-sand to-shell px-6 py-16">
        <SectionHeader
          tag={scrollData?.sectionTag ?? 'SEE THE PROCESS'}
          title={scrollData?.title ?? 'Watch Your Solar System Come to Life'}
          subtitle={
            scrollData?.subtitle ??
            'Scroll through a real installation — from bare roof to fully powered solar system'
          }
        />
      </div>

      {/* The scroll component */}
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-shell">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-grove/18 border-t-ocean" />
          </div>
        }
      >
        <SolarInstallationScroll />
      </Suspense>

      {/* Transition back to the warm site canvas */}
      <div className="h-24 bg-gradient-to-b from-shell to-sand" />
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
    <section className="py-24 px-6 bg-gradient-to-b from-mist/35 to-transparent to-60%">
      <div className="max-w-6xl mx-auto">
        <SectionHeader tag={t.home.why.sectionTag} title={t.home.why.title} className="mb-16" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — image */}
          <motion.div
            className="relative overflow-hidden rounded-card shadow-lift"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={revealViewport}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <img
              src={installImg}
              alt="Solar panel installation on Ko Phangan roof"
              width={1024}
              height={508}
              loading="lazy"
              className="w-full h-[400px] lg:h-[500px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-grove/55 to-transparent to-55%" />
            {/* Badge */}
            <div className="absolute bottom-6 left-6 rounded-xl bg-shell/90 px-5 py-2.5 text-sm font-semibold text-grove">
              8+ Years Serving Ko Phangan
            </div>
          </motion.div>

          {/* Right — features */}
          <motion.div
            className="flex flex-col gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
          >
            {t.home.why.items.map((feat, i) => (
              <motion.div key={feat.title} variants={fadeUp}>
                <div
                  className={`flex h-full gap-5 rounded-card border border-grove/12 bg-shell/76 p-6 ${cardHover}`}
                >
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ocean/16 bg-mist/72 text-ocean">
                    {whyIcons[i]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-ink mb-1.5">{feat.title}</h3>
                    <p className="text-ink/72 text-sm leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
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
        <SectionHeader
          tag={t.home.process.sectionTag}
          title={t.home.process.title}
          subtitle={t.home.process.subtitle}
        />

        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-0 relative"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
        >
          {/* Connector line */}
          <div className="hidden md:block absolute top-[34px] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-ocean/28 to-transparent" />

          {t.home.process.steps.map((step, i) => (
            <motion.div
              key={stepNums[i]}
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              className="flex flex-col items-center text-center px-6 pb-8 md:pb-0 relative"
            >
              {i < t.home.process.steps.length - 1 && (
                <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-[68px] w-px h-full bg-gradient-to-b from-ocean/28 to-transparent" />
              )}
              <div className="relative z-10 mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-ocean/32 bg-shell/84 font-serif text-xl font-bold text-ocean">
                {stepNums[i]}
              </div>
              <h3 className="text-base font-semibold text-ink mb-2">{step.title}</h3>
              <p className="text-ink/64 text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats line */}
        {processCopy.statsLine && (
          <div className="mt-10 text-center">
            <p className="text-sm font-semibold text-ocean">
              {processCopy.statsLine}
            </p>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Button
            variant="primary"
            size="lg"
            to={langPath('/contact')}
            className="group w-full sm:w-auto"
          >
            {t.home.process.cta}
            <ArrowRight size={18} className={arrowSlide} aria-hidden />
          </Button>
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
        <SectionHeader
          tag={t.home.projects.sectionTag}
          title={t.home.projects.title}
          className="mb-16"
        />

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={revealViewport}
        >
          {t.home.projects.items.map((proj, i) => {
            const project = proj as typeof proj & ProjectExtra
            const image = projectImages[i % projectImages.length]
            return (
            <motion.div key={project.name} variants={fadeUp}>
              <div
                className={`group relative h-full overflow-hidden rounded-card border border-grove/14 shadow-soft ${cardHover}`}
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={image.src}
                    alt={`Solar panel installation ${project.name} ${project.location} Ko Phangan`}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[var(--duration-slow)] ease-out-soft group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-grove/5 to-grove/55" />
                  {/* Savings badge */}
                  <div className="absolute top-4 right-4 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold text-grove">
                    Site-modeled
                  </div>
                  {/* Type badge */}
                  {project.type && (
                    <div className="absolute top-4 left-4 rounded-full border border-shell/30 bg-shell/15 px-3 py-1 text-xs font-medium text-shell backdrop-blur-md">
                      {project.type}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="bg-shell/88 px-6 py-5 backdrop-blur-lg">
                  <h3 className="text-lg font-semibold text-ink mb-1">{project.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-ink/64 text-sm flex items-center gap-1">
                      <MapPin size={12} aria-hidden />
                      {project.location}
                    </span>
                    <span className="text-sm font-medium text-ocean">
                      {project.size}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )})}
        </motion.div>

        {projectsCopy.viewAll && (
          <div className="mt-10 flex justify-center">
            <Button variant="ghost" size="md" to={langPath('/projects')} icon={null} className="group">
              {projectsCopy.viewAll}
              <ArrowRight size={14} className={arrowSlide} aria-hidden />
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
      className={`overflow-hidden rounded-card border bg-shell/74 transition-colors duration-[var(--duration-fast)] ease-out-soft ${
        isOpen ? 'border-ocean/28 shadow-soft' : 'border-grove/12'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex min-h-11 items-center justify-between px-6 py-5 text-left cursor-pointer"
      >
        <span className="text-base font-medium text-ink pr-4">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-ocean"
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
        <SectionHeader tag={faqData.sectionTag} title={faqData.title} className="mb-14" />

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
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-card border border-grove/14 bg-shell/82 px-8 py-16 text-center shadow-lift backdrop-blur-2xl">
        {/* Soft lagoon glow */}
        <div
          className="absolute inset-0 rounded-card pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 110%, rgba(0,111,107,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <SectionHeader
            tag={t.home.cta.sectionTag}
            title={t.home.cta.title}
            subtitle={t.home.cta.subtitle}
            className="mb-10"
          />

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary CTA */}
            <Button
              variant="primary"
              size="lg"
              to={langPath('/contact')}
              className="group w-full sm:w-auto"
            >
              {t.home.cta.ctaPrimary}
              <ArrowRight size={18} className={arrowSlide} aria-hidden />
            </Button>

            {/* WhatsApp */}
            <Button
              variant="whatsapp"
              size="lg"
              href="https://wa.me/66946692011"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              {cta.ctaWhatsapp ?? 'WhatsApp Us'}
            </Button>

            {/* Call */}
            <Button
              variant="secondary"
              size="lg"
              href="tel:+66946692011"
              icon={<Phone size={18} aria-hidden />}
              className="w-full sm:w-auto"
            >
              {cta.ctaCall ?? 'Call Now'}
            </Button>
          </div>

          {/* Urgency line */}
          {cta.urgency && (
            <p className="mt-6 text-sm text-ink/55">
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
  const partnerImages = [
    { src: longiImg, width: 1024, height: 1024 },
    { src: huaweiImg, width: 1024, height: 680 },
    null,
  ]

  return (
    <section className="border-t border-grove/12 bg-shell/58 py-14 px-6">
      <div className="max-w-5xl mx-auto">
        <p className="text-center text-xs font-medium tracking-widest uppercase text-ink/50 mb-10">
          {t.home.partners.title}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-12">
          {t.home.partners.items.map((p, i) => {
            const logo = partnerImages[i]
            return (
            <div
              key={p.name}
              className="flex flex-col items-center gap-3 opacity-40 hover:opacity-70 transition-opacity duration-[var(--duration-base)] ease-out-soft"
            >
              {logo ? (
                <img
                  src={logo.src}
                  alt={`${p.name} — official solar equipment partner of Bustan Energy`}
                  width={logo.width}
                  height={logo.height}
                  loading="lazy"
                  className="h-10 w-auto object-contain grayscale"
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
                <p className="text-[11px] text-ink/55">{p.subtitle}</p>
              </div>
            </div>
          )})}
        </div>
        {/* Local SEO signal */}
        <p className="text-center text-xs text-ink/50 mt-8">
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
