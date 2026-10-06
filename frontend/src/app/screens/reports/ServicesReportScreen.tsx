import { useState } from 'react'
import { IndianRupee, Scissors } from 'lucide-react'

import { DateRangeFilter } from '@/app/components/DateRangeFilter'
import { TopItemsBarChart } from '@/app/components/charts/ReportCharts'
import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { COMMON, REPORTS } from '@/app/constants'
import { useServicesReportQuery } from '@/app/hooks/queries/useReportsQuery'
import { useServiceCategoriesQuery } from '@/app/hooks/queries/useServicesQuery'
import { useCanExportReports } from '@/app/hooks/useCanExportReports'
import { useReportRangeParams } from '@/app/hooks/useReportRangeParams'
import {
  ReportPageLayout,
  ReportPagination,
} from '@/app/screens/reports/ReportPageLayout'
import { reportsApi } from '@/app/service/reports/reportsApi'
import { downloadCsv, formatMoneyOrDash, formatNumber } from '@/app/utils'

type ServiceRow = {
  serviceId: string
  name: string
  category: string
  timesSold: number
  revenue: number | null
  listPrice: number | null
  avgPriceCharged: number | null
  discountPctEffect: number | null
  revenueShare: number | null
}

const columns: ColumnDef<ServiceRow>[] = [
  { accessorKey: 'name', header: REPORTS.services.table.name },
  { accessorKey: 'category', header: REPORTS.services.table.category },
  {
    accessorKey: 'timesSold',
    header: REPORTS.services.table.timesSold,
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: 'revenue',
    header: REPORTS.services.table.revenue,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
  {
    accessorKey: 'listPrice',
    header: REPORTS.services.table.listPrice,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
  {
    accessorKey: 'avgPriceCharged',
    header: REPORTS.services.table.avgPriceCharged,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
  {
    accessorKey: 'discountPctEffect',
    header: REPORTS.services.table.discountPctEffect,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return v == null ? REPORTS.shared.dash : `${v.toFixed(1)}%`
    },
  },
  {
    accessorKey: 'revenueShare',
    header: REPORTS.services.table.revenueShare,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return v == null ? REPORTS.shared.dash : `${v.toFixed(1)}%`
    },
  },
]

export function ServicesReportScreen() {
  const { range, from, to, setRange } = useReportRangeParams()
  const canExport = useCanExportReports()
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState('all')
  const [notSold, setNotSold] = useState(false)
  const [chartMode, setChartMode] = useState<'revenue' | 'count'>('revenue')
  const categoriesQuery = useServiceCategoriesQuery()

  const query = useServicesReportQuery({
    from,
    to,
    page,
    limit: 25,
    category: category === 'all' ? undefined : category,
    notSold: notSold || undefined,
  })
  const data = query.data
  const empty = Boolean(data && data.table.total === 0)
  const totalPages = data
    ? Math.max(1, Math.ceil(data.table.total / data.table.limit))
    : 1

  const chartData =
    chartMode === 'revenue'
      ? (data?.chart.byRevenue ?? [])
          .filter((r) => r.revenue != null)
          .map((r) => ({ name: r.name, value: r.revenue ?? 0 }))
      : (data?.chart.byCount ?? []).map((r) => ({
          name: r.name,
          value: r.timesSold,
        }))

  const exportCsv = async () => {
    const payload = await reportsApi.servicesExport({
      from,
      to,
      category: category === 'all' ? undefined : category,
      notSold: notSold || undefined,
    })
    downloadCsv(payload.filename, payload.headers, payload.rows)
  }

  return (
    <ReportPageLayout
      title={REPORTS.services.title}
      description={REPORTS.services.description}
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
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder={REPORTS.services.filters.category} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {REPORTS.services.filters.allCategories}
                </SelectItem>
                {(categoriesQuery.data ?? []).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant={notSold ? 'default' : 'outline'}
              className="h-9"
              onClick={() => {
                setNotSold((v) => !v)
                setPage(1)
              }}
            >
              {REPORTS.services.filters.notSold}
            </Button>
          </div>
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
              label={REPORTS.services.kpis.soldCount}
              value={data.kpis.soldCount}
              icon={Scissors}
            />
            <StatCard
              label={REPORTS.services.kpis.revenue}
              value={data.kpis.revenue}
              format="inr"
              icon={IndianRupee}
            />
            <StatCard
              label={REPORTS.services.kpis.distinctCount}
              value={data.kpis.distinctCount}
              icon={Scissors}
            />
            <StatCard
              label={REPORTS.services.kpis.avgDiscountPct}
              value={data.kpis.avgDiscountPct}
              format="percent"
              icon={IndianRupee}
            />
          </div>
        ) : null
      }
      chart={
        !query.isLoading &&
        !query.isError &&
        data &&
        !empty &&
        !notSold &&
        chartData.length ? (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-1">
              <CardTitle>{REPORTS.services.chart.title}</CardTitle>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={chartMode === 'revenue' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => setChartMode('revenue')}
                >
                  {REPORTS.services.chart.byRevenue}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={chartMode === 'count' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => setChartMode('count')}
                >
                  {REPORTS.services.chart.byCount}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden px-2 pb-4 sm:px-4">
              <TopItemsBarChart data={chartData} valueAsMoney={chartMode === 'revenue'} />
            </CardContent>
          </Card>
        ) : null
      }
      table={
        !query.isLoading && !query.isError && data ? (
          empty ? (
            <EmptyState
              title={REPORTS.services.emptyTitle}
              description={REPORTS.services.emptyHint}
            />
          ) : (
            <Card>
              <CardContent className="space-y-3 pt-4">
                <ResponsiveTable
                  data={data.table.items as ServiceRow[]}
                  columns={columns}
                  mobileTitleKey="name"
                  emptyTitle={REPORTS.services.emptyTitle}
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
