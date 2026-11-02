import { useState } from 'react'
import { IndianRupee, Package } from 'lucide-react'

import { DateRangeFilter } from '@/app/components/DateRangeFilter'
import { TopItemsBarChart } from '@/app/components/charts/ReportCharts'
import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { DEFAULT_PAGE_SIZE, Pagination } from '@/app/components/Pagination'
import { COMMON, REPORTS } from '@/app/constants'
import { useProductsReportQuery } from '@/app/hooks/queries/useReportsQuery'
import { useCanExportReports } from '@/app/hooks/useCanExportReports'
import { useReportRangeParams } from '@/app/hooks/useReportRangeParams'
import {
  ReportPageLayout,
} from '@/app/screens/reports/ReportPageLayout'
import { reportsApi } from '@/app/service/reports/reportsApi'
import { downloadCsv, formatMoneyOrDash, formatNumber } from '@/app/utils'

type ProductRow = {
  productId: string
  name: string
  timesSold: number
  revenue: number | null
  listPrice: number | null
  avgPriceCharged: number | null
  discountPctEffect: number | null
  revenueShare: number | null
  topSellerStaffName: string | null
}

type StaffProdRow = {
  staffId: string
  staffName: string
  revenue: number | null
  units: number
}

const columns: ColumnDef<ProductRow>[] = [
  { accessorKey: 'name', header: REPORTS.products.table.name },
  {
    accessorKey: 'timesSold',
    header: REPORTS.products.table.timesSold,
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: 'revenue',
    header: REPORTS.products.table.revenue,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
  {
    accessorKey: 'listPrice',
    header: REPORTS.products.table.listPrice,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
  {
    accessorKey: 'avgPriceCharged',
    header: REPORTS.products.table.avgPriceCharged,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
  {
    accessorKey: 'discountPctEffect',
    header: REPORTS.products.table.discountPctEffect,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return v == null ? REPORTS.shared.dash : `${v.toFixed(1)}%`
    },
  },
  {
    accessorKey: 'revenueShare',
    header: REPORTS.products.table.revenueShare,
    cell: ({ getValue }) => {
      const v = getValue() as number | null
      return v == null ? REPORTS.shared.dash : `${v.toFixed(1)}%`
    },
  },
  {
    accessorKey: 'topSellerStaffName',
    header: REPORTS.products.table.topSeller,
    cell: ({ getValue }) => String(getValue() ?? REPORTS.shared.dash),
  },
]

const staffColumns: ColumnDef<StaffProdRow>[] = [
  { accessorKey: 'staffName', header: REPORTS.products.staffTable.staff },
  {
    accessorKey: 'units',
    header: REPORTS.products.staffTable.units,
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: 'revenue',
    header: REPORTS.products.staffTable.revenue,
    cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
  },
]

export function ProductsReportScreen() {
  const { range, from, to, setRange } = useReportRangeParams()
  const canExport = useCanExportReports()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [chartMode, setChartMode] = useState<'revenue' | 'count'>('revenue')

  const query = useProductsReportQuery({ from, to, page, limit: pageSize })
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
    const payload = await reportsApi.productsExport({ from, to })
    downloadCsv(payload.filename, payload.headers, payload.rows)
  }

  return (
    <ReportPageLayout
      title={REPORTS.products.title}
      description={REPORTS.products.description}
      canExport={canExport}
      onExport={() => void exportCsv()}
      exportDisabled={query.isLoading || query.isError || empty}
      filters={
        <DateRangeFilter
          value={range}
          onChange={(r) => {
            setPage(1)
            setRange(r)
          }}
        />
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
              label={REPORTS.products.kpis.soldCount}
              value={data.kpis.soldCount}
              icon={Package}
            />
            <StatCard
              label={REPORTS.products.kpis.revenue}
              value={data.kpis.revenue}
              format="inr"
              icon={IndianRupee}
            />
            <StatCard
              label={REPORTS.products.kpis.distinctCount}
              value={data.kpis.distinctCount}
              icon={Package}
            />
            <StatCard
              label={REPORTS.products.kpis.avgDiscountPct}
              value={data.kpis.avgDiscountPct}
              format="percent"
              icon={IndianRupee}
            />
          </div>
        ) : null
      }
      chart={
        !query.isLoading && !query.isError && data && !empty && chartData.length ? (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-1">
              <CardTitle>{REPORTS.products.chart.title}</CardTitle>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={chartMode === 'revenue' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => setChartMode('revenue')}
                >
                  {REPORTS.products.chart.byRevenue}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={chartMode === 'count' ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => setChartMode('count')}
                >
                  {REPORTS.products.chart.byCount}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TopItemsBarChart data={chartData} valueAsMoney={chartMode === 'revenue'} />
            </CardContent>
          </Card>
        ) : null
      }
      table={
        !query.isLoading && !query.isError && data ? (
          empty ? (
            <EmptyState
              title={REPORTS.products.emptyTitle}
              description={REPORTS.products.emptyHint}
            />
          ) : (
            <div className="space-y-3">
              <Card>
                <CardContent className="space-y-3 pt-4">
                  <ResponsiveTable
                    data={data.table.items as ProductRow[]}
                    columns={columns}
                    mobileTitleKey="name"
                    emptyTitle={REPORTS.products.emptyTitle}
                  />
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={data.table.total}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size)
                      setPage(1)
                    }}
                  />
                </CardContent>
              </Card>
              {data.productSalesPerStaff.length ? (
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle>{REPORTS.products.staffTable.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveTable
                      data={data.productSalesPerStaff as StaffProdRow[]}
                      columns={staffColumns}
                      mobileTitleKey="staffName"
                      emptyTitle={REPORTS.products.emptyTitle}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )
        ) : query.isLoading ? (
          <LoadingSkeleton rows={6} />
        ) : null
      }
    />
  )
}
