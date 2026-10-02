import { Link } from 'react-router-dom'

import { Button } from '@/app/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">That screen does not exist.</p>
      <Button asChild className="mt-2 min-touch">
        <Link to="/">Go to dashboard</Link>
      </Button>
    </main>
  )
}

export function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="text-sm text-muted-foreground">
        You do not have permission to view this page.
      </p>
      <Button asChild variant="outline" className="mt-2 min-touch">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </main>
  )
}
