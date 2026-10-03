import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { NAV_PERMISSION, ROUTES } from '@/app/constants'
import { useAppSelector } from '@/app/hooks/useRedux'

function requiredPermissionForPath(pathname: string): string | null {
  if (pathname === '/' || pathname === '') return NAV_PERMISSION['/'] ?? null
  const entries = Object.entries(NAV_PERMISSION).sort((a, b) => b[0].length - a[0].length)
  for (const [prefix, perm] of entries) {
    if (prefix === '/') continue
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return perm
    }
  }
  return null
}

/** Blocks routes when the user lacks the matching view permission. */
export function PermissionGuard() {
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()

  if (user?.role === 'admin') {
    return <Outlet />
  }

  const needed = requiredPermissionForPath(location.pathname)
  if (!needed) {
    return <Outlet />
  }

  const perms = user?.permissions ?? []
  if (!perms.includes(needed)) {
    return <Navigate to={ROUTES.forbidden} replace />
  }

  return <Outlet />
}
