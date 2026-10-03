import { TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent } from '@/app/components/ui/card'
import { DASHBOARD } from '@/app/constants'
import { cn, formatDeltaPercent, formatINR, formatNumber } from '@/app/utils'

interface StatCardProps {
  label: string
  value: number
  format?: 'inr' | 'number'
  delta?: number
  subtitle?: string
  highlight?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  format = 'number',
  delta,
  subtitle,
  highlight,
  className,
}: StatCardProps) {
  const display = format === 'inr' ? formatINR(value) : formatNumber(value)
  const positive = delta !== undefined && delta >= 0

  return (
    <Card
      className={cn(
        'gap-0 py-0 shadow-none',
        highlight && 'stat-highlight border-transparent',
        className,
      )}
    >
      <CardContent className="px-3 py-3 sm:px-4">
        <p
          className={cn(
            'text-xs',
            highlight ? 'text-on-gold/80' : 'text-muted-foreground',
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            'mt-1 text-2xl font-semibold tabular-nums leading-none',
            highlight && 'text-on-gold',
          )}
        >
          {display}
        </p>
        {delta !== undefined ? (
          <p
            className={cn(
              'mt-1.5 flex items-center gap-1 text-[11px] tabular-nums',
              highlight
                ? 'text-on-gold/90'
                : positive
                  ? 'text-success'
                  : 'text-destructive',
            )}
          >
            {positive ? (
              <TrendingUp className="size-3" strokeWidth={1.75} />
            ) : (
              <TrendingDown className="size-3" strokeWidth={1.75} />
            )}
            {formatDeltaPercent(delta)} {DASHBOARD.vsPrior}
          </p>
        ) : null}
        {subtitle ? (
          <p
            className={cn(
              'mt-1 text-[11px]',
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
