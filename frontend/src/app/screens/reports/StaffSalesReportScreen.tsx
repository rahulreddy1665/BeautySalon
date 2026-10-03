import { Download } from 'lucide-react'
import { useState } from 'react'

import {
  DateRangeFilter,
  defaultTodayRange,
  type DateRange,
} from '@/app/components/DateRangeFilter'
import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Button } from '@/app/components/ui/button'
import { COMMON, REPORTS } from '@/app/constants'
import {
  useStaffSalesReportQuery,
  type StaffIncentiveRow,
} from '@/app/hooks/queries/useReportsQuery'
import { downloadCsv, formatINR } from '@/app/utils'

const columns: ColumnDef<StaffIncentiveRow>[] = [
  { accessorKey: 'staffName', header: COMMON.nav.staff },
  {
    accessorKey: 'servicesSales',
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

export function StaffSalesReportScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const { data, isLoading, isError, error, refetch } =
    useStaffSalesReportQuery(range)

  const exportCsv = () => {
    downloadCsv(
      `staff-sales-${range.from.toISOString().slice(0, 10)}.csv`,
      ['Staff', 'Services', 'Products', 'Total'],
      data.rows.map((row) => [
        row.staffName,
        row.servicesSales,
        row.productSales,
        row.totalSales,
      ]),
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description={REPORTS.staff.description}
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
            {COMMON.actions.exportCsv}
          </Button>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      {isLoading ? (
        <>
          <LoadingSkeleton variant="stats" />
          <LoadingSkeleton rows={5} />
        </>
      ) : null}

      {isError ? (
        <ErrorState
          error={error}
          title={COMMON.errors.loadFailed}
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && data.rows.length === 0 ? (
        <EmptyState
          title={REPORTS.staff.emptyTitle}
          description={REPORTS.staff.emptyHint}
        />
      ) : null}

      {!isLoading && !isError && data.rows.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
            <StatCard label={COMMON.nav.staff} value={data.staffCount} />
            <StatCard
              label={REPORTS.sales.totalRevenue}
              value={data.totals.sales}
              format="inr"
            />
          </div>
          <ResponsiveTable
            data={data.rows}
            columns={columns}
            mobileTitleKey="staffName"
            emptyTitle={REPORTS.staff.emptyTitle}
          />
        </>
      ) : null}
    </div>
  )
}
