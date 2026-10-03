import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IndianRupee, Receipt, Wallet } from 'lucide-react'

import { DateRangeFilter } from '@/app/components/DateRangeFilter'
import {
  SalesSeriesChart,
  ServiceProductSplitChart,
} from '@/app/components/charts/ReportCharts'
import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { COMMON, REPORTS, ROUTES } from '@/app/constants'
import { useSalesReportQuery } from '@/app/hooks/queries/useReportsQuery'
import { useCanExportReports } from '@/app/hooks/useCanExportReports'
import { useReportRangeParams } from '@/app/hooks/useReportRangeParams'
import {
  ReportPageLayout,
  ReportPagination,
} from '@/app/screens/reports/ReportPageLayout'
import { reportsApi, type SalesBillRow } from '@/app/service/reports/reportsApi'
import { downloadCsv, formatMoneyOrDash } from '@/app/utils'

type ChartSeries = 'total' | 'services' | 'products'

const columns: ColumnDef<SalesBillRow>[] = [
  {
    accessorKey: 'invoiceNumber',
    header: REPORTS.sales.table.invoice,
    cell: ({ row }) => (
      <Link
        to={ROUTES.invoice(row.original.id)}
        className="font-medium text-foreground underline-offset-2 hover:underline"
      >
        {row.original.invoiceNumber || row.original.id.slice(-6)}
      </Link>
    ),
  },
  { accessorKey: 'date', header: REPORTS.sales.table.date },
  { accessorKey: 'customerName', header: REPORTS.sales.table.customer },
  { accessorKey: 'itemsCount', header: REPORTS.sales.table.items },
  {
    accessorKey: 'revenue',
    header: REPORTS.sales.table.revenue,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
  {
    accessorKey: 'tip',
    header: REPORTS.sales.table.tip,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
  { accessorKey: 'paymentMode', header: REPORTS.sales.table.payment },
  { accessorKey: 'status', header: REPORTS.sales.table.status },
]

export function SalesReportScreen() {
  const { range, from, to, setRange } = useReportRangeParams()
  const canExport = useCanExportReports()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [chartSeries, setChartSeries] = useState<ChartSeries>('total')

  const query = useSalesReportQuery({
    from,
    to,
    page,
    limit: 25,
    q: search || undefined,
    chartSeries,
  })

  const data = query.data
  const empty = Boolean(data && data.table.total === 0 && !search)
  const totalPages = data
    ? Math.max(1, Math.ceil(data.table.total / data.table.limit))
    : 1

  const chartData = useMemo(() => {
    if (!data) return []
    return data.chart.series.map((p) => ({
      key: p.key.length > 10 ? p.key.slice(5) : p.key,
      value:
        Number(
          chartSeries === 'services'
            ? p.services
            : chartSeries === 'products'
              ? p.products
              : p.total,
        ) || 0,
    }))
  }, [data, chartSeries])

  const exportCsv = async () => {
    const payload = await reportsApi.salesExport({
      from,
      to,
      q: search || undefined,
    })
    downloadCsv(payload.filename, payload.headers, payload.rows)
  }

  return (
    <ReportPageLayout
      title={REPORTS.sales.title}
      description={REPORTS.sales.description}
      canExport={canExport}
      onExport={() => void exportCsv()}
      exportDisabled={query.isLoading || query.isError || empty}
      filters={
        <>
          <DateRangeFilter
            value={range}
            onChange={(r) => {
              setPage(1)
              setRange(r)
            }}
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1)
                setSearch(q.trim())
              }
            }}
            placeholder={REPORTS.sales.searchPlaceholder}
            className="max-w-sm"
          />
        </>
      }
      kpis={
        query.isLoading ? (
          <LoadingSkeleton variant="stats" />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            title={COMMON.errors.loadFailed}
            onRetry={() => void query.refetch()}
          />
        ) : data && !empty ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <StatCard
              label={REPORTS.sales.kpis.revenue}
              value={data.kpis.revenue}
              format="inr"
              delta={data.kpis.revenueChange}
              icon={IndianRupee}
            />
            <StatCard
              label={REPORTS.sales.kpis.bills}
              value={data.kpis.billCount}
              delta={data.kpis.billCountChange}
              icon={Receipt}
            />
            <StatCard
              label={REPORTS.sales.kpis.avgBill}
              value={data.kpis.averageBill}
              format="inr"
              delta={data.kpis.averageBillChange}
              icon={Wallet}
            />
            <StatCard
              label={REPORTS.sales.kpis.tips}
              value={data.kpis.tips}
              format="inr"
              delta={data.kpis.tipsChange}
              icon={Wallet}
            />
          </div>
        ) : null
      }
      chart={
        !query.isLoading && !query.isError && data && !empty ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-1">
                <CardTitle>{REPORTS.sales.chart.title}</CardTitle>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['total', REPORTS.sales.chart.total],
                      ['services', REPORTS.sales.chart.services],
                      ['products', REPORTS.sales.chart.products],
                    ] as const
                  ).map(([id, label]) => (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={chartSeries === id ? 'default' : 'outline'}
                      className="h-8"
                      onClick={() => setChartSeries(id)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <SalesSeriesChart data={chartData} />
              </CardContent>
            </Card>
            <div className="space-y-3">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle>{REPORTS.sales.splits.services}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceProductSplitChart
                    service={data.splits.serviceAmount ?? 0}
                    product={data.splits.productAmount ?? 0}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle>{REPORTS.sales.splits.paymentModes}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {data.splits.paymentModes.map((m) => {
                    const modeLabel =
                      COMMON.paymentMode[m.mode as keyof typeof COMMON.paymentMode] ??
                      m.mode
                    return (
                      <div
                        key={m.mode}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-muted-foreground">{modeLabel}</span>
                        <span className="tabular-nums">
                          {formatMoneyOrDash(m.amount)}
                          {m.pct != null ? ` · ${m.pct}%` : ''}
                        </span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null
      }
      table={
        !query.isLoading && !query.isError && data ? (
          empty ? (
            <EmptyState
              title={REPORTS.sales.emptyTitle}
              description={REPORTS.sales.emptyHint}
            />
          ) : (
            <Card>
              <CardHeader className="pb-1">
                <CardTitle>{REPORTS.sales.table.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ResponsiveTable
                  data={data.table.items}
                  columns={columns}
                  mobileTitleKey="invoiceNumber"
                  emptyTitle={REPORTS.shared.emptyBills}
                  emptyDescription={REPORTS.shared.emptyHint}
                />
                <ReportPagination
                  page={page}
                  totalPages={totalPages}
                  total={data.table.total}
                  onPageChange={setPage}
                />
              </CardContent>
            </Card>
          )
        ) : query.isLoading ? (
          <LoadingSkeleton rows={6} />
        ) : null
      }
    />
  )
}
