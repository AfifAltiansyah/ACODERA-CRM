import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

export function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="
        fixed top-5 right-5 z-50
        w-10 h-10 flex items-center justify-center
        rounded-full w-10 h-10 flex items-center justify-center
        border border-[var(--hairline)] bg-[var(--canvas)]/80
        backdrop-blur-sm
        text-[var(--muted)]
        hover:text-[var(--ink)] hover:bg-[var(--parchment)]
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50
        active:scale-95
      "
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        <Sun
          size={18}
          className={`absolute inset-0 transition-all duration-300 ${
            theme === 'dark' ? 'rotate-90 opacity-0 scale-75' : 'rotate-0 opacity-100 scale-100'
          }`}
        />
        <Moon
          size={18}
          className={`absolute inset-0 transition-all duration-300 ${
            theme === 'dark' ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-75'
          }`}
        />
      </div>
    </button>
  )
}
