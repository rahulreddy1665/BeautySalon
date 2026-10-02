import { Outlet } from 'react-router-dom'

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 pt-safe pb-safe">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-5 sm:p-6">
        <Outlet />
      </div>
    </div>
  )
}
