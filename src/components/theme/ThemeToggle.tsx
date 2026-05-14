'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mia-theme'

function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const preferred = getPreferredTheme()
    setTheme(preferred)
    applyTheme(preferred)
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  const label = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-mia-border bg-mia-surface/70 px-3 text-xs font-semibold text-neutral transition-colors hover:border-mf-coral/40 hover:text-mia-cream"
      suppressHydrationWarning
    >
      <Icon className="h-4 w-4" />
      {!compact && <span className="hidden lg:inline">{mounted ? (theme === 'dark' ? 'Claro' : 'Oscuro') : 'Tema'}</span>}
    </button>
  )
}
