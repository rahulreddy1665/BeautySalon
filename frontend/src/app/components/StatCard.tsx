import type { LucideIcon } from 'lucide-react'
import { Users } from 'lucide-react'

import { Card, CardContent } from '@/app/components/ui/card'
import { DASHBOARD } from '@/app/constants'
import { cn, formatINR, formatNumber } from '@/app/utils'

interface StatCardProps {
  label: string
  /** Null money (no canViewRevenue) → dash. */
  value: number | null
  format?: 'inr' | 'number' | 'percent'
  /** Null when prior period is 0 / unavailable — show neutral dash. */
  delta?: number | null
  subtitle?: string
  highlight?: boolean
  icon?: LucideIcon
  className?: string
}

function DeltaPill({
  delta,
  highlight,
}: {
  delta: number | null | undefined
  highlight?: boolean
}) {
  if (delta === undefined) return null
  if (delta === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
          highlight ? 'bg-on-gold/15 text-on-gold' : 'bg-muted text-muted-foreground',
        )}
      >
        {DASHBOARD.deltaNone}
      </span>
    )
  }
  const sign = delta > 0 ? '+' : ''
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
        highlight
          ? 'bg-on-gold/15 text-on-gold'
          : delta >= 0
            ? 'bg-success-soft text-success'
            : 'bg-danger-soft text-danger',
      )}
    >
      {sign}
      {delta.toFixed(1)}%
    </span>
  )
}

function HighlightDecor() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden rounded-[12px]"
      viewBox="0 0 320 120"
      preserveAspectRatio="xMaxYMid slice"
    >
      <polygon
        points="180,0 320,0 320,80 220,120"
        fill="currentColor"
        className="text-on-gold/15"
      />
      <polygon
        points="240,10 320,25 320,120 200,105"
        fill="currentColor"
        className="text-gold-deep/20"
      />
      <polygon
        points="260,0 320,0 320,60 280,40"
        fill="currentColor"
        className="text-on-gold/20"
      />
    </svg>
  )
}

export function StatCard({
  label,
  value,
  format = 'number',
  delta,
  subtitle,
  highlight,
  icon: Icon = Users,
  className,
}: StatCardProps) {
  const display =
    value == null
      ? DASHBOARD.deltaNone
      : format === 'inr'
        ? formatINR(value)
        : format === 'percent'
          ? `${value.toFixed(1)}%`
          : formatNumber(value)

  return (
    <Card
      className={cn(
        'relative gap-0 overflow-hidden py-0 shadow-none',
        highlight && 'stat-highlight border-transparent text-on-gold rounded-[12px]',
        className,
      )}
    >
      {highlight ? <HighlightDecor /> : null}
      <CardContent
        className={cn(
          'relative z-[1] px-3 py-2.5 sm:px-3.5 sm:py-3',
          highlight && 'px-3.5 py-3',
        )}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
              highlight ? 'bg-on-gold/15 text-on-gold' : 'bg-gold-soft text-gold-deep',
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
          </span>
          <p
            className={cn(
              'truncate text-xs font-medium',
              highlight ? 'text-on-gold' : 'text-foreground',
            )}
          >
            {label}
          </p>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <p
            className={cn(
              'text-[22px] font-semibold leading-none tabular-nums sm:text-2xl',
              highlight ? 'text-on-gold' : 'text-foreground',
            )}
          >
            {display}
          </p>
          <DeltaPill delta={delta} highlight={highlight} />
        </div>

        {subtitle ? (
          <p
            className={cn(
              'mt-1 text-[11px] leading-tight',
              highlight ? 'text-on-gold/80' : 'text-muted-foreground',
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
