import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function FormField({ label, hint, required, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">
        {label}
        {required && <span className="text-[#E8A820] mr-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-white/30">{hint}</p>}
    </div>
  )
}

const inputBase =
  'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A820]/50 transition-colors'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export function Input({ hasError, className = '', ...props }: InputProps) {
  return (
    <input
      className={`${inputBase} ${hasError ? 'border-red-500/50' : ''} ${className}`}
      {...props}
    />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean
}

export function Select({ hasError, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`${inputBase} ${hasError ? 'border-red-500/50' : ''} ${className} [&>option]:bg-[#0D2137]`}
      {...props}
    >
      {children}
    </select>
  )
}
