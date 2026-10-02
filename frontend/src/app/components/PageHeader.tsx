import { cn } from '@/app/utils'

interface PageHeaderProps {
  /** Optional when the top bar already shows the page title. Prefer actions-only. */
  title?: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * Compact page chrome under the app top bar.
 * Prefer omitting `title` to avoid duplicating the top-bar title.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  if (!title && !description && !actions) return null

  return (
    <div
      className={cn(
        'mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {title ? (
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        ) : null}
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
