import { Search, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { DEFAULT_PAGE_SIZE, Pagination } from '@/app/components/Pagination'
import { CUSTOMERS } from '@/app/constants'
import { useCustomersPageQuery } from '@/app/hooks/queries/useCustomersQuery'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import type { Customer } from '@/app/service/customers/customersApi'
import { CustomerFormSheet } from '@/app/screens/customers/CustomerFormSheet'
import { CustomerImportDialog } from '@/app/screens/customers/CustomerImportDialog'

function displayName(customer: Customer): string {
  return [customer.name, customer.lastName].filter(Boolean).join(' ') || 'Unnamed'
}

const columns: ColumnDef<Customer & { fullName: string; phoneLabel: string }>[] = [
  {
    accessorKey: 'fullName',
    header: 'Name',
    cell: ({ row }) => (
      <Link
        to={`/customers/${row.original._id}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.fullName}
      </Link>
    ),
  },
  { accessorKey: 'phoneLabel', header: 'Phone' },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ getValue }) => String(getValue() || '—'),
  },
]

export function CustomersScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  // Wait for a pause in typing before hitting the server.
  const debouncedSearch = useDebouncedValue(search.trim())
  const { data, isLoading, isError, error, refetch } = useCustomersPageQuery({
    page,
    limit: pageSize,
    q: debouncedSearch || undefined,
  })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const wantsNew = searchParams.get('new') === '1'
  const createOpen = sheetOpen || wantsNew

  const clearNewParam = () => {
    if (!wantsNew) return
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('new')
        return next
      },
      { replace: true },
    )
  }

  const pageRows = useMemo(
    () =>
      (data?.items ?? []).map((customer) => ({
        ...customer,
        fullName: displayName(customer),
        phoneLabel: String(customer.phone ?? ''),
      })),
    [data],
  )

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description={CUSTOMERS.list.description}
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="size-4" strokeWidth={1.75} />
            {CUSTOMERS.list.import}
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
        />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder={CUSTOMERS.list.searchPlaceholder}
          className="pl-8"
          aria-label={CUSTOMERS.list.searchPlaceholder}
        />
      </div>

      {isLoading ? <LoadingSkeleton rows={6} /> : null}

      {isError ? (
        <ErrorState
          error={error}
          title="Could not load customers"
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <ResponsiveTable
            data={pageRows}
            columns={columns}
            mobileTitleKey="fullName"
            emptyTitle="No customers yet"
            emptyDescription={
              search
                ? 'No matches for that search.'
                : 'Add a customer to start bookings and billing.'
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

          {/* Quick edit from list via detail; keep create sheet here */}
          <CustomerFormSheet
            open={createOpen}
            onOpenChange={(open) => {
              setSheetOpen(open)
              if (!open) {
                setEditing(null)
                clearNewParam()
              } else {
                setEditing(null)
              }
            }}
            customer={editing}
          />
        </>
      ) : null}

      <CustomerImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
