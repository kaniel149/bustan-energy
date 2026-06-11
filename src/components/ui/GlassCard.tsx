import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  as?: 'div' | 'article' | 'section' | 'li'
}

export function GlassCard({
  children,
  className = '',
  hover = true,
  onClick,
  as: Tag = 'div',
}: GlassCardProps) {
  const baseClasses = [
    'bg-[rgba(255,244,226,0.7)]',
    'backdrop-blur-xl',
    'border border-[rgba(36,70,62,0.14)]',
    'rounded-card',
    'shadow-soft',
    'transition-all duration-[var(--duration-base)] ease-out-soft',
    hover ? 'hover:shadow-lift hover:-translate-y-0.5' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={baseClasses} onClick={onClick}>
      {children}
    </Tag>
  )
}
