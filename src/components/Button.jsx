import { Loader2 } from 'lucide-react'

export function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const baseStyles = `
    relative w-full flex items-center justify-center gap-2
    rounded-[10px] px-5 py-2.5 text-[14px] font-medium
    transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:cursor-not-allowed disabled:opacity-40
    active:scale-[0.98]
  `

  const variants = {
    primary: `
      bg-[var(--accent)] text-white
      hover:bg-[var(--accent-hover)]
      focus:ring-[var(--accent)]/30
    `,
    secondary: `
      bg-[var(--parchment)] text-[var(--ink)]
      border border-[var(--hairline)]
      hover:bg-[var(--parchment)]/80
      focus:ring-[var(--accent)]/30
    `,
    danger: `
      bg-red-500 text-white
      hover:bg-red-600
      focus:ring-red-500/30
    `,
    ghost: `
      bg-transparent text-[var(--muted)]
      hover:bg-[var(--parchment)] hover:text-[var(--ink)]
      focus:ring-[var(--accent)]/30
    `,
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        children
      )}
    </button>
  )
}
