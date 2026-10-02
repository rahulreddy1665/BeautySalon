import { format, parseISO } from 'date-fns'
import { Plus, Search } from 'lucide-react'
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
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { useBillsQuery } from '@/app/hooks/queries/useBillingQuery'
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
        to={`/billing/${row.original.id}`}
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

  const from = format(range.from, 'yyyy-MM-dd')
  const to = format(range.to, 'yyyy-MM-dd')

  const { data, isLoading, isError, error, refetch } = useBillsQuery({
    from,
    to,
    paymentMode: mode === 'all' ? undefined : mode,
    search: search.trim() || undefined,
  })

  const rows = useMemo(
    () =>
      (data ?? []).map((bill) => ({
        ...bill,
        dateLabel: format(parseISO(bill.createdAt), 'dd MMM yyyy'),
        totalLabel: formatINR(bill.total),
      })),
    [data],
  )

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Invoices from /api/invoice · filter by date and payment mode."
        actions={
          <Button asChild size="sm" className="min-touch h-9">
            <Link to="/billing/new">
              <Plus className="size-4" strokeWidth={1.75} />
              New bill
            </Link>
          </Button>
        }
      />

      <DateRangeFilter value={range} onChange={setRange} />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or customer"
            className="pl-8"
          />
        </div>
        <Select
          value={mode}
          onValueChange={(value) => setMode(value as PaymentMode | 'all')}
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
        <ResponsiveTable
          data={rows}
          columns={columns}
          mobileTitleKey="invoiceNo"
          emptyTitle="No bills in this range"
          emptyDescription="Collect a payment to create the first invoice."
        />
      ) : null}
    </div>
  )
}
