import { Inbox } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/utils'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card px-4 py-10 text-center',
        className,
      )}
    >
      <Inbox className="size-8 text-muted-foreground" strokeWidth={1.5} />
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" size="sm" className="mt-2 min-touch" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
