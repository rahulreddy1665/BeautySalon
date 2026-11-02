
import { format, parseISO } from 'date-fns'
import { Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

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
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
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
import { invoicesApi, type PaymentMode } from '@/app/service/invoices/invoicesApi'
import { formatINR } from '@/app/utils'

type BillRow = BillRecord & {
  dateLabel: string
  totalLabel: string
}

export function BillingScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const [mode, setMode] = useState<PaymentMode | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const pageIds = rows.map((bill) => bill.id)
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))

  const toggleInvoice = (id: string) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id],
    )
  }

  const toggleAllOnPage = () => {
    setSelectedIds((previous) =>
      allPageSelected
        ? previous.filter((id) => !pageIds.includes(id))
        : [...new Set([...previous, ...pageIds])],
    )
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || deleting) return

    setDeleting(true)

    try {
      await invoicesApi.deleteInvoices(selectedIds)

      const deletedCount = selectedIds.length

      setSelectedIds([])
      setDeleteOpen(false)

      toast.success(`${deletedCount} invoice(s) deleted successfully`)

      await refetch()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete invoices',
      )
    } finally {
      setDeleting(false)
    }
  }

  const columns: ColumnDef<BillRow>[] = [
    {
      id: 'select',
      header: (
        <input
    type="checkbox"
    checked={allPageSelected}
    onChange={toggleAllOnPage}
    aria-label="Select all invoices"
    className="h-4 w-4 cursor-pointer"
  />
      ),
      cell: ({ row }) => (
        <input
    type="checkbox"
    checked={selectedIds.includes(row.original.invoiceNo)}
    onChange={() => toggleInvoice(row.original.invoiceNo)}
    aria-label={`Select invoice ${row.original.invoiceNo}`}
    className="h-4 w-4 cursor-pointer"
  />
      ),
    },
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

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
          <span className="text-sm font-medium">
            {selectedIds.length} invoice(s) selected
          </span>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={deleting}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete Selected ({selectedIds.length})
          </Button>
        </div>
      )}

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
            emptyTitle={
              debouncedSearch ? 'No matching bills' : 'No bills in this range'
            }
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Selected Invoices?</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete {selectedIds.length} selected
              invoice(s)?
            </p>

            <p className="text-sm text-destructive">
              This action cannot be undone. Associated loyalty points will also
              be reversed.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleBulkDelete()}
            >
              {deleting ? 'Deleting...' : `Delete ${selectedIds.length} Invoices`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
