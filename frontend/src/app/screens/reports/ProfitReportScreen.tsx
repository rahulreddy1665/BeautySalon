import { Download } from 'lucide-react'
import { useState } from 'react'

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
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { useProfitReportQuery } from '@/app/hooks/queries/useReportsQuery'
import type { ProfitBreakdownRow } from '@/app/service/mocks/reportMocks'
import { downloadCsv, formatINR } from '@/app/utils'

const breakdownColumns: ColumnDef<ProfitBreakdownRow>[] = [
  { accessorKey: 'category', header: 'Category' },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }) => {
      const type = String(getValue())
      return type === 'revenue' ? 'Revenue' : 'Expense'
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row, getValue }) => {
      const amount = formatINR(Number(getValue()))
      return row.original.type === 'expense' ? `− ${amount}` : amount
    },
  },
]

export function ProfitReportScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const { data, isLoading, isError, error, refetch } = useProfitReportQuery(range)

  const exportCsv = () => {
    downloadCsv(
      `profit-breakdown-${range.from.toISOString().slice(0, 10)}.csv`,
      ['Category', 'Type', 'Amount'],
      data.mock.breakdown.map((row) => [row.category, row.type, row.amount]),
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Revenue, expenses, and net profit for the selected range."
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
          MOCK finance data · {data.bookingsCount} bookings from API · CSV client-side
        </Badge>
      ) : null}

      {isLoading ? (
        <>
          <LoadingSkeleton variant="stats" />
          <LoadingSkeleton rows={6} />
        </>
      ) : null}

      {isError ? (
        <ErrorState error={error} title="Profit report failed" onRetry={() => void refetch()} />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
            <StatCard label="Revenue" value={data.mock.revenue} format="inr" />
            <StatCard label="Expenses" value={data.mock.expenses} format="inr" />
            <StatCard
              label="Net profit"
              value={data.mock.netProfit}
              format="inr"
              delta={data.mock.profitDelta}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Profit breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable
                data={data.mock.breakdown}
                columns={breakdownColumns}
                mobileTitleKey="category"
                emptyTitle="No breakdown"
                emptyDescription="No profit lines for this date range."
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
