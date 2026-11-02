import { format, parseISO } from 'date-fns'
import { Check, Minus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
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
import { BILLING, COMMON, ROUTES } from '@/app/constants'
import {
  useBillsPageQuery,
  useDeleteBillsMutation,
} from '@/app/hooks/queries/useBillingQuery'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import type { BillRecord } from '@/app/service/billing/billingApi'
import type { PaymentMode } from '@/app/service/invoices/invoicesApi'
import { cn, formatINR } from '@/app/utils'

type BillRow = BillRecord & {
  dateLabel: string
  totalLabel: string
}

const plural = (n: number) => (n === 1 ? '1 bill' : `${n} bills`)

/**
 * Checkbox drawn in the app theme (native ones stay white in dark mode).
 * Supports the "some selected" state for select-all.
 */
function SelectBox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  label: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <span className="relative inline-flex size-4 shrink-0 align-middle">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="peer size-4 cursor-pointer appearance-none rounded border border-input bg-background transition-colors checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary hover:border-gold-deep/60 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
      />
      <Check
        className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-primary-foreground peer-checked:block"
        strokeWidth={3}
      />
      <Minus
        className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-primary-foreground peer-indeterminate:block"
        strokeWidth={3}
      />
    </span>
  )
}

export function BillingScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const [mode, setMode] = useState<PaymentMode | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Selection and delete both key on invoice number — that is what the delete API takes.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteTargets, setDeleteTargets] = useState<string[] | null>(null)
  const deleteMutation = useDeleteBillsMutation()

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

  const pageIds = rows.map((bill) => bill.invoiceNo)
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id)).length
  const allPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length

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

  const confirmDelete = async () => {
    if (!deleteTargets?.length) return
    const targets = deleteTargets
    await deleteMutation.mutateAsync(targets)
    setSelectedIds((previous) => previous.filter((id) => !targets.includes(id)))
    setDeleteTargets(null)
  }

  const columns: ColumnDef<BillRow>[] = [
    {
      id: 'select',
      meta: { label: BILLING.list.selectColumn },
      header: () => (
        <SelectBox
          checked={allPageSelected}
          indeterminate={selectedOnPage > 0 && !allPageSelected}
          onChange={toggleAllOnPage}
          label={BILLING.list.selectAllAria}
        />
      ),
      cell: ({ row }) => (
        <SelectBox
          checked={selectedIds.includes(row.original.invoiceNo)}
          onChange={() => toggleInvoice(row.original.invoiceNo)}
          label={BILLING.list.selectInvoiceAria.replace(
            '{invoice}',
            row.original.invoiceNo,
          )}
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
    {
      id: 'actions',
      header: COMMON.labels.actions,
      cell: ({ row }) => (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={BILLING.list.deleteInvoiceAria.replace(
            '{invoice}',
            row.original.invoiceNo,
          )}
          onClick={() => setDeleteTargets([row.original.invoiceNo])}
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
        </Button>
      ),
    },
  ]

  const hasRows = rows.length > 0 && !isLoading && !isError
  const hasSelection = selectedIds.length > 0
  const selectedLabel = BILLING.list.selectedCount.replace(
    '{count}',
    plural(selectedIds.length),
  )
  const selectionActions = (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2 transition-opacity',
        hasSelection ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!hasSelection}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        tabIndex={hasSelection ? 0 : -1}
        onClick={() => setSelectedIds([])}
      >
        {BILLING.list.clearSelection}
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        tabIndex={hasSelection ? 0 : -1}
        disabled={deleteMutation.isPending}
        onClick={() => setDeleteTargets(selectedIds)}
      >
        <Trash2 className="size-4" strokeWidth={1.75} />
        {BILLING.list.deleteSelected}
      </Button>
    </div>
  )

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader description={BILLING.list.description} />

      <DateRangeFilter
        value={range}
        onChange={(next) => {
          setRange(next)
          setPage(1)
          setSelectedIds([])
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
              setSelectedIds([])
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
            setSelectedIds([])
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

        {/* Desktop: selection actions sit at the end of the filter row, so nothing shifts. */}
        {hasRows ? (
          <div className="hidden items-center gap-3 md:ml-auto md:flex">
            {hasSelection ? (
              <span className="text-sm font-medium text-gold-deep">{selectedLabel}</span>
            ) : null}
            {selectionActions}
          </div>
        ) : null}
      </div>

      {/* Phones: the table is cards with no header, so select-all lives in its own row. */}
      {hasRows ? (
        <div className="flex min-h-9 items-center justify-between gap-2 px-1 md:hidden">
          <label className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <SelectBox
              checked={allPageSelected}
              indeterminate={selectedOnPage > 0 && !allPageSelected}
              onChange={toggleAllOnPage}
              label={BILLING.list.selectAllAria}
            />
            {hasSelection ? (
              <span className="truncate font-medium text-gold-deep">{selectedLabel}</span>
            ) : (
              BILLING.list.selectAllOnPage
            )}
          </label>
          {selectionActions}
        </div>
      ) : null}

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

      <Dialog
        open={deleteTargets !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTargets(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex-row items-center gap-3 bg-muted/50">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <Trash2 className="size-4" strokeWidth={1.75} />
            </span>
            <DialogTitle className="text-base">
              {deleteTargets?.length === 1
                ? BILLING.list.deleteOneTitle.replace('{invoice}', deleteTargets[0] ?? '')
                : BILLING.list.deleteManyTitle.replace(
                    '{count}',
                    plural(deleteTargets?.length ?? 0),
                  )}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <DialogDescription>
              {deleteTargets?.length === 1
                ? BILLING.list.deleteOneBody
                : BILLING.list.deleteManyBody}
            </DialogDescription>
            {deleteTargets && deleteTargets.length > 1 ? (
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-muted/40 p-2.5">
                {deleteTargets.slice(0, 8).map((invoiceNo) => (
                  <span
                    key={invoiceNo}
                    className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium tabular-nums"
                  >
                    {invoiceNo}
                  </span>
                ))}
                {deleteTargets.length > 8 ? (
                  <span className="px-1 py-0.5 text-xs text-muted-foreground">
                    {BILLING.list.deleteListMore.replace(
                      '{count}',
                      String(deleteTargets.length - 8),
                    )}
                  </span>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteTargets(null)}
            >
              {COMMON.actions.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={deleteMutation.isPending}
              onClick={() => void confirmDelete()}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              {deleteMutation.isPending ? BILLING.list.deleting : COMMON.actions.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
