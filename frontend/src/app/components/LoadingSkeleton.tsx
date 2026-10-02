import { Skeleton } from '@/app/components/ui/skeleton'
import { cn } from '@/app/utils'

interface LoadingSkeletonProps {
  rows?: number
  className?: string
  variant?: 'stats' | 'table' | 'chart'
}

export function LoadingSkeleton({
  rows = 4,
  className,
  variant = 'table',
}: LoadingSkeletonProps) {
  if (variant === 'stats') {
    return (
      <div className={cn('grid grid-cols-2 gap-2 lg:grid-cols-4', className)}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[72px] rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (variant === 'chart') {
    return <Skeleton className={cn('h-56 w-full rounded-md bg-muted', className)} />
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-md bg-muted" />
      ))}
    </div>
  )
}
