import { Outlet } from 'react-router-dom'

export function PublicLayout() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-8 pt-safe pb-safe">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gold-soft/70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gold"
      />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-none sm:p-6">
        <Outlet />
      </div>
    </div>
  )
}
