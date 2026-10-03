import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  DateRangeFilter,
  defaultTodayRange,
  type DateRange,
} from '@/app/components/DateRangeFilter'
import {
  RevenueTrendChart,
  ServiceProductSplitChart,
} from '@/app/components/charts/ReportCharts'
import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { COMMON, REPORTS } from '@/app/constants'
import { useSalesReportQuery } from '@/app/hooks/queries/useReportsQuery'
import { downloadCsv, formatINR } from '@/app/utils'

type StaffRow = {
  staffName: string
  serviceSales: number
  productSales: number
  totalSales: number
}

const staffColumns: ColumnDef<StaffRow>[] = [
  { accessorKey: 'staffName', header: COMMON.nav.staff },
  {
    accessorKey: 'serviceSales',
    header: REPORTS.sales.serviceRevenue,
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
  {
    accessorKey: 'productSales',
    header: REPORTS.sales.productRevenue,
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
  {
    accessorKey: 'totalSales',
    header: COMMON.labels.total,
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
]

export function SalesReportScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const { data, isLoading, isError, error, refetch } = useSalesReportQuery(range)

  const splitNote = useMemo(() => {
    if (!data) return ''
    return `${REPORTS.sales.serviceRevenue} ${formatINR(data.serviceRevenue)} · ${REPORTS.sales.productRevenue} ${formatINR(data.productRevenue)}`
  }, [data])

  const exportCsv = () => {
    if (!data) return
    downloadCsv(
      `sales-staff-${range.from.toISOString().slice(0, 10)}.csv`,
      ['Staff', 'Services', 'Products', 'Total'],
      data.staffSales.map((row) => [
        row.staffName,
        row.serviceSales,
        row.productSales,
        row.totalSales,
      ]),
    )
  }

  const empty = Boolean(data && data.invoiceCount === 0)

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description={REPORTS.sales.description}
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-touch h-9"
            onClick={exportCsv}
            disabled={isLoading || isError || !data || empty}
          >
            <Download className="size-4" strokeWidth={1.75} />
            {COMMON.actions.exportCsv}
          </Button>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      {isLoading ? (
        <>
          <LoadingSkeleton variant="stats" />
          <LoadingSkeleton variant="chart" />
        </>
      ) : null}

      {isError ? (
        <ErrorState
          error={error}
          title={COMMON.errors.loadFailed}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && data && empty ? (
        <EmptyState
          title={REPORTS.sales.emptyTitle}
          description={REPORTS.sales.emptyHint}
        />
      ) : null}

      {!isLoading && !isError && data && !empty ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
            <StatCard
              label={REPORTS.sales.totalRevenue}
              value={data.totalRevenue}
              format="inr"
            />
            <StatCard
              label={REPORTS.sales.serviceRevenue}
              value={data.serviceRevenue}
              format="inr"
            />
            <StatCard
              label={REPORTS.sales.productRevenue}
              value={data.productRevenue}
              format="inr"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-1">
                <CardTitle>{REPORTS.sales.totalRevenue}</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueTrendChart data={data.revenueTrend} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle>
                  {REPORTS.sales.serviceRevenue} / {REPORTS.sales.productRevenue}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceProductSplitChart
                  service={data.serviceRevenue}
                  product={data.productRevenue}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {splitNote}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{REPORTS.staff.description}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable
                data={data.staffSales}
                columns={staffColumns}
                mobileTitleKey="staffName"
                emptyTitle={REPORTS.staff.emptyTitle}
                emptyDescription={REPORTS.staff.emptyHint}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
