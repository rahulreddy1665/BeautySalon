import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { COMMON, SERVICES } from '@/app/constants'
import {
  useCategoriesQuery,
  useUpdateCategoryMutation,
} from '@/app/hooks/queries/useCategoriesQuery'
import type { ServiceCategory } from '@/app/service/categories/categoriesApi'
import { CategoryCreateDialog } from '@/app/screens/services/CategoryCreateDialog'

export function CategoriesPanel() {
  const listQuery = useCategoriesQuery(false)
  const updateMutation = useUpdateCategoryMutation()
  const [createOpen, setCreateOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<ServiceCategory | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const items = listQuery.data ?? []

  const columns: ColumnDef<ServiceCategory>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: SERVICES.categories.name,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'activeServiceCount',
        header: SERVICES.categories.services,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.activeServiceCount ?? 0}
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: SERVICES.categories.status,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'secondary' : 'outline'}>
            {row.original.isActive
              ? SERVICES.categories.active
              : SERVICES.categories.inactive}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const cat = row.original
          const count = cat.activeServiceCount ?? 0
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setRenameTarget(cat)
                  setRenameValue(cat.name)
                }}
              >
                {SERVICES.categories.rename}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                disabled={updateMutation.isPending}
                onClick={() => {
                  void updateMutation.mutateAsync({
                    id: cat._id,
                    payload: { isActive: !cat.isActive },
                  })
                }}
              >
                {cat.isActive
                  ? `${SERVICES.categories.deactivate}${count > 0 ? ` (${count})` : ''}`
                  : SERVICES.categories.activate}
              </Button>
            </div>
          )
        },
      },
    ],
    [updateMutation],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {SERVICES.categories.description}
        </p>
        <Button
          type="button"
          size="sm"
          className="min-touch h-9"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" strokeWidth={1.75} />
          {SERVICES.categories.add}
        </Button>
      </div>

      {listQuery.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {listQuery.isError ? (
        <ErrorState
          error={listQuery.error}
          title={SERVICES.categories.emptyTitle}
          onRetry={() => void listQuery.refetch()}
        />
      ) : null}

      {!listQuery.isLoading && !listQuery.isError ? (
        <ResponsiveTable
          data={items}
          columns={columns}
          mobileTitleKey="name"
          emptyTitle={SERVICES.categories.emptyTitle}
          emptyDescription={SERVICES.categories.emptyHint}
        />
      ) : null}

      <CategoryCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => undefined}
      />

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{SERVICES.categories.rename}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder={SERVICES.categories.namePlaceholder}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameTarget(null)}
            >
              {COMMON.actions.cancel}
            </Button>
            <Button
              type="button"
              disabled={
                updateMutation.isPending || renameValue.trim().length === 0
              }
              onClick={async () => {
                if (!renameTarget) return
                await updateMutation.mutateAsync({
                  id: renameTarget._id,
                  payload: { name: renameValue.trim() },
                })
                setRenameTarget(null)
              }}
            >
              {COMMON.actions.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
