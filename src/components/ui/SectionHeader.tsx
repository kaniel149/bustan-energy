import { motion } from 'framer-motion'

type Props = {
  tag?: string // small uppercase kicker, lagoon color
  title: string // Instrument Serif display
  subtitle?: string
  align?: 'center' | 'left'
  className?: string
}

export function SectionHeader({ tag, title, subtitle, align = 'center', className = '' }: Props) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-start'
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`max-w-2xl ${alignCls} ${className}`}
    >
      {tag && (
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--bustan-lagoon)] mb-3">
          {tag}
        </p>
      )}
      <h2 className="font-serif text-[2.5rem] leading-[1.1] text-[var(--bustan-ink)] md:text-[3.5rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg leading-relaxed text-[rgba(39,52,47,0.74)]">{subtitle}</p>
      )}
    </motion.div>
  )
}
