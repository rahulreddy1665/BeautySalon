import { Link } from 'react-router-dom'

import { Button } from '@/app/components/ui/button'
import { COMMON } from '@/app/constants'
import { useHomePath } from '@/app/hooks/useHasPermission'
import { cn } from '@/app/utils'

export function NotFoundPage() {
  const homePath = useHomePath()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-xl font-semibold">{COMMON.errors.notFound}</h1>
      <p className="text-sm text-muted-foreground">{COMMON.errors.notFoundHint}</p>
      <Button asChild className="mt-2 min-touch">
        <Link to={homePath}>{COMMON.errors.goHome}</Link>
      </Button>
    </main>
  )
}

/** `inline`: rendered inside the app layout (sidebar stays visible). */
export function ForbiddenPage({ inline = false }: { inline?: boolean }) {
  const homePath = useHomePath()
  return (
    <main
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-4 text-center',
        inline ? 'min-h-[50vh]' : 'min-h-dvh',
      )}
    >
      <h1 className="text-xl font-semibold">{COMMON.errors.noAccess}</h1>
      <p className="text-sm text-muted-foreground">{COMMON.errors.noAccessHint}</p>
      <Button asChild variant="outline" className="mt-2 min-touch">
        <Link to={homePath}>{COMMON.errors.goHome}</Link>
      </Button>
    </main>
  )
}
