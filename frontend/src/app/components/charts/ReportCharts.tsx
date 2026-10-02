import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAppSelector } from '@/app/hooks/useRedux'
import { theme } from '@/app/theme'
import { formatINR } from '@/app/utils'

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function useChartColors() {
  const themeMode = useAppSelector((state) => state.settings.themeMode)

  return useMemo(() => {
    void themeMode
    return {
      chart1: readCssVar('--chart-1', theme.light.chart1),
      chart2: readCssVar('--chart-2', theme.light.chart2),
      chart4: readCssVar('--chart-4', theme.light.chart4),
      chart5: readCssVar('--chart-5', theme.light.chart5),
      border: readCssVar('--border', theme.light.border),
      muted: readCssVar('--muted', theme.light.muted),
      mutedFg: readCssVar('--muted-foreground', theme.light.mutedForeground),
      card: readCssVar('--card', theme.light.card),
      foreground: readCssVar('--foreground', theme.light.foreground),
    }
  }, [themeMode])
}

interface RevenueTrendChartProps {
  data: { date: string; revenue: number }[]
  height?: number
}

export function RevenueTrendChart({ data, height = 200 }: RevenueTrendChartProps) {
  const colors = useChartColors()

  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            cursor={{ fill: colors.muted }}
            contentStyle={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              fontSize: 12,
              color: colors.foreground,
            }}
            formatter={(value) => [formatINR(Number(value ?? 0)), 'Revenue']}
          />
          <Bar dataKey="revenue" fill={colors.chart1} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface SplitPieChartProps {
  service: number
  product: number
  height?: number
}

export function ServiceProductSplitChart({
  service,
  product,
  height = 180,
}: SplitPieChartProps) {
  const colors = useChartColors()
  const data = [
    { name: 'Services', value: service, color: colors.chart4 },
    { name: 'Products', value: product, color: colors.chart5 },
  ]

  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={44}
            outerRadius={64}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke={colors.card} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              fontSize: 12,
              color: colors.foreground,
            }}
            formatter={(value) => formatINR(Number(value ?? 0))}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: colors.chart4 }}
          />
          Services {formatINR(service)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ background: colors.chart5 }}
          />
          Products {formatINR(product)}
        </span>
      </div>
    </div>
  )
}
