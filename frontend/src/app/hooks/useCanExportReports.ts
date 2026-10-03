import { useAppSelector } from '@/app/hooks/useRedux'

/** Export CSV when admin, designation canExport, or report:export permission. */
export function useCanExportReports(): boolean {
  const user = useAppSelector((s) => s.auth.user)
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.canExport) return true
  return Boolean(user.permissions?.includes('report:export'))
}
