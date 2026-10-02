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
  useDeleteProductMutation,
  useProductsQuery,
} from '@/app/hooks/queries/useInventoryQuery'
import type { SalonProduct } from '@/app/service/products/productsApi'
import { ProductFormSheet } from '@/app/screens/inventory/ProductFormSheet'
import { ProductImportDialog } from '@/app/screens/inventory/ProductImportDialog'
import { formatINR } from '@/app/utils'

export function InventoryScreen() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SalonProduct | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SalonProduct | null>(null)

  const listQuery = useProductsQuery({
    search: search.trim() || undefined,
    page,
    limit: 20,
  })
  const deleteMutation = useDeleteProductMutation()

  const items = listQuery.data?.items ?? []
  const totalPages = listQuery.data?.totalPages ?? 1

  const columns: ColumnDef<SalonProduct>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => {
            setEditing(row.original)
            setSheetOpen(true)
          }}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ getValue }) => (
        <span className="tabular-nums">{formatINR(Number(getValue()))}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
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
        description="Retail products · name and price only (no stock)."
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
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
              Add product
            </Button>
          </>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search products"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {listQuery.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {listQuery.isError ? (
        <ErrorState
          error={listQuery.error}
          title="Products failed to load"
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <>
          <ResponsiveTable
            data={items}
            columns={columns}
            mobileTitleKey="name"
            emptyTitle="No products"
            emptyDescription="Add a product or import from Excel."
          />
          {totalPages > 1 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
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
          ) : null}
        </>
      ) : null}

      <ProductFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        product={editing}
      />
      <ProductImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              Removes {deleteTarget?.name}. Past invoices keep the name/price
              snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogBody />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return
                void deleteMutation.mutateAsync(deleteTarget._id).then(() => {
                  setDeleteTarget(null)
                })
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
