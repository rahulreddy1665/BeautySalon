import { useEffect, useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

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

function isLoginPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/')
}

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function applyThemeClass(isDark: boolean, forceLoginLight: boolean) {
  const root = document.documentElement
  const effectiveDark = forceLoginLight ? false : isDark
  root.classList.toggle('dark', effectiveDark)

  // Login locks status-bar color (mobile dark header / desktop light page).
  const locked = root.dataset.themeColorLock?.trim()
  const fromCss = readCssVar('--theme-color')
  const themeColor =
    locked || fromCss || (effectiveDark ? theme.dark.card : theme.light.card)

  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute('content', themeColor)
  })
}

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * Applies `dark` on <html> from persisted settings + system preference.
 * `/login` always forces light (does not mutate Redux themeMode).
 * FOUC is handled by the inline script in index.html before React mounts.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeMode = useAppSelector((state) => state.settings.themeMode)
  const { pathname } = useLocation()
  const forceLoginLight = isLoginPath(pathname)

  const isDark = useMemo(() => resolveDark(themeMode), [themeMode])

  useEffect(() => {
    applyThemeClass(isDark, forceLoginLight)
  }, [isDark, forceLoginLight])

  useEffect(() => {
    if (forceLoginLight || themeMode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass(mq.matches, false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [themeMode, forceLoginLight])

  return children
}
