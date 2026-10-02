import { AlertCircle, RefreshCw } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import { cn, toErrorMessage } from '@/app/utils'

interface ErrorStateProps {
  error?: unknown
  title?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  error,
  title = 'Could not load data',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-10 text-center',
        className,
      )}
    >
      <AlertCircle className="size-8 text-destructive" strokeWidth={1.5} />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{toErrorMessage(error)}</p>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2 min-touch"
          onClick={onRetry}
        >
          <RefreshCw className="size-4" strokeWidth={1.75} />
          Retry
        </Button>
      ) : null}
    </div>
  )
}
