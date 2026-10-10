import { useState } from 'react'
import { MessageCircle, UserPlus, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DateRangeFilter } from '@/app/components/DateRangeFilter'
import { NewReturningChart } from '@/app/components/charts/ReportCharts'
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
import { DEFAULT_PAGE_SIZE, Pagination } from '@/app/components/Pagination'
import { COMMON, REPORTS, ROUTES } from '@/app/constants'
import { useCustomersReportQuery } from '@/app/hooks/queries/useReportsQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { useCanExportReports } from '@/app/hooks/useCanExportReports'
import { useReportRangeParams } from '@/app/hooks/useReportRangeParams'
import {
  ReportPageLayout,
} from '@/app/screens/reports/ReportPageLayout'
import { reportsApi } from '@/app/service/reports/reportsApi'
import { downloadCsv, formatMoneyOrDash, formatNumber } from '@/app/utils'
import { fillWhatsAppMessage, normalizeWhatsAppPhone } from '@/app/utils/phone'

type Tab = 'top' | 'inactive'

type CustomerRow = {
  customerId: string
  name: string
  phone: string
  spend: number | null
  visits: number
  averageTicket?: number | null
  lastVisit: string
  loyaltyPoints?: number | null
  daysSinceVisit?: number
}

function openWhatsApp(phone: string, customer: string, salon: string) {
  const digits = normalizeWhatsAppPhone(phone)
  if (!digits) return
  const text = fillWhatsAppMessage(REPORTS.customers.whatsappTemplate, {
    customer,
    salon,
  })
  window.open(
    `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
    '_blank',
    'noopener,noreferrer',
  )
}

export function CustomersReportScreen() {
  const { range, from, to, setRange } = useReportRangeParams()
  const canExport = useCanExportReports()
  const settings = useSalonSettingsQuery()
  const salonName = settings.data?.business?.salonName?.trim() || COMMON.appName
  const [tab, setTab] = useState<Tab>('top')
  const [inactiveDays, setInactiveDays] = useState(30)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const query = useCustomersReportQuery({
    from,
    to,
    tab,
    inactiveDays: tab === 'inactive' ? inactiveDays : undefined,
    page,
    limit: pageSize,
  })
  const data = query.data
  const empty = Boolean(data && data.table.total === 0)
  const totalPages = data
    ? Math.max(1, Math.ceil(data.table.total / data.table.limit))
    : 1

  const topColumns: ColumnDef<CustomerRow>[] = [
    {
      accessorKey: 'name',
      header: REPORTS.customers.table.name,
      cell: ({ row }) => (
        <Link
          to={ROUTES.customerDetail(row.original.customerId)}
          className="font-medium underline-offset-2 hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: 'phone', header: REPORTS.customers.table.phone },
    {
      accessorKey: 'spend',
      header: REPORTS.customers.table.spend,
      cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
    },
    {
      accessorKey: 'visits',
      header: REPORTS.customers.table.visits,
      cell: ({ getValue }) => formatNumber(Number(getValue())),
    },
    {
      accessorKey: 'averageTicket',
      header: REPORTS.customers.table.averageTicket,
      cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
    },
    { accessorKey: 'lastVisit', header: REPORTS.customers.table.lastVisit },
    ...(data?.loyaltyEnabled
      ? [
          {
            accessorKey: 'loyaltyPoints',
            header: REPORTS.customers.table.loyaltyPoints,
            cell: ({ getValue }: { getValue: () => unknown }) =>
              getValue() == null ? REPORTS.shared.dash : formatNumber(Number(getValue())),
          } as ColumnDef<CustomerRow>,
        ]
      : []),
  ]

  const inactiveColumns: ColumnDef<CustomerRow>[] = [
    {
      accessorKey: 'name',
      header: REPORTS.customers.table.name,
      cell: ({ row }) => (
        <Link
          to={ROUTES.customerDetail(row.original.customerId)}
          className="font-medium underline-offset-2 hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: 'phone', header: REPORTS.customers.table.phone },
    { accessorKey: 'lastVisit', header: REPORTS.customers.table.lastVisit },
    {
      accessorKey: 'daysSinceVisit',
      header: REPORTS.customers.table.daysSinceVisit,
    },
    {
      accessorKey: 'spend',
      header: REPORTS.customers.table.spend,
      cell: ({ getValue }) => formatMoneyOrDash(getValue() as number | null),
    },
    {
      accessorKey: 'visits',
      header: REPORTS.customers.table.visits,
      cell: ({ getValue }) => formatNumber(Number(getValue())),
    },
    {
      id: 'whatsapp',
      header: REPORTS.customers.table.whatsapp,
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8"
          disabled={!row.original.phone}
          onClick={() => openWhatsApp(row.original.phone, row.original.name, salonName)}
        >
          <MessageCircle className="size-3.5" strokeWidth={1.75} />
          {REPORTS.customers.table.whatsapp}
        </Button>
      ),
    },
  ]

  const exportCsv = async () => {
    const payload = await reportsApi.customersExport({
      from,
      to,
      tab,
      inactiveDays: tab === 'inactive' ? inactiveDays : undefined,
    })
    downloadCsv(payload.filename, payload.headers, payload.rows)
  }

  return (
    <ReportPageLayout
      title={REPORTS.customers.title}
      description={REPORTS.customers.description}
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={tab === 'top' ? 'default' : 'outline'}
                className="h-9"
                onClick={() => {
                  setTab('top')
                  setPage(1)
                }}
              >
                {REPORTS.customers.tabs.top}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tab === 'inactive' ? 'default' : 'outline'}
                className="h-9"
                onClick={() => {
                  setTab('inactive')
                  setPage(1)
                }}
              >
                {REPORTS.customers.tabs.inactive}
              </Button>
            </div>
            {tab === 'inactive' ? (
              <Select
                value={String(inactiveDays)}
                onValueChange={(v) => {
                  setInactiveDays(Number(v))
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder={REPORTS.customers.filters.inactiveDays} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">{REPORTS.customers.filters.days30}</SelectItem>
                  <SelectItem value="60">{REPORTS.customers.filters.days60}</SelectItem>
                  <SelectItem value="90">{REPORTS.customers.filters.days90}</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
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
        ) : data ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5 lg:gap-3">
            <StatCard
              label={REPORTS.customers.kpis.newCustomers}
              value={data.kpis.newCustomers}
              icon={UserPlus}
            />
            <StatCard
              label={REPORTS.customers.kpis.returning}
              value={data.kpis.returningCustomers}
              icon={Users}
            />
            <StatCard
              label={REPORTS.customers.kpis.averageSpend}
              value={data.kpis.averageSpend}
              format="inr"
              icon={Wallet}
            />
            <StatCard
              label={REPORTS.customers.kpis.averageVisits}
              value={data.kpis.averageVisits}
              icon={Users}
            />
            <StatCard
              label={REPORTS.customers.kpis.walkInBills}
              value={data.kpis.walkInBills}
              icon={Users}
            />
          </div>
        ) : null
      }
      chart={
        !query.isLoading &&
        !query.isError &&
        data &&
        tab === 'top' &&
        data.chart.length ? (
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="pb-1">
              <CardTitle>{REPORTS.customers.chart.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <NewReturningChart
                data={data.chart.map((p) => ({
                  ...p,
                  key: p.key.length > 10 ? p.key.slice(5) : p.key,
                }))}
              />
            </CardContent>
          </Card>
        ) : null
      }
      table={
        !query.isLoading && !query.isError && data ? (
          empty ? (
            <EmptyState
              title={
                tab === 'inactive'
                  ? REPORTS.customers.inactiveEmptyTitle
                  : REPORTS.customers.emptyTitle
              }
              description={
                tab === 'inactive'
                  ? REPORTS.customers.inactiveEmptyHint
                  : REPORTS.customers.emptyHint
              }
            />
          ) : (
            <Card>
              <CardContent className="space-y-3 pt-4">
                <ResponsiveTable
                  data={data.table.items as CustomerRow[]}
                  columns={tab === 'top' ? topColumns : inactiveColumns}
                  mobileTitleKey="name"
                  emptyTitle={REPORTS.customers.emptyTitle}
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
          )
        ) : query.isLoading ? (
          <LoadingSkeleton rows={6} />
        ) : null
      }
    />
  )
}
