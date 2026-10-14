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
import { DEFAULT_PAGE_SIZE, Pagination } from '@/app/components/Pagination'
import { LOYALTY } from '@/app/constants'
import { useLoyaltyMembersQuery } from '@/app/hooks/queries/useLoyaltyQuery'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import type { LoyaltyMember } from '@/app/service/loyalty/loyaltyApi'
import { AdjustPointsDialog } from '@/app/screens/loyalty/AdjustPointsDialog'

type MemberRow = {
  id: string
  fullName: string
  phoneLabel: string
  points: number
  updatedLabel: string
}


function displayName(member: Pick<LoyaltyMember, 'name' | 'lastName'>): string {
  return [member.name, member.lastName].filter(Boolean).join(' ')
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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [presetCustomerId, setPresetCustomerId] = useState<string | null>(null)
  // Search, sort and paging run on the server; wait for a pause in typing.
  const debouncedSearch = useDebouncedValue(search.trim())
  const membersQuery = useLoyaltyMembersQuery({
    page,
    limit: pageSize,
    q: debouncedSearch || undefined,
  })

  const pageRows = useMemo(
    (): MemberRow[] =>
      (membersQuery.data?.items ?? []).map((m) => ({
        id: m.customerId,
        fullName: displayName(m),
        phoneLabel: String(m.phone ?? ''),
        points: m.points,
        updatedLabel: m.updatedAt ? format(parseISO(m.updatedAt), 'dd MMM yyyy') : '—',
      })),
    [membersQuery.data],
  )

  const loading = membersQuery.isLoading
  const error = membersQuery.isError ? membersQuery.error : null

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
          onRetry={() => void membersQuery.refetch()}
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
                setPage(1)
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

          <Pagination
            page={membersQuery.data?.page ?? page}
            totalPages={membersQuery.data?.totalPages ?? 1}
            total={membersQuery.data?.total ?? 0}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
      ) : null}

      <AdjustPointsDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        presetCustomerId={presetCustomerId}
      />
    </div>
  )
}
