type Props = {
  children: React.ReactNode
  tone?: 'lagoon' | 'sun' | 'grove'
  className?: string
}

const tones = {
  lagoon: 'bg-[rgba(216,236,232,0.7)] text-[var(--bustan-lagoon)] border-[rgba(0,111,107,0.2)]',
  sun: 'bg-[rgba(242,184,75,0.15)] text-[#9a6b12] border-[rgba(242,184,75,0.35)]',
  grove: 'bg-[rgba(36,70,62,0.08)] text-[var(--bustan-grove)] border-[rgba(36,70,62,0.18)]',
}

export function Badge({ children, tone = 'lagoon', className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
