import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import {
  ChartTooltipContent,
  chartTooltipContentStyle,
  useChartTheme,
} from '@/app/components/charts/ChartTooltip'
import { formatINR } from '@/app/utils'

type ModeKey = 'cash' | 'upi' | 'card'

/** Fixed order (never re-sorted by size) so each mode always keeps its colour. */
const MODES: ReadonlyArray<{ key: ModeKey; cssVar: string; fallback: string }> = [
  { key: 'cash', cssVar: '--pay-cash', fallback: '#1baf7a' },
  { key: 'upi', cssVar: '--pay-upi', fallback: '#2a78d6' },
  { key: 'card', cssVar: '--pay-card', fallback: '#eb6834' },
]

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

interface PaymentModeDonutProps {
  split: Record<ModeKey, number>
  labels: Record<ModeKey, string>
  totalLabel: string
  emptyLabel: string
  height?: number
}

/**
 * Today's collection by payment mode. Part-to-whole at a glance (3 parts),
 * total as the headline in the centre, and a legend that always shows each
 * mode's amount and share, so nothing depends on telling colours apart.
 */
export function PaymentModeDonut({
  split,
  labels,
  totalLabel,
  emptyLabel,
  height = 184,
}: PaymentModeDonutProps) {
  // useChartTheme re-renders this on light/dark switch, so the vars are re-read.
  const theme = useChartTheme()
  const colors = Object.fromEntries(
    MODES.map((m) => [m.key, readVar(m.cssVar, m.fallback)]),
  ) as Record<ModeKey, string>

  const total = MODES.reduce((sum, m) => sum + Math.max(0, split[m.key] || 0), 0)
  const rows = MODES.map((m) => {
    const amount = Math.max(0, split[m.key] || 0)
    return {
      key: m.key,
      name: labels[m.key],
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: colors[m.key],
    }
  })
  // Zero modes get no slice (a 0° wedge is just a stray gap) but stay in the legend.
  const slices = rows.filter((r) => r.amount > 0)

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="relative min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {total > 0 ? (
              <Pie
                data={slices}
                dataKey="amount"
                nameKey="name"
                innerRadius="68%"
                outerRadius="94%"
                startAngle={90}
                endAngle={-270}
                // 2px card-coloured gap between slices.
                stroke={theme.card}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.key} fill={s.color} />
                ))}
              </Pie>
            ) : (
              <Pie
                data={[{ name: 'none', amount: 1 }]}
                dataKey="amount"
                innerRadius="68%"
                outerRadius="94%"
                fill={theme.track}
                stroke="none"
                isAnimationActive={false}
              />
            )}
            {total > 0 ? (
              <Tooltip
                contentStyle={chartTooltipContentStyle(theme)}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      `${formatINR(Number(value))} (${Math.round((Number(value) / total) * 100)}%)`,
                      String(name ?? ''),
                    ]}
                  />
                }
              />
            ) : null}
          </PieChart>
        </ResponsiveContainer>
        {/* Headline in the hole; pointer-events off so slice hover still works. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
            {formatINR(total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? totalLabel : emptyLabel}
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 text-sm" aria-label={totalLabel}>
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ background: r.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-foreground">{r.name}</span>
            <span className="tabular-nums font-medium text-foreground">
              {formatINR(r.amount)}
            </span>
            <span className="w-10 text-right tabular-nums text-muted-foreground">
              {r.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
