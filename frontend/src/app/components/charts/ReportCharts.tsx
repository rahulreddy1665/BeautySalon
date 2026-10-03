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

import {
  ChartTooltipContent,
  chartTooltipContentStyle,
  useChartTheme,
} from '@/app/components/charts/ChartTooltip'
import { formatINR } from '@/app/utils'

interface RevenueTrendChartProps {
  data: { date: string; revenue: number }[]
  height?: number
}

export function RevenueTrendChart({ data, height = 200 }: RevenueTrendChartProps) {
  const colors = useChartTheme()

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
            cursor={{ fill: colors.cursor }}
            contentStyle={chartTooltipContentStyle(colors)}
            content={
              <ChartTooltipContent
                formatter={(value) => [formatINR(Number(value)), 'Revenue']}
              />
            }
          />
          <Bar
            dataKey="revenue"
            fill={colors.chart1}
            radius={[4, 4, 0, 0]}
            background={{ fill: colors.track, radius: 4 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface MonthlyRevenueChartProps {
  data: Array<{
    month: string
    revenue: number
    services: number
    products: number
  }>
  mode?: 'revenue' | 'services' | 'products'
  height?: number
}

export function MonthlyRevenueChart({
  data,
  mode = 'revenue',
  height = 240,
}: MonthlyRevenueChartProps) {
  const colors = useChartTheme()
  const key = mode

  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            cursor={{ fill: colors.cursor }}
            contentStyle={chartTooltipContentStyle(colors)}
            content={
              <ChartTooltipContent
                formatter={(value) => [formatINR(Number(value)), 'Revenue']}
              />
            }
          />
          <Bar
            dataKey={key}
            fill={colors.chart1}
            radius={[4, 4, 0, 0]}
            background={{ fill: colors.track, radius: 4 }}
          />
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
  const colors = useChartTheme()
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
            contentStyle={chartTooltipContentStyle(colors)}
            content={
              <ChartTooltipContent
                formatter={(value, name) => [
                  formatINR(Number(value)),
                  String(name ?? ''),
                ]}
              />
            }
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
