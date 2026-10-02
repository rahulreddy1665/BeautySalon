import { TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent } from '@/app/components/ui/card'
import { cn, formatDeltaPercent, formatINR, formatNumber } from '@/app/utils'

interface StatCardProps {
  label: string
  value: number
  format?: 'inr' | 'number'
  delta?: number
  className?: string
}

export function StatCard({
  label,
  value,
  format = 'number',
  delta,
  className,
}: StatCardProps) {
  const display = format === 'inr' ? formatINR(value) : formatNumber(value)
  const positive = delta !== undefined && delta >= 0

  return (
    <Card className={cn('gap-0 rounded-md py-0 shadow-none', className)}>
      <CardContent className="px-3 py-3 sm:px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums leading-none">{display}</p>
        {delta !== undefined ? (
          <p
            className={cn(
              'mt-1.5 flex items-center gap-1 text-[11px] tabular-nums',
              positive ? 'text-success' : 'text-destructive',
            )}
          >
            {positive ? (
              <TrendingUp className="size-3" strokeWidth={1.75} />
            ) : (
              <TrendingDown className="size-3" strokeWidth={1.75} />
            )}
            {formatDeltaPercent(delta)} vs prior
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
