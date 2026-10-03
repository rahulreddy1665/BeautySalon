import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

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
import { COMMON, STAFF } from '@/app/constants'
import { useStaffListQuery } from '@/app/hooks/queries/useStaffQuery'
import type { StaffLoginStatus, StaffMember } from '@/app/service/staff/staffApi'
import { StaffFormSheet } from '@/app/screens/staff/StaffFormSheet'

function loginLabel(status?: StaffLoginStatus): string {
  switch (status) {
    case 'login_enabled':
      return STAFF.list.loginEnabled
    case 'login_off':
      return STAFF.list.loginOff
    case 'must_change_password':
      return STAFF.list.mustChangePassword
    default:
      return STAFF.list.noLogin
  }
}

export function StaffScreen() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)

  const listQuery = useStaffListQuery({
    search: search.trim() || undefined,
    isActive: activeFilter === 'all' ? undefined : activeFilter,
    page,
    limit: 20,
  })

  const items = listQuery.data?.items ?? []
  const totalPages = listQuery.data?.totalPages ?? 1

  const columns: ColumnDef<StaffMember>[] = [
    {
      accessorKey: 'name',
      header: COMMON.labels.name,
      cell: ({ row }) => (
        <Link
          to={`/staff/${row.original._id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'age',
      header: STAFF.form.age,
      cell: ({ getValue }) => <span className="tabular-nums">{Number(getValue())}</span>,
    },
    {
      accessorKey: 'gender',
      header: COMMON.labels.gender,
      cell: ({ getValue }) => {
        const g = String(getValue()) as keyof typeof COMMON.gender
        return COMMON.gender[g] ?? String(getValue())
      },
    },
    {
      id: 'login',
      header: STAFF.detail.allowLogin,
      cell: ({ row }) => (
        <Badge variant="outline" className="rounded-md font-normal">
          {loginLabel(row.original.loginStatus)}
        </Badge>
      ),
    },
    {
      accessorKey: 'isActive',
      header: COMMON.labels.status,
      cell: ({ getValue }) => (
        <Badge variant="outline" className="rounded-md font-normal">
          {getValue() === false ? COMMON.labels.inactive : COMMON.labels.active}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={() => {
            setEditing(row.original)
            setSheetOpen(true)
          }}
        >
          {COMMON.actions.edit}
        </Button>
      ),
    },
  ]

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description={STAFF.list.description}
        actions={
          <Button
            type="button"
            size="sm"
            className="min-touch h-9"
            onClick={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
          >
            <Plus className="size-4" strokeWidth={1.75} />
            {STAFF.list.add}
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            placeholder={STAFF.list.searchPlaceholder}
            className="pl-8"
          />
        </div>
        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v as typeof activeFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{COMMON.labels.status}</SelectItem>
            <SelectItem value="true">{COMMON.labels.active}</SelectItem>
            <SelectItem value="false">{COMMON.labels.inactive}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {listQuery.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {listQuery.isError ? (
        <ErrorState
          error={listQuery.error}
          title={COMMON.errors.loadFailed}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <>
          <ResponsiveTable
            data={items}
            columns={columns}
            mobileTitleKey="name"
            emptyTitle={STAFF.list.emptyTitle}
            emptyDescription={STAFF.list.emptyHint}
          />
          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {listQuery.data?.total ?? 0} · {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {COMMON.actions.previous}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {COMMON.actions.next}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <StaffFormSheet open={sheetOpen} onOpenChange={setSheetOpen} staff={editing} />
    </div>
  )
}
