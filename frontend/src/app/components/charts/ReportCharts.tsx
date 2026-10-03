import { Fragment } from 'react'
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
import { REPORTS } from '@/app/constants'
import { formatINR, formatMoneyOrDash, formatNumber } from '@/app/utils'

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

interface SalesSeriesChartProps {
  data: Array<{ key: string; value: number }>
  height?: number
  valueLabel?: string
}

/** Flat gold bars for sales trend (services / products / total). */
export function SalesSeriesChart({
  data,
  height = 220,
  valueLabel = 'Revenue',
}: SalesSeriesChartProps) {
  const colors = useChartTheme()
  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="key"
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
                formatter={(value) => [formatINR(Number(value)), valueLabel]}
              />
            }
          />
          <Bar
            dataKey="value"
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

interface HorizontalBarChartProps {
  data: Array<{ name: string; value: number }>
  height?: number
  valueAsMoney?: boolean
}

export function HorizontalStaffBarsChart({
  data,
  height = 280,
  valueAsMoney = true,
}: HorizontalBarChartProps) {
  const colors = useChartTheme()
  const chartHeight = Math.max(height, data.length * 36)

  return (
    <div style={{ width: '100%', height: chartHeight }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
        >
          <CartesianGrid stroke={colors.border} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) =>
              valueAsMoney
                ? v >= 1000
                  ? `${Math.round(v / 1000)}k`
                  : String(v)
                : formatNumber(v)
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: colors.cursor }}
            contentStyle={chartTooltipContentStyle(colors)}
            content={
              <ChartTooltipContent
                formatter={(value) => [
                  valueAsMoney ? formatINR(Number(value)) : formatNumber(Number(value)),
                  REPORTS.staff.table.totalSales,
                ]}
              />
            }
          />
          <Bar
            dataKey="value"
            fill={colors.chart1}
            radius={[0, 4, 4, 0]}
            background={{ fill: colors.track, radius: 4 }}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface DualSeriesChartProps {
  data: Array<{ key: string; newCount: number; returningCount: number }>
  height?: number
}

export function NewReturningChart({ data, height = 220 }: DualSeriesChartProps) {
  const colors = useChartTheme()
  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="key"
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: colors.cursor }}
            contentStyle={chartTooltipContentStyle(colors)}
            content={
              <ChartTooltipContent
                formatter={(value, name) => [
                  formatNumber(Number(value)),
                  name === 'newCount'
                    ? REPORTS.customers.chart.newLabel
                    : REPORTS.customers.chart.returningLabel,
                ]}
              />
            }
          />
          <Bar
            dataKey="newCount"
            name="newCount"
            fill={colors.chart1}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="returningCount"
            name="returningCount"
            fill={colors.chart4}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface StatusBreakdownChartProps {
  data: Array<{ status: string; count: number; label: string }>
  height?: number
}

export function StatusBreakdownChart({ data, height = 200 }: StatusBreakdownChartProps) {
  const colors = useChartTheme()
  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.border} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={{ stroke: colors.border }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.mutedFg, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: colors.cursor }}
            contentStyle={chartTooltipContentStyle(colors)}
            content={
              <ChartTooltipContent
                formatter={(value) => [
                  formatNumber(Number(value)),
                  REPORTS.appointments.chart.count,
                ]}
              />
            }
          />
          <Bar
            dataKey="count"
            fill={colors.chart1}
            radius={[4, 4, 0, 0]}
            background={{ fill: colors.track, radius: 4 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface TopItemsChartProps {
  data: Array<{ name: string; value: number }>
  height?: number
  valueAsMoney?: boolean
}

export function TopItemsBarChart({
  data,
  height = 260,
  valueAsMoney = true,
}: TopItemsChartProps) {
  return (
    <HorizontalStaffBarsChart data={data} height={height} valueAsMoney={valueAsMoney} />
  )
}

interface WalkInSplitProps {
  walkIn: number
  appointment: number
  height?: number
}

export function WalkInVsAppointmentChart({
  walkIn,
  appointment,
  height = 160,
}: WalkInSplitProps) {
  const colors = useChartTheme()
  const data = [
    {
      name: REPORTS.appointments.chart.walkIn,
      value: walkIn,
      color: colors.chart1,
    },
    {
      name: REPORTS.appointments.chart.appointment,
      value: appointment,
      color: colors.chart4,
    },
  ]
  return (
    <div style={{ width: '100%', height }} className="min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={40}
            outerRadius={60}
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
                  formatNumber(Number(value)),
                  String(name ?? ''),
                ]}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-center gap-4 text-xs text-muted-foreground">
        {data.map((d) => (
          <span key={d.name} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-sm"
              style={{ background: d.color }}
            />
            {d.name} {formatNumber(d.value)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Busy grid: 7 days × hours, intensity via gold-soft opacity steps (no gradients). */
export function BusyHoursGrid({
  days,
  hours,
  cells,
  dayLabels,
}: {
  days: number[]
  hours: string[]
  cells: number[][]
  dayLabels: string[]
}) {
  const max = Math.max(1, ...cells.flat())
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[480px] gap-1"
        style={{
          gridTemplateColumns: `56px repeat(${hours.length}, minmax(28px, 1fr))`,
        }}
      >
        <div />
        {hours.map((h) => (
          <div key={h} className="truncate text-center text-[10px] text-muted-foreground">
            {h.slice(0, 2)}
          </div>
        ))}
        {days.map((dow, di) => (
          <Fragment key={`row-${dow}`}>
            <div className="flex items-center text-xs text-muted-foreground">
              {dayLabels[dow] ?? dayLabels[di] ?? String(dow)}
            </div>
            {hours.map((_, hi) => {
              const n = cells[di]?.[hi] ?? 0
              const intensity = n === 0 ? 0 : Math.min(1, 0.2 + (n / max) * 0.8)
              return (
                <div
                  key={`${dow}-${hi}`}
                  title={`${n}`}
                  className="h-7 rounded-sm border border-border bg-gold-soft"
                  style={{ opacity: intensity === 0 ? 0.08 : intensity }}
                />
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export function formatChartMoney(value: number | null | undefined): string {
  return formatMoneyOrDash(value)
}
