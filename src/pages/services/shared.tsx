// Shared primitives for the Services pages (index + 4 sub-pages).
// Mirrors the HomePage standard (commits 5a3bf90 + c43a490): tropical-light
// theme, semantic tokens, mount-animated heroes, viewport-gated reveals.
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'

// ─── Animation standards (copied from HomePage) ─────────────────────────────
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

export const heroStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

// Standard scroll-reveal viewport — below-the-fold sections only.
export const revealViewport = { once: true, margin: '-80px' } as const

// Shared micro-interaction classes. IMPORTANT: hover transforms live on a
// plain element nested inside the motion wrapper (framer leaves an inline
// transform that kills CSS hover on the same element).
export const cardHover =
  'transition-all duration-[var(--duration-fast)] ease-out-soft hover:-translate-y-0.5 hover:shadow-lift'
export const arrowSlide =
  'transition-transform duration-[var(--duration-fast)] ease-out-soft group-hover:translate-x-1'

export const WHATSAPP_URL = 'https://wa.me/66946692011'

// ─── Hero (SectionHeader-style, mount-animated — never scroll-gated) ────────
export function ServiceHero({
  icon,
  badge,
  title,
  titleAccent,
  subtitle,
  children,
}: {
  icon: ReactNode
  badge: string
  title: string
  titleAccent?: string
  subtitle: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-20">
      {/* Soft lagoon-mist wash, fading into the warm paper canvas */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-mist/55 via-mist/20 to-transparent"
      />
      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div variants={heroStagger} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-ocean/20 bg-shell/70 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-ocean">
              {icon}
              {badge}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-serif text-display-md sm:text-display-lg md:text-display-xl leading-[1.05] tracking-tight text-ink"
          >
            {title}
            {titleAccent && (
              <>
                {' '}
                <span className="text-ocean">{titleAccent}</span>
              </>
            )}
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg md:text-xl text-ink/74 max-w-2xl mx-auto leading-relaxed"
          >
            {subtitle}
          </motion.p>

          {children && (
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-2"
            >
              {children}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section divider ─────────────────────────────────────────────────────────
export function Divider() {
  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-grove/14 to-transparent" />
    </div>
  )
}

// ─── Icon tile (unified: lucide, strokeWidth 1.5, ocean on mist) ────────────
export function IconTile({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-ocean/16 bg-mist/72 text-ocean ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Related-service / explore card (equal height, ocean accent) ────────────
export function RelatedCard({
  to,
  icon,
  title,
  desc,
  linkLabel = 'Learn more',
}: {
  to: string
  icon: ReactNode
  title: string
  desc: string
  linkLabel?: string
}) {
  return (
    <motion.div variants={fadeUp} className="h-full">
      <Link
        to={to}
        className={`group flex h-full flex-col rounded-card border border-grove/14 bg-shell/76 p-6 shadow-soft hover:border-ocean/30 ${cardHover}`}
      >
        <IconTile className="mb-4 h-11 w-11">{icon}</IconTile>
        <h3 className="text-lg font-semibold text-ink mb-2">{title}</h3>
        <p className="text-ink/60 text-sm leading-relaxed mb-4">{desc}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-ocean">
          {linkLabel} <ArrowRight size={14} className={arrowSlide} aria-hidden />
        </span>
      </Link>
    </motion.div>
  )
}

// ─── Final CTA block (reuses Home's CTA pattern, always offers WhatsApp) ────
export function ServiceCTA({
  title,
  subtitle,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
  whatsappLabel = 'WhatsApp Us',
}: {
  title: string
  subtitle: string
  primaryLabel: string
  primaryTo: string
  secondaryLabel?: string
  secondaryTo?: string
  whatsappLabel?: string
}) {
  return (
    <section className="py-24 px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={revealViewport}
        variants={fadeUp}
        className="relative mx-auto max-w-3xl overflow-hidden rounded-card border border-grove/14 bg-shell/82 px-8 py-16 text-center shadow-lift backdrop-blur-2xl"
      >
        {/* Soft lagoon glow (same treatment as Home's CTA) */}
        <div
          className="absolute inset-0 rounded-card pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 50% 110%, rgba(0,111,107,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10">
          <h2 className="font-serif text-display-sm md:text-display-md leading-[1.1] text-ink mb-4">
            {title}
          </h2>
          <p className="text-lg text-ink/74 mb-10 max-w-xl mx-auto leading-relaxed">{subtitle}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="lg" to={primaryTo} className="group w-full sm:w-auto">
              {primaryLabel}
              <ArrowRight size={18} className={arrowSlide} aria-hidden />
            </Button>
            <Button
              variant="whatsapp"
              size="lg"
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              {whatsappLabel}
            </Button>
            {secondaryLabel && secondaryTo && (
              <Button variant="secondary" size="lg" to={secondaryTo} className="w-full sm:w-auto">
                {secondaryLabel}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
