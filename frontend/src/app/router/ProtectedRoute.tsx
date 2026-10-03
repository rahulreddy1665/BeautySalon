import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/constants'
import { useAppSelector } from '@/app/hooks/useRedux'

/** Redirects unauthenticated users to login; forces password change when required. */
export function ProtectedRoute() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const mustChange = useAppSelector((state) => state.auth.user?.mustChangePassword)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />
  }

  if (mustChange && location.pathname !== ROUTES.setPassword) {
    return <Navigate to={ROUTES.setPassword} replace />
  }

  return <Outlet />
}
