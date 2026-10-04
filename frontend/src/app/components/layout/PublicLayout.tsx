import { Outlet } from 'react-router-dom'

/** Full-bleed shell for public auth routes — each screen owns its chrome. */
export function PublicLayout() {
  return <Outlet />
}
