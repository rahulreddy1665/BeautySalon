import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '@/app/components/EmptyState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import {
  COMMON,
  PERMISSION_ACTIONS,
  PERMISSION_SCREENS,
  SETTINGS,
  type PermissionAction,
} from '@/app/constants'
import {
  useCreateDesignationMutation,
  useDesignationsQuery,
  useUpdateDesignationMutation,
} from '@/app/hooks/queries/useDesignationsQuery'
import {
  designationsApi,
  type Designation,
} from '@/app/service/designations/designationsApi'
import { toErrorMessage } from '@/app/utils'
import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  canUpdate: boolean
  onDirtyChange?: (dirty: boolean) => void
  hideTitle?: boolean
}

function PermissionMatrix({
  selected,
  onChange,
  disabled,
}: {
  selected: Set<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
}) {
  const setScreenAction = (
    screen: (typeof PERMISSION_SCREENS)[number],
    action: PermissionAction,
    on: boolean,
  ) => {
    if (disabled) return
    const next = new Set(selected)
    const key = screen.keys[action]
    if (!key) return
    if (on) {
      next.add(key)
      if (action !== 'view' && screen.keys.view) next.add(screen.keys.view)
    } else {
      next.delete(key)
      if (action === 'view') {
        for (const a of PERMISSION_ACTIONS) {
          const k = screen.keys[a]
          if (k) next.delete(k)
        }
      }
    }
    onChange(next)
  }

  const rowAllOn = (screen: (typeof PERMISSION_SCREENS)[number]) =>
    PERMISSION_ACTIONS.every((a) => {
      const k = screen.keys[a]
      return !k || selected.has(k)
    })

  const colAllOn = (action: PermissionAction) =>
    PERMISSION_SCREENS.every((s) => {
      const k = s.keys[action]
      return !k || selected.has(k)
    })

  const toggleRow = (screen: (typeof PERMISSION_SCREENS)[number], on: boolean) => {
    if (disabled) return
    const next = new Set(selected)
    for (const a of PERMISSION_ACTIONS) {
      const k = screen.keys[a]
      if (!k) continue
      if (on) next.add(k)
      else next.delete(k)
    }
    onChange(next)
  }

  const toggleCol = (action: PermissionAction, on: boolean) => {
    if (disabled) return
    const next = new Set(selected)
    for (const s of PERMISSION_SCREENS) {
      const k = s.keys[action]
      if (!k) continue
      if (on) {
        next.add(k)
        if (action !== 'view' && s.keys.view) next.add(s.keys.view)
      } else {
        next.delete(k)
        if (action === 'view') {
          for (const a of PERMISSION_ACTIONS) {
            const kk = s.keys[a]
            if (kk) next.delete(kk)
          }
        }
      }
    }
    onChange(next)
  }

  const actionLabel = (a: PermissionAction) => {
    switch (a) {
      case 'view':
        return SETTINGS.designations.view
      case 'create':
        return SETTINGS.designations.create
      case 'edit':
        return SETTINGS.designations.editAction
      case 'delete':
        return SETTINGS.designations.deleteAction
    }
  }

  return (
    <>
      {/* Desktop matrix */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-normal"> </th>
              {PERMISSION_ACTIONS.map((a) => (
                <th key={a} className="px-2 py-2 font-normal">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={colAllOn(a)}
                      disabled={disabled}
                      onChange={(e) => toggleCol(a, e.target.checked)}
                      aria-label={`${SETTINGS.designations.selectAll} ${actionLabel(a)}`}
                    />
                    {actionLabel(a)}
                  </label>
                </th>
              ))}
              <th className="px-2 py-2 font-normal">{SETTINGS.designations.selectAll}</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_SCREENS.map((screen) => (
              <tr key={screen.id} className="border-b border-border">
                <td className="py-2 pr-2 font-medium">{screen.label}</td>
                {PERMISSION_ACTIONS.map((a) => {
                  const key = screen.keys[a]
                  return (
                    <td key={a} className="px-2 py-2">
                      {key ? (
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={selected.has(key)}
                          disabled={disabled}
                          onChange={(e) => setScreenAction(screen, a, e.target.checked)}
                          aria-label={`${screen.label} ${actionLabel(a)}`}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={rowAllOn(screen)}
                    disabled={disabled}
                    onChange={(e) => toggleRow(screen, e.target.checked)}
                    aria-label={`${SETTINGS.designations.selectAll} ${screen.label}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile expandable cards */}
      <div className="space-y-2 lg:hidden">
        {PERMISSION_SCREENS.map((screen) => (
          <details key={screen.id} className="rounded-md border border-border px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">
              {screen.label}
            </summary>
            <div className="mt-2 space-y-2">
              {PERMISSION_ACTIONS.map((a) => {
                const key = screen.keys[a]
                if (!key) return null
                return (
                  <label
                    key={a}
                    className="flex h-11 items-center justify-between gap-2 text-sm"
                  >
                    <span>{actionLabel(a)}</span>
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={selected.has(key)}
                      disabled={disabled}
                      onChange={(e) => setScreenAction(screen, a, e.target.checked)}
                    />
                  </label>
                )
              })}
            </div>
          </details>
        ))}
      </div>
    </>
  )
}

function DesignationEditor({
  open,
  onOpenChange,
  designation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  designation: Designation | null
}) {
  const isNew = !designation
  const createMutation = useCreateDesignationMutation()
  const updateMutation = useUpdateDesignationMutation()
  const [name, setName] = useState(designation?.name ?? '')
  const [perms, setPerms] = useState(() => new Set(designation?.permissions ?? []))
  const [maxDiscount, setMaxDiscount] = useState(designation?.maxDiscountPercent ?? 0)
  const [canViewRevenue, setCanViewRevenue] = useState(
    Boolean(designation?.canViewRevenue),
  )
  const [canExport, setCanExport] = useState(Boolean(designation?.canExport))

  const initial = useMemo(
    () => ({
      name: designation?.name ?? '',
      perms: [...(designation?.permissions ?? [])].sort().join(','),
      maxDiscount: designation?.maxDiscountPercent ?? 0,
      canViewRevenue: Boolean(designation?.canViewRevenue),
      canExport: Boolean(designation?.canExport),
    }),
    [designation],
  )

  const dirty =
    name.trim() !== initial.name ||
    [...perms].sort().join(',') !== initial.perms ||
    maxDiscount !== initial.maxDiscount ||
    canViewRevenue !== initial.canViewRevenue ||
    canExport !== initial.canExport

  const pending = createMutation.isPending || updateMutation.isPending

  const save = async () => {
    const payload = {
      name: name.trim(),
      permissions: [...perms],
      maxDiscountPercent: maxDiscount,
      canViewRevenue,
      canExport,
    }
    try {
      if (isNew) {
        await createMutation.mutateAsync(payload)
      } else if (designation) {
        await updateMutation.mutateAsync({ id: designation._id, payload })
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(toErrorMessage(err))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl lg:max-w-3xl">
        <SheetHeader>
          <SheetTitle>
            {isNew ? SETTINGS.designations.createTitle : SETTINGS.designations.editTitle}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {dirty ? (
            <p className="text-xs text-muted-foreground">
              {SETTINGS.designations.unsaved}
            </p>
          ) : null}
          <div className="space-y-1">
            <Label>{SETTINGS.designations.name}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={Boolean(designation?.isSystemAdmin)}
            />
          </div>
          <PermissionMatrix
            selected={perms}
            onChange={setPerms}
            disabled={Boolean(designation?.isSystemAdmin)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>{SETTINGS.designations.maxDiscount}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={maxDiscount}
                disabled={Boolean(designation?.isSystemAdmin)}
                onChange={(e) =>
                  setMaxDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                }
              />
            </div>
            <label className="flex h-11 items-end gap-2 text-sm lg:h-10">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={canViewRevenue}
                disabled={Boolean(designation?.isSystemAdmin)}
                onChange={(e) => setCanViewRevenue(e.target.checked)}
              />
              {SETTINGS.designations.viewRevenue}
            </label>
            <label className="flex h-11 items-end gap-2 text-sm lg:h-10">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={canExport}
                disabled={Boolean(designation?.isSystemAdmin)}
                onChange={(e) => setCanExport(e.target.checked)}
              />
              {SETTINGS.designations.exportData}
            </label>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {COMMON.actions.cancel}
          </Button>
          <Button
            type="button"
            disabled={
              pending || !name.trim() || !dirty || Boolean(designation?.isSystemAdmin)
            }
            onClick={() => void save()}
          >
            {SETTINGS.designations.save}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function DesignationsSettingsSection({
  canUpdate,
  onDirtyChange,
  hideTitle,
}: Props) {
  const listQuery = useDesignationsQuery()
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Designation | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const items = listQuery.data ?? []

  // Editor open counts as potential unsaved work for leave confirmation.
  useEffect(() => {
    onDirtyChange?.(editorOpen)
  }, [editorOpen, onDirtyChange])

  if (listQuery.isLoading) {
    return <LoadingSkeleton rows={4} />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1">
        {hideTitle ? <span /> : <CardTitle>{SETTINGS.sections.roles}</CardTitle>}
        {canUpdate ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null)
              setEditorOpen(true)
            }}
          >
            {SETTINGS.designations.add}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!canUpdate ? (
          <p className="text-sm text-muted-foreground">
            {SETTINGS.designations.adminOnly}
          </p>
        ) : null}

        {items.length === 0 ? (
          <EmptyState title={SETTINGS.designations.emptyTitle} />
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {items.map((d) => (
              <li
                key={d._id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {d.isSystemAdmin ? SETTINGS.designations.adminEntry : d.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {d.isSystemAdmin
                      ? SETTINGS.designations.fullAccess
                      : `${d.staffCount ?? 0} ${SETTINGS.designations.staffCount}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {d.isSystemAdmin ? (
                    <Badge variant="outline" className="rounded-md font-normal">
                      {SETTINGS.designations.fullAccess}
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="rounded-md font-normal">
                        {d.isActive ? COMMON.labels.active : COMMON.labels.inactive}
                      </Badge>
                      {canUpdate ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              setEditing(d)
                              setEditorOpen(true)
                            }}
                          >
                            {SETTINGS.designations.edit}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={(d.staffCount ?? 0) > 0 || deleting === d._id}
                            title={
                              (d.staffCount ?? 0) > 0
                                ? SETTINGS.designations.cannotDeleteAssigned
                                : undefined
                            }
                            onClick={() => {
                              setDeleting(d._id)
                              void designationsApi
                                .remove(d._id)
                                .then(() => {
                                  toast.success(SETTINGS.toasts.designationDeleted)
                                  void queryClient.invalidateQueries({
                                    queryKey: queryKeys.designations.all,
                                  })
                                })
                                .catch((err) => toast.error(toErrorMessage(err)))
                                .finally(() => setDeleting(null))
                            }}
                          >
                            {SETTINGS.designations.delete}
                          </Button>
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {editorOpen ? (
        <DesignationEditor
          key={editing?._id ?? 'new'}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          designation={editing}
        />
      ) : null}
    </Card>
  )
}
