import { useState } from 'react'
import { CalendarDays, Percent } from 'lucide-react'

import { DateRangeFilter } from '@/app/components/DateRangeFilter'
import {
  BusyHoursGrid,
  StatusBreakdownChart,
  WalkInVsAppointmentChart,
} from '@/app/components/charts/ReportCharts'
import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { APPOINTMENTS, COMMON, REPORTS } from '@/app/constants'
import { APPOINTMENT_STATUSES } from '@/app/constants/enums'
import { useAppointmentsReportQuery } from '@/app/hooks/queries/useReportsQuery'
import { useStaffListQuery } from '@/app/hooks/queries/useStaffQuery'
import { useCanExportReports } from '@/app/hooks/useCanExportReports'
import { useReportRangeParams } from '@/app/hooks/useReportRangeParams'
import {
  ReportPageLayout,
  ReportPagination,
} from '@/app/screens/reports/ReportPageLayout'
import { reportsApi } from '@/app/service/reports/reportsApi'
import { downloadCsv } from '@/app/utils'

type ApptRow = {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  customerName: string
  staffNames: string[]
  services: string[]
  hasInvoice: boolean
}

const DAY_LABELS = [
  REPORTS.appointments.days.sun,
  REPORTS.appointments.days.mon,
  REPORTS.appointments.days.tue,
  REPORTS.appointments.days.wed,
  REPORTS.appointments.days.thu,
  REPORTS.appointments.days.fri,
  REPORTS.appointments.days.sat,
]

function statusLabel(status: string): string {
  const map = APPOINTMENTS.status as Record<string, string>
  return map[status] ?? status
}

const columns: ColumnDef<ApptRow>[] = [
  { accessorKey: 'date', header: REPORTS.appointments.table.date },
  {
    id: 'time',
    header: REPORTS.appointments.table.time,
    cell: ({ row }) => `${row.original.startTime}–${row.original.endTime}`,
  },
  {
    accessorKey: 'status',
    header: REPORTS.appointments.table.status,
    cell: ({ getValue }) => statusLabel(String(getValue())),
  },
  { accessorKey: 'customerName', header: REPORTS.appointments.table.customer },
  {
    id: 'staff',
    header: REPORTS.appointments.table.staff,
    cell: ({ row }) => row.original.staffNames.join(', '),
  },
  {
    id: 'services',
    header: REPORTS.appointments.table.services,
    cell: ({ row }) => row.original.services.join(', '),
  },
  {
    accessorKey: 'hasInvoice',
    header: REPORTS.appointments.table.billed,
    cell: ({ getValue }) => (getValue() ? COMMON.labels.yes : COMMON.labels.no),
  },
]

export function AppointmentsReportScreen() {
  const { range, from, to, setRange } = useReportRangeParams()
  const canExport = useCanExportReports()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<string>('all')
  const [staffId, setStaffId] = useState<string>('all')
  const staffQuery = useStaffListQuery({ page: 1, limit: 100 })

  const query = useAppointmentsReportQuery({
    from,
    to,
    page,
    limit: 25,
    status: status === 'all' ? undefined : status,
    staffId: staffId === 'all' ? undefined : staffId,
  })
  const data = query.data
  const empty = Boolean(data && data.kpis.total === 0)
  const totalPages = data
    ? Math.max(1, Math.ceil(data.table.total / data.table.limit))
    : 1

  const exportCsv = async () => {
    const payload = await reportsApi.appointmentsExport({
      from,
      to,
      status: status === 'all' ? undefined : status,
      staffId: staffId === 'all' ? undefined : staffId,
    })
    downloadCsv(payload.filename, payload.headers, payload.rows)
  }

  return (
    <ReportPageLayout
      title={REPORTS.appointments.title}
      description={REPORTS.appointments.description}
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
          <div className="flex flex-wrap gap-2">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder={REPORTS.appointments.filters.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {REPORTS.appointments.filters.allStatuses}
                </SelectItem>
                {APPOINTMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={staffId}
              onValueChange={(v) => {
                setStaffId(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder={REPORTS.appointments.filters.staff} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {REPORTS.appointments.filters.allStaff}
                </SelectItem>
                {(staffQuery.data?.items ?? []).map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
            <StatCard
              label={REPORTS.appointments.kpis.total}
              value={data.kpis.total}
              icon={CalendarDays}
            />
            <StatCard
              label={REPORTS.appointments.kpis.completed}
              value={data.kpis.completed}
              icon={CalendarDays}
            />
            <StatCard
              label={REPORTS.appointments.kpis.noShowRate}
              value={data.kpis.noShowRate}
              format="percent"
              icon={Percent}
            />
            <StatCard
              label={REPORTS.appointments.kpis.cancellationRate}
              value={data.kpis.cancellationRate}
              format="percent"
              icon={Percent}
            />
            <StatCard
              label={REPORTS.appointments.kpis.bookingToBill}
              value={data.kpis.bookingToBillRate}
              format="percent"
              icon={Percent}
            />
          </div>
        ) : null
      }
      chart={
        !query.isLoading && !query.isError && data && !empty ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle>{REPORTS.appointments.chart.statusTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusBreakdownChart
                  data={data.charts.statusBreakdown.map((s) => ({
                    ...s,
                    label: statusLabel(s.status),
                  }))}
                />
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader className="pb-1">
                <CardTitle>{REPORTS.appointments.chart.walkInTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <WalkInVsAppointmentChart
                  walkIn={data.charts.walkInVsAppointment.walkInBills}
                  appointment={data.charts.walkInVsAppointment.appointmentBills}
                />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader className="pb-1">
                <CardTitle>{REPORTS.appointments.chart.busyTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <BusyHoursGrid
                  days={data.charts.busyGrid.days}
                  hours={data.charts.busyGrid.hours}
                  cells={data.charts.busyGrid.cells}
                  dayLabels={DAY_LABELS}
                />
              </CardContent>
            </Card>
          </div>
        ) : null
      }
      table={
        !query.isLoading && !query.isError && data ? (
          empty ? (
            <EmptyState
              title={REPORTS.appointments.emptyTitle}
              description={REPORTS.appointments.emptyHint}
            />
          ) : (
            <Card>
              <CardContent className="space-y-3 pt-4">
                <ResponsiveTable
                  data={data.table.items as ApptRow[]}
                  columns={columns}
                  mobileTitleKey="customerName"
                  emptyTitle={REPORTS.appointments.emptyTitle}
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
