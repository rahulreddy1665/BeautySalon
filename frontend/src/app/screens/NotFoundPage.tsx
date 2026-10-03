import { Link } from 'react-router-dom'

import { Button } from '@/app/components/ui/button'
import { COMMON, ROUTES } from '@/app/constants'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">{COMMON.errors.notFound}</h1>
      <p className="text-sm text-muted-foreground">{COMMON.errors.notFoundHint}</p>
      <Button asChild className="mt-2 min-touch">
        <Link to={ROUTES.home}>{COMMON.errors.goHome}</Link>
      </Button>
    </main>
  )
}

export function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">{COMMON.errors.noAccess}</h1>
      <p className="text-sm text-muted-foreground">{COMMON.errors.noAccessHint}</p>
      <Button asChild variant="outline" className="mt-2 min-touch">
        <Link to={ROUTES.home}>{COMMON.errors.goHome}</Link>
      </Button>
    </main>
  )
}
