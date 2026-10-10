import { History, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
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
import { DEFAULT_PAGE_SIZE, Pagination } from '@/app/components/Pagination'
import { COMMON, INVENTORY } from '@/app/constants'
import {
  useDeleteProductMutation,
  useProductsQuery,
} from '@/app/hooks/queries/useInventoryQuery'
import type { SalonProduct } from '@/app/service/products/productsApi'
import { ProductFormSheet } from '@/app/screens/inventory/ProductFormSheet'
import { ProductImportDialog } from '@/app/screens/inventory/ProductImportDialog'
import {
  ProductStockDialog,
  type StockDialogMode,
} from '@/app/screens/inventory/ProductStockDialog'
import { formatINR } from '@/app/utils'

function stockBadge(product: SalonProduct) {
  if (!product.trackStock) {
    return (
      <Badge variant="outline">{INVENTORY.list.badgeNotTracked}</Badge>
    )
  }
  const qty = product.stockQty ?? 0
  if (qty <= 0) {
    return (
      <Badge variant="outline" className="text-destructive">
        {INVENTORY.list.badgeOutOfStock}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      {INVENTORY.list.badgeInStock}
      {` · ${qty}${product.unit ? ` ${product.unit}` : ''}`}
    </Badge>
  )
}

export function InventoryScreen() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'retail' | 'consumable'>(
    'all',
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SalonProduct | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SalonProduct | null>(null)
  const [stockTarget, setStockTarget] = useState<SalonProduct | null>(null)
  const [stockMode, setStockMode] = useState<StockDialogMode>('add')

  const listQuery = useProductsQuery({
    search: search.trim() || undefined,
    type: typeFilter,
    page,
    limit: pageSize,
  })
  const deleteMutation = useDeleteProductMutation()

  const items = listQuery.data?.items ?? []
  const totalPages = listQuery.data?.totalPages ?? 1

  const openStock = (product: SalonProduct, mode: StockDialogMode) => {
    setStockTarget(product)
    setStockMode(mode)
  }

  const columns: ColumnDef<SalonProduct>[] = [
    {
      accessorKey: 'name',
      header: INVENTORY.form.name,
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
      accessorKey: 'type',
      header: INVENTORY.list.colType,
      cell: ({ row }) => (
        <span>
          {row.original.type === 'consumable'
            ? INVENTORY.list.typeConsumable
            : INVENTORY.list.typeRetail}
        </span>
      ),
    },
    {
      accessorKey: 'price',
      header: INVENTORY.form.price,
      cell: ({ row }) =>
        row.original.type === 'consumable' ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="tabular-nums">{formatINR(row.original.price)}</span>
        ),
    },
    {
      id: 'stock',
      header: INVENTORY.list.colStock,
      cell: ({ row }) => stockBadge(row.original),
    },
    {
      accessorKey: 'unit',
      header: INVENTORY.list.colUnit,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.unit || '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const product = row.original
        return (
          <div className="flex flex-wrap justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                setEditing(product)
                setSheetOpen(true)
              }}
            >
              <Pencil className="size-3.5" strokeWidth={1.75} />
              {COMMON.actions.edit}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => openStock(product, 'add')}
            >
              {INVENTORY.stock.add}
            </Button>
            {product.type === 'consumable' ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => openStock(product, 'use')}
              >
                {INVENTORY.stock.use}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => openStock(product, 'adjust')}
            >
              {INVENTORY.stock.adjust}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => openStock(product, 'history')}
            >
              <History className="size-3.5" strokeWidth={1.75} />
              {INVENTORY.stock.history}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-destructive"
              onClick={() => setDeleteTarget(product)}
            >
              <Trash2 className="size-3.5" strokeWidth={1.75} />
              {COMMON.actions.delete}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description={INVENTORY.list.description}
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
              {INVENTORY.list.import}
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
              {INVENTORY.list.add}
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={INVENTORY.list.searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v as 'all' | 'retail' | 'consumable')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{INVENTORY.list.filterAll}</SelectItem>
            <SelectItem value="retail">{INVENTORY.list.filterRetail}</SelectItem>
            <SelectItem value="consumable">
              {INVENTORY.list.filterConsumable}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {listQuery.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {listQuery.isError ? (
        <ErrorState
          error={listQuery.error}
          title={COMMON.errors.unexpected}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <>
          <ResponsiveTable
            data={items}
            columns={columns}
            mobileTitleKey="name"
            emptyTitle={INVENTORY.list.emptyTitle}
            emptyDescription={INVENTORY.list.emptyHint}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={listQuery.data?.total ?? 0}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </>
      ) : null}

      <ProductFormSheet open={sheetOpen} onOpenChange={setSheetOpen} product={editing} />
      <ProductImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ProductStockDialog
        open={Boolean(stockTarget)}
        mode={stockMode}
        product={stockTarget}
        onOpenChange={(open) => {
          if (!open) setStockTarget(null)
        }}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{COMMON.actions.delete}</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name}
            </DialogDescription>
          </DialogHeader>
          <DialogBody />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {COMMON.actions.cancel}
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
              {deleteMutation.isPending
                ? COMMON.labels.loading
                : COMMON.actions.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
