import { useState, useEffect } from 'react'

const STORAGE_KEY = 'a2c_darkMode'

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'true'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function DarkModeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(getInitialDark)

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(STORAGE_KEY, String(isDark))
  }, [isDark])

  // Sync on initial mount (SSR safety)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = () => setIsDark((prev) => !prev)

  return (
    <button
      onClick={toggle}
      className={`
        relative inline-flex items-center
        w-14 h-7 rounded-full
        transition-colors duration-300 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
        ${isDark ? 'bg-indigo-700' : 'bg-amber-400'}
        ${className}
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Track icons */}
      <span className="absolute left-1.5 text-xs transition-opacity duration-300"
        style={{ opacity: isDark ? 0 : 1 }}
      >
        🌙
      </span>
      <span className="absolute right-1.5 text-xs transition-opacity duration-300"
        style={{ opacity: isDark ? 1 : 0 }}
      >
        ☀️
      </span>

      {/* Thumb */}
      <span
        className={`
          inline-block w-5 h-5 rounded-full bg-white shadow-md
          transform transition-transform duration-300 ease-in-out
          ${isDark ? 'translate-x-8' : 'translate-x-1'}
        `}
      />
    </button>
  )
}
