import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAppSelector } from '@/app/hooks/useRedux'

/** Redirects unauthenticated users to login, preserving the intended path. */
export function ProtectedRoute() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
