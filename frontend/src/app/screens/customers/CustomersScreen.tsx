import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import type { Customer } from '@/app/service/customers/customersApi'
import { CustomerFormSheet } from '@/app/screens/customers/CustomerFormSheet'

const PAGE_SIZE = 20

function displayName(customer: Customer): string {
  return [customer.name, customer.lastName].filter(Boolean).join(' ')
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
  const { data, isLoading, isError, error, refetch } = useCustomersQuery()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = (data ?? []).map((customer) => ({
      ...customer,
      fullName: displayName(customer),
      phoneLabel: String(customer.phone ?? ''),
    }))

    if (!q) return rows

    return rows.filter((customer) => {
      const haystack = [
        customer.fullName,
        customer.phoneLabel,
        customer.email ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [data, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const openCreate = () => {
    setEditing(null)
    setSheetOpen(true)
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Search by name or phone. Add walk-ins before collecting payment."
        actions={
          <Button type="button" size="sm" className="min-touch h-9" onClick={openCreate}>
            <Plus className="size-4" strokeWidth={1.75} />
            Add customer
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
            setPage(0)
          }}
          placeholder="Search name or phone"
          className="pl-8"
          aria-label="Search customers"
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

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {filtered.length} customer{filtered.length === 1 ? '' : 's'}
              {search ? ' matching' : ''}
              {' · '}
              Client-side page {safePage + 1} of {pageCount}
            </span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Quick edit from list via detail; keep create sheet here */}
          <CustomerFormSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            customer={editing}
          />
        </>
      ) : null}
    </div>
  )
}
