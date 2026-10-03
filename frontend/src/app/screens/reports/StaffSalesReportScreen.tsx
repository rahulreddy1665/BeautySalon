import { useState } from 'react'
import { ChevronDown, ChevronRight, IndianRupee, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DateRangeFilter } from '@/app/components/DateRangeFilter'
import { HorizontalStaffBarsChart } from '@/app/components/charts/ReportCharts'
import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { COMMON, REPORTS, ROUTES } from '@/app/constants'
import {
  useStaffLinesQuery,
  useStaffReportQuery,
} from '@/app/hooks/queries/useReportsQuery'
import { useCanExportReports } from '@/app/hooks/useCanExportReports'
import { useReportRangeParams } from '@/app/hooks/useReportRangeParams'
import {
  ReportPageLayout,
  ReportPagination,
} from '@/app/screens/reports/ReportPageLayout'
import { reportsApi, type StaffReportRow } from '@/app/service/reports/reportsApi'
import { downloadCsv, formatMoneyOrDash, formatNumber } from '@/app/utils'

function StaffLinesPanel({
  staffId,
  from,
  to,
}: {
  staffId: string
  from: string
  to: string
}) {
  const lines = useStaffLinesQuery(staffId, { from, to }, true)
  if (lines.isLoading) return <LoadingSkeleton rows={3} />
  if (lines.isError) {
    return (
      <ErrorState
        error={lines.error}
        title={COMMON.errors.loadFailed}
        onRetry={() => void lines.refetch()}
      />
    )
  }
  const items = lines.data?.items ?? []
  if (items.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        {REPORTS.shared.emptyHint}
      </p>
    )
  }
  return (
    <div className="space-y-1 border-t border-border bg-muted/30 px-3 py-2">
      {items.map((line, idx) => (
        <div
          key={`${line.invoiceId}-${line.name}-${idx}`}
          className="flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <div className="min-w-0">
            <Link
              to={ROUTES.invoice(line.invoiceId)}
              className="font-medium underline-offset-2 hover:underline"
            >
              {line.invoiceNumber || line.invoiceId.slice(-6)}
            </Link>
            <span className="text-muted-foreground">
              {' '}
              · {line.date} · {line.type} · {line.name} ×{line.qty}
            </span>
          </div>
          <span className="tabular-nums">{formatMoneyOrDash(line.attributed)}</span>
        </div>
      ))}
    </div>
  )
}

export function StaffSalesReportScreen() {
  const { range, from, to, setRange } = useReportRangeParams()
  const canExport = useCanExportReports()
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const query = useStaffReportQuery({ from, to, page, limit: 25 })
  const data = query.data
  const empty = Boolean(data && data.table.total === 0)
  const totalPages = data
    ? Math.max(1, Math.ceil(data.table.total / data.table.limit))
    : 1

  const columns: ColumnDef<StaffReportRow>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        const id = row.original.staffId
        const open = expanded === id
        return (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={open ? REPORTS.staff.table.collapse : REPORTS.staff.table.expand}
            onClick={() => setExpanded(open ? null : id)}
          >
            {open ? (
              <ChevronDown className="size-4" strokeWidth={1.75} />
            ) : (
              <ChevronRight className="size-4" strokeWidth={1.75} />
            )}
          </Button>
        )
      },
    },
    { accessorKey: 'rank', header: REPORTS.staff.table.rank },
    { accessorKey: 'staffName', header: REPORTS.staff.table.staff },
    {
      accessorKey: 'servicesDone',
      header: REPORTS.staff.table.servicesDone,
      cell: ({ getValue }) => formatNumber(Number(getValue())),
    },
    {
      accessorKey: 'serviceSales',
      header: REPORTS.staff.table.serviceSales,
      cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
    },
    {
      accessorKey: 'productSales',
      header: REPORTS.staff.table.productSales,
      cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
    },
    {
      accessorKey: 'totalSales',
      header: REPORTS.staff.table.totalSales,
      cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
    },
    {
      accessorKey: 'averageTicket',
      header: REPORTS.staff.table.averageTicket,
      cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
    },
    {
      accessorKey: 'salesChange',
      header: REPORTS.staff.table.salesChange,
      cell: ({ getValue }) => {
        const v = getValue() as number | null
        if (v == null) return REPORTS.shared.dash
        return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
      },
    },
  ]

  const chartData =
    data?.chart
      .filter((r) => r.totalSales != null)
      .map((r) => ({ name: r.staffName, value: r.totalSales ?? 0 })) ?? []

  const exportCsv = async () => {
    const payload = await reportsApi.staffExport({ from, to })
    downloadCsv(payload.filename, payload.headers, payload.rows)
  }

  return (
    <ReportPageLayout
      title={REPORTS.staff.title}
      description={REPORTS.staff.description}
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
              label={REPORTS.staff.kpis.totalSales}
              value={data.kpis.totalSales}
              format="inr"
              delta={data.kpis.totalSalesChange}
              icon={IndianRupee}
            />
            <StatCard
              label={REPORTS.staff.kpis.topPerformer}
              value={data.kpis.topPerformerSales}
              format="inr"
              subtitle={data.kpis.topPerformerName ?? undefined}
              icon={UserRound}
            />
            <StatCard
              label={REPORTS.staff.kpis.servicesDone}
              value={data.kpis.servicesDone}
              delta={data.kpis.servicesDoneChange}
              icon={UserRound}
            />
            <StatCard
              label={REPORTS.staff.kpis.averageTicket}
              value={data.kpis.averageTicket}
              format="inr"
              delta={data.kpis.averageTicketChange}
              icon={IndianRupee}
            />
          </div>
        ) : null
      }
      chart={
        !query.isLoading && !query.isError && data && !empty && chartData.length ? (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{REPORTS.staff.chart.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <HorizontalStaffBarsChart data={chartData} />
            </CardContent>
          </Card>
        ) : null
      }
      table={
        !query.isLoading && !query.isError && data ? (
          empty ? (
            <EmptyState
              title={REPORTS.staff.emptyTitle}
              description={REPORTS.staff.emptyHint}
            />
          ) : (
            <Card>
              <CardContent className="space-y-0 pt-4">
                <ResponsiveTable
                  data={data.table.items}
                  columns={columns}
                  mobileTitleKey="staffName"
                  emptyTitle={REPORTS.staff.emptyTitle}
                />
                {expanded ? (
                  <StaffLinesPanel staffId={expanded} from={from} to={to} />
                ) : null}
                <div className="pt-3">
                  <ReportPagination
                    page={page}
                    totalPages={totalPages}
                    total={data.table.total}
                    onPageChange={setPage}
                  />
                </div>
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
