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
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { useSalesReportQuery } from '@/app/hooks/queries/useReportsQuery'
import type { StaffSaleRow } from '@/app/service/mocks/reportMocks'
import { downloadCsv, formatINR, formatNumber } from '@/app/utils'

const staffColumns: ColumnDef<StaffSaleRow>[] = [
  { accessorKey: 'staffName', header: 'Staff' },
  {
    accessorKey: 'bookings',
    header: 'Bookings',
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: 'services',
    header: 'Services',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
  {
    accessorKey: 'products',
    header: 'Products',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
  {
    accessorKey: 'total',
    header: 'Total',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
]

export function SalesReportScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const { data, isLoading, isError, error, refetch } = useSalesReportQuery(range)

  const splitNote = useMemo(
    () =>
      `Service ${formatINR(data.mock.serviceRevenue)} · Product ${formatINR(data.mock.productRevenue)}`,
    [data.mock.productRevenue, data.mock.serviceRevenue],
  )

  const exportCsv = () => {
    downloadCsv(
      `sales-staff-${range.from.toISOString().slice(0, 10)}.csv`,
      ['Staff', 'Bookings', 'Services', 'Products', 'Total'],
      data.mock.staffSales.map((row) => [
        row.staffName,
        row.bookings,
        row.services,
        row.products,
        row.total,
      ]),
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Collection by staff, services, and products."
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-touch h-9"
            onClick={exportCsv}
            disabled={isLoading || isError}
          >
            <Download className="size-4" strokeWidth={1.75} />
            Export CSV
          </Button>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      {import.meta.env.DEV && data.usingMock ? (
        <Badge variant="outline" className="rounded-md font-normal text-[11px]">
          MOCK money data · {data.bookingsCount} bookings from API · CSV client-side
        </Badge>
      ) : null}

      {isLoading ? (
        <>
          <LoadingSkeleton variant="stats" />
          <LoadingSkeleton variant="chart" />
        </>
      ) : null}

      {isError ? (
        <ErrorState error={error} title="Sales report failed" onRetry={() => void refetch()} />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <StatCard
              label="Total revenue"
              value={data.mock.totalRevenue}
              format="inr"
              delta={data.mock.revenueDelta}
            />
            <StatCard label="Bookings" value={data.bookingsCount} />
            <StatCard
              label="Service sales"
              value={data.mock.serviceRevenue}
              format="inr"
            />
            <StatCard
              label="Product sales"
              value={data.mock.productRevenue}
              format="inr"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-1">
                <CardTitle>Revenue trend</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueTrendChart data={data.mock.revenueTrend} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1">
                <CardTitle>Service vs product</CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceProductSplitChart
                  service={data.mock.serviceRevenue}
                  product={data.mock.productRevenue}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {splitNote}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Staff-wise sales</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable
                data={data.mock.staffSales}
                columns={staffColumns}
                mobileTitleKey="staffName"
                emptyTitle="No staff sales"
                emptyDescription="No sales recorded for this date range."
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
