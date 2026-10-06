import { Outlet, useLocation } from 'react-router-dom'

import { ErrorBoundary } from '@/app/components/ErrorBoundary'

/** Full-bleed shell for public auth routes — each screen owns its chrome. */
export function PublicLayout() {
  const location = useLocation()
  return (
    <ErrorBoundary key={location.pathname}>
      <Outlet />
    </ErrorBoundary>
  )
}
