import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { COMMON, SERVICES } from '@/app/constants'
import {
  useCombosQuery,
  useDeleteComboMutation,
  useUpdateComboMutation,
} from '@/app/hooks/queries/useCombosQuery'
import type { SalonCombo } from '@/app/service/combos/combosApi'
import { ComboFormSheet } from '@/app/screens/services/ComboFormSheet'
import { formatINR } from '@/app/utils'

export function CombosPanel() {
  const listQuery = useCombosQuery(false)
  const updateMutation = useUpdateComboMutation()
  const deleteMutation = useDeleteComboMutation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<SalonCombo | null>(null)

  const items = listQuery.data ?? []

  const columns: ColumnDef<SalonCombo>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: SERVICES.combos.name,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: 'included',
        header: SERVICES.combos.included,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.services.map((s) => s.service.name).join(', ')}
          </span>
        ),
      },
      {
        accessorKey: 'listTotal',
        header: SERVICES.combos.listTotal,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatINR(row.original.listTotal)}</span>
        ),
      },
      {
        accessorKey: 'comboPrice',
        header: SERVICES.combos.comboPrice,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatINR(row.original.comboPrice)}</span>
        ),
      },
      {
        accessorKey: 'saving',
        header: SERVICES.combos.saving,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatINR(row.original.saving)}</span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: SERVICES.combos.status,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'secondary' : 'outline'}>
            {row.original.isActive
              ? SERVICES.combos.active
              : SERVICES.combos.inactive}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const combo = row.original
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={() => {
                  setEditing(combo)
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
                disabled={updateMutation.isPending}
                onClick={() => {
                  void updateMutation.mutateAsync({
                    id: combo._id,
                    payload: { isActive: !combo.isActive },
                  })
                }}
              >
                {combo.isActive
                  ? SERVICES.combos.deactivate
                  : SERVICES.combos.activate}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  void deleteMutation.mutateAsync(combo._id)
                }}
              >
                <Trash2 className="size-3.5" strokeWidth={1.75} />
                {SERVICES.combos.delete}
              </Button>
            </div>
          )
        },
      },
    ],
    [updateMutation, deleteMutation],
  )

  if (listQuery.isLoading) return <LoadingSkeleton rows={4} />
  if (listQuery.isError) {
    return (
      <ErrorState
        title={COMMON.errors.unexpected}
        onRetry={() => void listQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
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
          {SERVICES.combos.add}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="font-medium">{SERVICES.combos.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {SERVICES.combos.emptyHint}
          </p>
        </div>
      ) : (
        <ResponsiveTable columns={columns} data={items} />
      )}

      <ComboFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        combo={editing}
      />
    </div>
  )
}
