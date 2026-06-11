import type { ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'whatsapp'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  target?: string
  rel?: string
  /** Optional leading icon. The `whatsapp` variant defaults to MessageCircle — pass `icon={null}` to suppress. */
  icon?: ReactNode
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-6 py-3 text-base gap-2',
  lg: 'px-8 py-4 text-lg gap-2.5',
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-[var(--bustan-grove)] text-[var(--bustan-shell)] font-semibold',
    'hover:bg-[var(--bustan-canopy)] hover:shadow-lift',
    'border border-transparent',
  ].join(' '),
  secondary: [
    'bg-transparent text-[var(--bustan-grove)] font-medium',
    'border border-[rgba(36,70,62,0.3)]',
    'hover:bg-[rgba(216,236,232,0.5)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--bustan-lagoon)] font-medium',
    'border border-transparent',
    'hover:underline underline-offset-4',
  ].join(' '),
  whatsapp: [
    'bg-[#25D366] text-white font-semibold',
    'border border-transparent',
    'hover:shadow-lift hover:brightness-105',
  ].join(' '),
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  onClick,
  href,
  disabled = false,
  type = 'button',
  target,
  rel,
  icon,
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-sans cursor-pointer select-none',
    'rounded-button',
    'transition-all duration-[var(--duration-fast)] ease-out-soft',
    'active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bustan-lagoon)] focus-visible:ring-offset-2',
    disabled ? 'opacity-40 pointer-events-none' : '',
    sizeClasses[size],
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const resolvedIcon =
    icon !== undefined ? icon : variant === 'whatsapp' ? <MessageCircle className="size-[1.2em]" aria-hidden /> : null

  const content = (
    <>
      {resolvedIcon}
      {children}
    </>
  )

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={baseClasses} onClick={onClick}>
        {content}
      </a>
    )
  }

  return (
    <button type={type} className={baseClasses} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  )
}
