import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/constants'
import { permissionForPath, useHomePath } from '@/app/hooks/useHasPermission'
import { useAppSelector } from '@/app/hooks/useRedux'
import { ForbiddenPage } from '@/app/screens/NotFoundPage'

/**
 * Blocks routes the user's role can't view.
 * - `/` without dashboard access → their first allowed page (not a dead end).
 * - Any other blocked page → "No access" inside the app layout, so the sidebar
 *   (already filtered by role) is still there to navigate away.
 */
export function PermissionGuard() {
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()
  const homePath = useHomePath()

  if (user?.role === 'admin') {
    return <Outlet />
  }

  const needed = permissionForPath(location.pathname)
  if (!needed || (user?.permissions ?? []).includes(needed)) {
    return <Outlet />
  }

  if (location.pathname === ROUTES.home && homePath !== ROUTES.home) {
    return <Navigate to={homePath} replace />
  }

  return <ForbiddenPage inline />
}
