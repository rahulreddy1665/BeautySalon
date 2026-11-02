import { NAV_PERMISSION, ROUTES } from '@/app/constants'
import { useAppSelector } from '@/app/hooks/useRedux'

export function useHasPermission(permission?: string): boolean {
  const user = useAppSelector((s) => s.auth.user)
  if (!permission) return true
  if (user?.role === 'admin') return true
  return Boolean(user?.permissions?.includes(permission))
}

export function permissionForPath(path: string): string | null {
  if (path === '/' || path === '') return NAV_PERMISSION['/'] ?? null
  const entries = Object.entries(NAV_PERMISSION).sort((a, b) => b[0].length - a[0].length)
  for (const [prefix, perm] of entries) {
    if (prefix === '/') continue
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return perm
    }
  }
  return null
}

export function useCanAccessPath(path: string): boolean {
  const user = useAppSelector((s) => s.auth.user)
  if (user?.role === 'admin') return true
  const needed = permissionForPath(path)
  if (!needed) return true
  return Boolean(user?.permissions?.includes(needed))
}

/** Landing-page preference, in menu order. Account needs no permission, so it always matches. */
const HOME_CANDIDATES = [
  ROUTES.home,
  ROUTES.appointments,
  ROUTES.billing,
  ROUTES.customers,
  ROUTES.services,
  ROUTES.inventory,
  ROUTES.loyalty,
  ROUTES.staff,
  ROUTES.reports,
  ROUTES.settings,
  ROUTES.account,
] as const

/**
 * Where "home" is for this user: the dashboard if their role has it, otherwise
 * the first page they're allowed to open. Used for login, `/`, the logo and the
 * "Go home" buttons so nobody lands on a page they can't use.
 */
export function useHomePath(): string {
  const user = useAppSelector((s) => s.auth.user)
  if (!user || user.role === 'admin') return ROUTES.home
  const perms = user.permissions ?? []
  return (
    HOME_CANDIDATES.find((path) => {
      const needed = permissionForPath(path)
      return !needed || perms.includes(needed)
    }) ?? ROUTES.account
  )
}
