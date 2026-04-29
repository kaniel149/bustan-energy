import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  as?: 'div' | 'article' | 'section' | 'li'
}

const motionTags = {
  div: motion.div,
  article: motion.article,
  section: motion.section,
  li: motion.li,
}

export function GlassCard({
  children,
  className = '',
  hover = true,
  onClick,
  as: Tag = 'div',
}: GlassCardProps) {
  const MotionTag = motionTags[Tag]

  const baseClasses = [
    'bg-white/5',
    'backdrop-blur-xl',
    'border border-white/10',
    'rounded-2xl',
    'transition-colors duration-300',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <MotionTag
      className={baseClasses}
      onClick={onClick}
      whileHover={
        hover
          ? {
              y: -4,
              borderColor: 'rgba(255,255,255,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }
          : {}
      }
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {children}
    </MotionTag>
  )
}
