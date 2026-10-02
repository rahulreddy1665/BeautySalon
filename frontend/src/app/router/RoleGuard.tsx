import { Navigate, Outlet } from 'react-router-dom'

import { useAppSelector } from '@/app/hooks/useRedux'
import type { AppRole } from '@/app/types/api'

interface RoleGuardProps {
  /** Allowed roles. Backend currently uses `admin`; product uses owner/manager/staff. */
  allowedRoles: AppRole[]
}

/**
 * Placeholder role-based guard.
 * Wire real RBAC once backend roles align with product roles.
 */
export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const role = useAppSelector((state) => state.auth.user?.role)

  if (!role) {
    return <Navigate to="/login" replace />
  }

  // Treat backend `admin` as owner-equivalent until roles are renamed.
  const normalizedRole = role === 'admin' ? 'owner' : role
  const allowed =
    allowedRoles.includes(role as AppRole) ||
    allowedRoles.includes(normalizedRole as AppRole)

  if (!allowed) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
