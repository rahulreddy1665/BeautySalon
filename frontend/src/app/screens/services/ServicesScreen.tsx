import { Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
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
import {
  useDeleteServiceMutation,
  useServiceCategoriesQuery,
  useServicesQuery,
} from '@/app/hooks/queries/useServicesQuery'
import type { SalonService } from '@/app/service/services/servicesApi'
import { ServiceFormSheet } from '@/app/screens/services/ServiceFormSheet'
import { ServiceImportDialog } from '@/app/screens/services/ServiceImportDialog'
import { formatINR } from '@/app/utils'

export function ServicesScreen() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SalonService | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SalonService | null>(null)

  const listQuery = useServicesQuery({
    search: search.trim() || undefined,
    category: category === 'all' ? undefined : category,
    page,
    limit: 20,
  })
  const categoriesQuery = useServiceCategoriesQuery()
  const deleteMutation = useDeleteServiceMutation()

  const items = listQuery.data?.items ?? []
  const totalPages = listQuery.data?.totalPages ?? 1

  const columns: ColumnDef<SalonService>[] = [
    {
      accessorKey: 'name',
      header: 'Service',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.category}</p>
        </div>
      ),
    },
    {
      accessorKey: 'durationMinutes',
      header: 'Duration',
      cell: ({ getValue }) => (
        <span className="tabular-nums">{Number(getValue())} min</span>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ getValue }) => formatINR(Number(getValue())),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
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
            <Pencil className="size-3.5" strokeWidth={1.75} />
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-destructive"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="size-3.5" strokeWidth={1.75} />
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Salon services with price and duration."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-touch h-9"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" strokeWidth={1.75} />
              Import
            </Button>
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
              Add service
            </Button>
          </div>
        }
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
            placeholder="Search services"
            className="pl-8"
          />
        </div>
        <Select
          value={category}
          onValueChange={(value) => {
            setCategory(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categoriesQuery.data ?? []).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {listQuery.isLoading ? <LoadingSkeleton rows={5} /> : null}
      {listQuery.isError ? (
        <ErrorState
          error={listQuery.error}
          title="Could not load services"
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <>
          <ResponsiveTable
            data={items}
            columns={columns}
            mobileTitleKey="name"
            emptyTitle="No services yet"
            emptyDescription="Add a service or import from Excel."
          />
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                {listQuery.data?.total ?? 0} services · page {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <ServiceFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        service={editing}
      />
      <ServiceImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete service?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Remove “${deleteTarget.name}” from the catalog. This cannot be undone.`
                : 'Remove this service.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="hidden" />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!deleteTarget) return
                await deleteMutation.mutateAsync(deleteTarget._id)
                setDeleteTarget(null)
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
