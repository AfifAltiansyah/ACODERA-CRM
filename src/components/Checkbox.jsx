import { Check } from 'lucide-react'

export function Checkbox({ label, checked, onChange, id }) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2.5 cursor-pointer group"
    >
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className={`
          w-[18px] h-[18px] rounded-md border-2
          transition-all duration-200 ease-out
          flex items-center justify-center
          peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)]
          peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--accent)]/40
          ${checked
            ? 'border-[var(--accent)]'
            : 'border-[var(--hairline)] group-hover:border-[var(--muted)]'
          }
        `}>
          {checked && <Check size={12} className="text-white" strokeWidth={3} />}
        </div>
      </div>
      <span className="text-[13px] text-[var(--muted)] select-none">
        {label}
      </span>
    </label>
  )
}
