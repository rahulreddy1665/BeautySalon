import { useEffect, useMemo, type ReactNode } from 'react'

import { useAppSelector } from '@/app/hooks/useRedux'
import type { ThemeMode } from '@/app/state/redux/slices/settingsSlice'
import { theme } from '@/app/theme'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return getSystemDark()
}

function applyThemeClass(isDark: boolean) {
  const root = document.documentElement
  root.classList.toggle('dark', isDark)

  const fromCss = getComputedStyle(root).getPropertyValue('--theme-color').trim()
  const themeColor = fromCss || (isDark ? theme.dark.card : theme.light.card)

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', themeColor)
  })
}

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * Applies `dark` on <html> from persisted settings + system preference.
 * FOUC is handled by the inline script in index.html before React mounts.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeMode = useAppSelector((state) => state.settings.themeMode)

  const isDark = useMemo(() => resolveDark(themeMode), [themeMode])

  useEffect(() => {
    applyThemeClass(isDark)
  }, [isDark])

  useEffect(() => {
    if (themeMode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [themeMode])

  return children
}
