import { useState } from 'react'
import { Eye, EyeOff, Mail, Lock, User, Search } from 'lucide-react'

const icons = { email: Mail, password: Lock, user: User, search: Search }

export function Input({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const IconComponent = icons[icon] || null

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-[13px] font-medium text-[var(--ink)]">
          {label}
        </label>
      )}
      <div className="relative">
        {IconComponent && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <IconComponent size={16} />
          </div>
        )}
        <input
          id={id}
          name={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`
            w-full rounded-[10px] border bg-[var(--parchment)] px-4 py-2.5
            text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)]
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${IconComponent ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
            ${error
              ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
              : 'border-transparent focus:ring-[var(--accent)]/30'
            }
            hover:bg-[var(--parchment)]/80
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[12px] text-red-500 animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  )
}
