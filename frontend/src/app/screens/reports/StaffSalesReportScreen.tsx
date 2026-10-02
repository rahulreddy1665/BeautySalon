import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  DateRangeFilter,
  defaultTodayRange,
  type DateRange,
} from '@/app/components/DateRangeFilter'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  useStaffSalesReportQuery,
  type StaffIncentiveRow,
} from '@/app/hooks/queries/useReportsQuery'
import { downloadCsv, formatINR, formatNumber } from '@/app/utils'

const columns: ColumnDef<StaffIncentiveRow>[] = [
  { accessorKey: 'staffName', header: 'Staff' },
  {
    accessorKey: 'bookings',
    header: 'Bookings',
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: 'servicesSales',
    header: 'Services',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
  {
    accessorKey: 'productSales',
    header: 'Products',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
  {
    accessorKey: 'totalSales',
    header: 'Total',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
  {
    accessorKey: 'incentiveRatePercent',
    header: 'Rate',
    cell: ({ getValue }) => `${Number(getValue())}%`,
  },
  {
    accessorKey: 'incentiveEarned',
    header: 'Incentive',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
]

export function StaffSalesReportScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const { data, isLoading, isError, error, refetch } =
    useStaffSalesReportQuery(range)

  const exportCsv = () => {
    downloadCsv(
      `staff-sales-${range.from.toISOString().slice(0, 10)}.csv`,
      [
        'Staff',
        'Bookings',
        'Services',
        'Products',
        'Total',
        'Incentive %',
        'Incentive ₹',
      ],
      data.rows.map((row) => [
        row.staffName,
        row.bookings,
        row.servicesSales,
        row.productSales,
        row.totalSales,
        row.incentiveRatePercent,
        row.incentiveEarned,
      ]),
    )
  }

  const subtitle = useMemo(
    () =>
      `${data.staffCount} staff · incentives at mock rate on service+product sales`,
    [data.staffCount],
  )

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description={subtitle}
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-touch h-9"
            onClick={exportCsv}
            disabled={isLoading || isError || data.rows.length === 0}
          >
            <Download className="size-4" strokeWidth={1.75} />
            Export CSV
          </Button>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      {import.meta.env.DEV && data.usingMock ? (
        <Badge variant="outline" className="rounded-md font-normal text-[11px]">
          MOCK sales/incentives · staff names from /api/user · CSV client-side
        </Badge>
      ) : null}

      {isLoading ? (
        <>
          <LoadingSkeleton variant="stats" />
          <LoadingSkeleton rows={5} />
        </>
      ) : null}

      {isError ? (
        <ErrorState
          error={error}
          title="Staff sales report failed"
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <StatCard label="Staff" value={data.staffCount} />
            <StatCard label="Bookings" value={data.totals.bookings} />
            <StatCard label="Total sales" value={data.totals.sales} format="inr" />
            <StatCard
              label="Incentives"
              value={data.totals.incentives}
              format="inr"
            />
          </div>

          <ResponsiveTable
            data={data.rows}
            columns={columns}
            mobileTitleKey="staffName"
            emptyTitle="No staff on roster"
            emptyDescription="Add staff to see sales and incentives."
          />
        </>
      ) : null}
    </div>
  )
}
