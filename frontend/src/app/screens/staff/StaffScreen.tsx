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
import { useStaffListQuery } from '@/app/hooks/queries/useStaffQuery'
import type { StaffMember } from '@/app/service/staff/staffApi'
import { StaffFormSheet } from '@/app/screens/staff/StaffFormSheet'

export function StaffScreen() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>(
    'all',
  )
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
      header: 'Name',
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
      header: 'Age',
      cell: ({ getValue }) => (
        <span className="tabular-nums">{Number(getValue())}</span>
      ),
    },
    { accessorKey: 'gender', header: 'Gender' },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge variant="outline" className="rounded-md font-normal">
          {getValue() === false ? 'Inactive' : 'Active'}
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
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Salon staff for appointments and billing."
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
            Add staff
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
            placeholder="Search name"
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
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {listQuery.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {listQuery.isError ? (
        <ErrorState
          error={listQuery.error}
          title="Could not load staff"
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <>
          <ResponsiveTable
            data={items}
            columns={columns}
            mobileTitleKey="name"
            emptyTitle="No staff yet"
            emptyDescription="Add team members to assign on appointments and bills."
          />
          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {listQuery.data?.total ?? 0} · page {page}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <StaffFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        staff={editing}
      />
    </div>
  )
}
