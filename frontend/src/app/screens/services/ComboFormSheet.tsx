import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { FormField } from '@/app/components/FormField'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { COMMON, SERVICES } from '@/app/constants'
import {
  useCreateComboMutation,
  useUpdateComboMutation,
} from '@/app/hooks/queries/useCombosQuery'
import { useServicesQuery } from '@/app/hooks/queries/useServicesQuery'
import type { SalonCombo } from '@/app/service/combos/combosApi'
import { cn, formatINR, toErrorMessage } from '@/app/utils'

const comboFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  comboPrice: z.number().min(0.01),
  serviceIds: z.array(z.string()).min(2, SERVICES.combos.toasts.createFailed),
})

type ComboFormValues = z.infer<typeof comboFormSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  combo?: SalonCombo | null
}

export function ComboFormSheet({ open, onOpenChange, combo }: Props) {
  const isEdit = Boolean(combo)
  const createMutation = useCreateComboMutation()
  const updateMutation = useUpdateComboMutation()
  const servicesQuery = useServicesQuery({ page: 1, limit: 100 })
  const [confirmAbove, setConfirmAbove] = useState(false)
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<ComboFormValues>({
    resolver: zodResolver(comboFormSchema),
    defaultValues: { name: '', comboPrice: 0, serviceIds: [] },
  })

  useEffect(() => {
    if (!open) return
    setConfirmAbove(false)
    form.reset(
      combo
        ? {
            name: combo.name,
            comboPrice: combo.comboPrice,
            serviceIds: combo.services.map((s) => s.service._id),
          }
        : { name: '', comboPrice: 0, serviceIds: [] },
    )
  }, [open, combo, form])

  const serviceIds = form.watch('serviceIds')
  const comboPrice = form.watch('comboPrice')
  const catalog = servicesQuery.data?.items ?? []

  const listTotal = useMemo(() => {
    return serviceIds.reduce((sum, id) => {
      const svc = catalog.find((s) => s._id === id)
      return sum + (svc?.price ?? 0)
    }, 0)
  }, [serviceIds, catalog])

  const saving = listTotal - (Number(comboPrice) || 0)
  const needsConfirm = Number(comboPrice) > 0 && comboPrice >= listTotal && listTotal > 0

  const toggleService = (id: string) => {
    const current = form.getValues('serviceIds')
    if (current.includes(id)) {
      form.setValue(
        'serviceIds',
        current.filter((x) => x !== id),
        { shouldValidate: true },
      )
    } else {
      form.setValue('serviceIds', [...current, id], { shouldValidate: true })
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (needsConfirm && !confirmAbove) {
      form.setError('root', { message: SERVICES.combos.confirmAboveList })
      return
    }
    const payload = {
      name: values.name,
      comboPrice: values.comboPrice,
      services: values.serviceIds.map((serviceId) => ({ serviceId, qty: 1 })),
      confirmPriceAboveList: needsConfirm ? true : undefined,
    }
    try {
      if (isEdit && combo) {
        await updateMutation.mutateAsync({ id: combo._id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (error) {
      form.setError('root', {
        message: toErrorMessage(error, SERVICES.combos.toasts.createFailed),
      })
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? SERVICES.combos.formEditTitle : SERVICES.combos.formCreateTitle}
          </SheetTitle>
          <SheetDescription>{SERVICES.combos.formDescription}</SheetDescription>
        </SheetHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit} noValidate>
          <SheetBody className="space-y-4">
            <FormField
              label={SERVICES.combos.name}
              htmlFor="combo-name"
              error={form.formState.errors.name?.message}
            >
              <Input id="combo-name" {...form.register('name')} />
            </FormField>

            <FormField
              label={SERVICES.combos.services}
              error={form.formState.errors.serviceIds?.message}
            >
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border p-2">
                {catalog.map((svc) => {
                  const checked = serviceIds.includes(svc._id)
                  return (
                    <label
                      key={svc._id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                        checked ? 'bg-muted' : 'hover:bg-muted/60',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService(svc._id)}
                        className="size-4 accent-primary"
                      />
                      <span className="min-w-0 flex-1 truncate">{svc.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatINR(svc.price)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </FormField>

            <FormField
              label={SERVICES.combos.price}
              htmlFor="combo-price"
              error={form.formState.errors.comboPrice?.message}
            >
              <Input
                id="combo-price"
                type="number"
                min={0.01}
                step={1}
                className="tabular-nums"
                {...form.register('comboPrice', { valueAsNumber: true })}
              />
            </FormField>

            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{SERVICES.combos.listTotal}</span>
                <span className="tabular-nums">{formatINR(listTotal)}</span>
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted-foreground">{SERVICES.combos.saving}</span>
                <span
                  className={cn(
                    'tabular-nums',
                    saving > 0 ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {formatINR(saving)}
                </span>
              </div>
            </div>

            {needsConfirm ? (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmAbove}
                  onChange={(e) => setConfirmAbove(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>{SERVICES.combos.confirmAboveList}</span>
              </label>
            ) : null}

            {form.formState.errors.root ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}
          </SheetBody>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {COMMON.actions.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? COMMON.labels.loading : COMMON.actions.save}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
