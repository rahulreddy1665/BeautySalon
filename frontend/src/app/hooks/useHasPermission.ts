import { NAV_PERMISSION } from '@/app/constants'
import { useAppSelector } from '@/app/hooks/useRedux'

export function useHasPermission(permission?: string): boolean {
  const user = useAppSelector((s) => s.auth.user)
  if (!permission) return true
  if (user?.role === 'admin') return true
  return Boolean(user?.permissions?.includes(permission))
}

export function permissionForPath(path: string): string | null {
  if (path === '/' || path === '') return NAV_PERMISSION['/'] ?? null
  const entries = Object.entries(NAV_PERMISSION).sort(
    (a, b) => b[0].length - a[0].length,
  )
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
