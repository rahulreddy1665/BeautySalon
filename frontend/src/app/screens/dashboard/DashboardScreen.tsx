import { format, parseISO } from 'date-fns'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { MonthlyRevenueChart } from '@/app/components/charts/ReportCharts'
import { ProgressGauge } from '@/app/components/dashboard/ProgressGauge'
import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { StatCard } from '@/app/components/StatCard'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { COMMON, DASHBOARD, ROUTES } from '@/app/constants'
import { useOwnerDashboardQuery } from '@/app/hooks/queries/useDashboardQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import type { DashboardRange } from '@/app/service/dashboard/dashboardApi'
import { cn, formatINR } from '@/app/utils'

function statusBorder(status: string): string {
  switch (status) {
    case 'completed':
      return 'border-l-status-completed'
    case 'cancelled':
      return 'border-l-status-cancelled'
    case 'no_show':
      return 'border-l-status-no-show'
    default:
      return 'border-l-status-booked'
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function DashboardScreen() {
  const [range, setRange] = useState<DashboardRange>('today')
  const [chartMode, setChartMode] = useState<
    'revenue' | 'services' | 'products'
  >('revenue')
  const { data, isLoading, isError, error, refetch } =
    useOwnerDashboardQuery(range)
  const settingsQuery = useSalonSettingsQuery()
  const salonName =
    settingsQuery.data?.business?.salonName?.trim() || COMMON.appName

  const showMoney = Boolean(data?.canViewRevenue)

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {DASHBOARD.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
            {salonName}
          </span>
          <Select
            value={range}
            onValueChange={(v) => setRange(v as DashboardRange)}
          >
            <SelectTrigger className="h-9 w-[140px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{DASHBOARD.rangeToday}</SelectItem>
              <SelectItem value="week">{DASHBOARD.rangeWeek}</SelectItem>
              <SelectItem value="month">{DASHBOARD.rangeMonth}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? <LoadingSkeleton variant="stats" /> : null}

      {isError ? (
        <ErrorState
          error={error}
          title={DASHBOARD.loadFailed}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && data ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              highlight
              label={DASHBOARD.activeClients}
              value={data.stats.activeClients.value}
              delta={data.stats.activeClients.deltaPercent}
              subtitle={DASHBOARD.activeClientsHint}
              className="h-full"
            />
            <StatCard
              label={DASHBOARD.appointmentsToday}
              value={data.stats.appointments.value}
              delta={data.stats.appointments.deltaPercent}
              subtitle={`${data.stats.appointments.walkIns} ${DASHBOARD.walkIns}`}
              className="h-full"
            />
            {showMoney && data.stats.revenue ? (
              <StatCard
                label={DASHBOARD.revenue}
                value={data.stats.revenue.value}
                format="inr"
                delta={data.stats.revenue.deltaPercent}
                className="h-full"
              />
            ) : null}
            {showMoney && data.stats.collectionToday ? (
              <StatCard
                label={DASHBOARD.collectionToday}
                value={data.stats.collectionToday.value}
                format="inr"
                subtitle={
                  data.stats.collectionToday.tips > 0
                    ? `${DASHBOARD.tipsLine}: ${formatINR(data.stats.collectionToday.tips)}`
                    : undefined
                }
                className="h-full"
              />
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <Card className="flex h-full flex-col lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{DASHBOARD.appointmentsToday}</CardTitle>
                <Button asChild variant="link" size="sm" className="h-auto px-0">
                  <Link to={ROUTES.appointments}>{DASHBOARD.viewAll}</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {data.todaysAppointments.length === 0 ? (
                  <EmptyState title={DASHBOARD.emptyAppointments} />
                ) : (
                  data.todaysAppointments.slice(0, 8).map((row) => (
                    <Link
                      key={row.id}
                      to={`${ROUTES.appointments}?date=${format(new Date(), 'yyyy-MM-dd')}&id=${row.id}`}
                      className={cn(
                        'flex gap-3 rounded-xl border border-border border-l-4 bg-card p-2.5 transition-colors hover:bg-muted/40',
                        statusBorder(row.status),
                        row.isUpcoming && 'ring-2 ring-gold',
                      )}
                    >
                      <div className="w-12 shrink-0 text-xs font-semibold tabular-nums text-gold-deep">
                        {row.startTime}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {row.customerName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.services.join(', ')}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {row.staffNames.join(', ')}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col lg:col-span-3">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{DASHBOARD.revenueStatistics}</CardTitle>
                {showMoney ? (
                  <div className="flex gap-1 rounded-full bg-muted p-0.5">
                    {(
                      [
                        ['revenue', DASHBOARD.revenue],
                        ['services', DASHBOARD.servicesLegend],
                        ['products', DASHBOARD.productsLegend],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[11px] font-medium',
                          chartMode === key
                            ? 'bg-gold-soft text-gold-deep'
                            : 'text-muted-foreground',
                        )}
                        onClick={() => setChartMode(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="flex-1">
                {showMoney && data.monthlyRevenue?.length ? (
                  data.monthlyRevenue.some((m) => m.revenue > 0) ? (
                    <MonthlyRevenueChart
                      data={data.monthlyRevenue}
                      mode={chartMode}
                    />
                  ) : (
                    <EmptyState title={DASHBOARD.emptyTrend} />
                  )
                ) : (
                  <EmptyState title={DASHBOARD.emptyTrend} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Card className="flex h-full flex-col">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{DASHBOARD.topPerformers}</CardTitle>
                {showMoney ? (
                  <Button asChild variant="link" size="sm" className="h-auto px-0">
                    <Link to={ROUTES.reportsStaff}>{DASHBOARD.viewAll}</Link>
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {!showMoney || !data.topPerformers?.length ? (
                  <EmptyState title={DASHBOARD.emptyStaff} />
                ) : (
                  data.topPerformers.map((staff, idx) => {
                    const max = data.topPerformers![0]?.sales || 1
                    const pct = Math.round((staff.sales / max) * 100)
                    return (
                      <div key={staff.staffId} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium">
                            <span className="mr-1.5 text-muted-foreground">
                              {idx + 1}.
                            </span>
                            {staff.name}
                          </span>
                          <span className="tabular-nums text-gold-deep">
                            {formatINR(staff.sales)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-chart-track">
                          <div
                            className="h-full rounded-full bg-chart-1"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col">
              <CardHeader className="pb-2">
                <CardTitle>{DASHBOARD.todaysProgress}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <ProgressGauge
                  percent={data.todaysProgress.percent}
                  label={`${data.todaysProgress.completed}/${data.todaysProgress.total}`}
                  detail={DASHBOARD.appointmentsCompleted}
                />
                {showMoney && data.todaysProgress.paymentSplit ? (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {(
                      [
                        [
                          'cash',
                          DASHBOARD.cash,
                          data.todaysProgress.paymentSplit.cash,
                        ],
                        [
                          'upi',
                          DASHBOARD.upi,
                          data.todaysProgress.paymentSplit.upi,
                        ],
                        [
                          'card',
                          DASHBOARD.card,
                          data.todaysProgress.paymentSplit.card,
                        ],
                      ] as const
                    ).map(([key, label, amount]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-border bg-muted/40 px-2 py-2"
                      >
                        <p className="text-muted-foreground">{label}</p>
                        <p className="mt-0.5 font-semibold tabular-nums">
                          {formatINR(amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col md:col-span-2 xl:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle>{DASHBOARD.recentCustomers}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {data.recentCustomers.length === 0 ? (
                  <EmptyState title={DASHBOARD.emptyCustomers} />
                ) : (
                  data.recentCustomers.map((c) => (
                    <Link
                      key={c.id}
                      to={ROUTES.customerDetail(c.id)}
                      className="flex items-center gap-3 rounded-xl border border-border p-2 hover:bg-muted/40"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-gold-soft text-xs font-semibold text-gold-deep">
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.lastService || '—'}
                          {c.lastVisit
                            ? ` · ${format(parseISO(c.lastVisit), 'dd MMM')}`
                            : ''}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        <p>
                          {c.visitCount} {DASHBOARD.visits}
                        </p>
                        {data.loyaltyEnabled && c.points != null ? (
                          <p className="text-gold-deep">
                            {c.points} {DASHBOARD.points}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
