import { format, parseISO } from 'date-fns'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  DateRangeFilter,
  defaultTodayRange,
  type DateRange,
} from '@/app/components/DateRangeFilter'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { DEFAULT_PAGE_SIZE, Pagination } from '@/app/components/Pagination'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { Badge } from '@/app/components/ui/badge'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { BILLING, ROUTES } from '@/app/constants'
import { useBillsPageQuery } from '@/app/hooks/queries/useBillingQuery'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import type { BillRecord } from '@/app/service/billing/billingApi'
import type { PaymentMode } from '@/app/service/invoices/invoicesApi'
import { formatINR } from '@/app/utils'

type BillRow = BillRecord & {
  dateLabel: string
  totalLabel: string
}

const columns: ColumnDef<BillRow>[] = [
  {
    accessorKey: 'invoiceNo',
    header: 'Invoice',
    cell: ({ row }) => (
      <Link
        to={ROUTES.invoice(row.original.id)}
        className="font-medium text-primary hover:underline"
      >
        {row.original.invoiceNo}
      </Link>
    ),
  },
  { accessorKey: 'dateLabel', header: 'Date' },
  { accessorKey: 'customerName', header: 'Customer' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <Badge variant="outline" className="rounded-md font-normal capitalize">
        {String(getValue())}
      </Badge>
    ),
  },
  {
    accessorKey: 'paymentMode',
    header: 'Mode',
    cell: ({ getValue }) => (
      <span className="text-xs uppercase">{String(getValue())}</span>
    ),
  },
  { accessorKey: 'totalLabel', header: 'Total' },
]

export function BillingScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const [mode, setMode] = useState<PaymentMode | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  // Server-side search: wait for a pause in typing before querying.
  const debouncedSearch = useDebouncedValue(search.trim())

  const from = format(range.from, 'yyyy-MM-dd')
  const to = format(range.to, 'yyyy-MM-dd')

  const { data, isLoading, isError, error, refetch } = useBillsPageQuery({
    from,
    to,
    paymentMode: mode === 'all' ? undefined : mode,
    search: debouncedSearch || undefined,
    page,
    limit: pageSize,
  })

  const rows = useMemo(
    () =>
      (data?.items ?? []).map((bill) => ({
        ...bill,
        dateLabel: format(parseISO(bill.createdAt), 'dd MMM yyyy'),
        totalLabel: formatINR(bill.total),
      })),
    [data],
  )

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader description={BILLING.list.description} />

      <DateRangeFilter
        value={range}
        onChange={(next) => {
          setRange(next)
          setPage(1)
        }}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search invoice, customer or phone"
            className="pl-8"
          />
        </div>
        <Select
          value={mode}
          onValueChange={(value) => {
            setMode(value as PaymentMode | 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <LoadingSkeleton rows={5} /> : null}
      {isError ? (
        <ErrorState
          error={error}
          title="Could not load bills"
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <ResponsiveTable
            data={rows}
            columns={columns}
            mobileTitleKey="invoiceNo"
            emptyTitle={debouncedSearch ? 'No matching bills' : 'No bills in this range'}
            emptyDescription={
              debouncedSearch
                ? 'Try another invoice number, customer name or phone.'
                : 'Collect a payment to create the first invoice.'
            }
          />
          <Pagination
            page={data?.page ?? page}
            totalPages={data?.totalPages ?? 1}
            total={data?.total ?? 0}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      ) : null}
    </div>
  )
}
