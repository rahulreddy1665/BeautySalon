import type { ReactNode } from 'react'

import { cn } from '@/app/utils'

interface SectionCardHeaderProps {
  title: string
  action?: ReactNode
  className?: string
}

/** Title left, optional action (e.g. View all pill) right — consistent across dashboard cards. */
export function SectionCardHeader({ title, action, className }: SectionCardHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-2 px-4 pb-2 pt-4', className)}
    >
      <h3 className="min-w-0 truncate text-sm font-medium leading-none">{title}</h3>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
