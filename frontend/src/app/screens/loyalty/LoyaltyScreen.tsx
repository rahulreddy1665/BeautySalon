import { format, parseISO } from 'date-fns'
import { Gift, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { LOYALTY } from '@/app/constants'
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import { useLoyaltyBalancesQuery } from '@/app/hooks/queries/useLoyaltyQuery'
import type { Customer } from '@/app/service/customers/customersApi'
import { AdjustPointsDialog } from '@/app/screens/loyalty/AdjustPointsDialog'

type MemberRow = {
  id: string
  fullName: string
  phoneLabel: string
  points: number
  updatedLabel: string
}

const PAGE_SIZE = 20

function displayName(customer: Customer): string {
  return [customer.name, customer.lastName].filter(Boolean).join(' ')
}

const memberColumns = (
  onAdjust: (customerId: string) => void,
): ColumnDef<MemberRow>[] => [
  {
    accessorKey: 'fullName',
    header: 'Customer',
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          to={`/customers/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.fullName}
        </Link>
        <p className="text-xs text-muted-foreground tabular-nums">
          {row.original.phoneLabel}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'points',
    header: 'Points',
    cell: ({ getValue }) => (
      <span className="tabular-nums font-medium">{Number(getValue())}</span>
    ),
  },
  { accessorKey: 'updatedLabel', header: 'Updated' },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() => onAdjust(row.original.id)}
      >
        Adjust
      </Button>
    ),
  },
]

export function LoyaltyScreen() {
  const customersQuery = useCustomersQuery()
  const balancesQuery = useLoyaltyBalancesQuery()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [presetCustomerId, setPresetCustomerId] = useState<string | null>(null)

  const customers = customersQuery.data ?? []

  const balanceByCustomer = useMemo(() => {
    const map = new Map<string, { points: number; updatedAt?: string }>()
    for (const b of balancesQuery.data ?? []) {
      map.set(b.customerId, { points: b.points, updatedAt: b.updatedAt })
    }
    return map
  }, [balancesQuery.data])

  const members = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers
      .filter((c) => c.isActive !== false)
      .map((c) => {
        const bal = balanceByCustomer.get(c._id)
        return {
          id: c._id,
          fullName: displayName(c),
          phoneLabel: String(c.phone ?? ''),
          points: bal?.points ?? 0,
          updatedLabel: bal?.updatedAt
            ? format(parseISO(bal.updatedAt), 'dd MMM yyyy')
            : '—',
        }
      })
      .filter((row) => {
        if (!q) return true
        return `${row.fullName} ${row.phoneLabel}`.toLowerCase().includes(q)
      })
      .sort((a, b) => b.points - a.points)
  }, [customers, balanceByCustomer, search])

  const pageCount = Math.max(1, Math.ceil(members.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = members.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const loading = customersQuery.isLoading || balancesQuery.isLoading
  const error =
    customersQuery.isError || balancesQuery.isError
      ? (customersQuery.error ?? balancesQuery.error)
      : null

  const openAdjust = (customerId?: string) => {
    setPresetCustomerId(customerId ?? null)
    setAdjustOpen(true)
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description={LOYALTY.description}
        actions={
          <Button
            type="button"
            size="sm"
            className="min-touch h-9"
            onClick={() => openAdjust()}
          >
            <Gift className="size-4" strokeWidth={1.75} />
            {LOYALTY.adjust}
          </Button>
        }
      />

      {loading ? <LoadingSkeleton rows={6} /> : null}
      {error ? (
        <ErrorState
          error={error}
          title={LOYALTY.loadFailed}
          onRetry={() => {
            void customersQuery.refetch()
            void balancesQuery.refetch()
          }}
        />
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              placeholder={LOYALTY.searchPlaceholder}
              className="pl-8"
            />
          </div>

          <ResponsiveTable
            data={pageRows}
            columns={memberColumns((id) => openAdjust(id))}
            mobileTitleKey="fullName"
            emptyTitle={LOYALTY.emptyMembers}
            emptyDescription={LOYALTY.emptyMembersHint}
          />

          {members.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {members.length} {LOYALTY.members.toLowerCase()} · page {safePage + 1} /{' '}
                {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <AdjustPointsDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        customers={customers}
        presetCustomerId={presetCustomerId}
      />
    </div>
  )
}
