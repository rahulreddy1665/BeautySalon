import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { FormField } from '@/app/components/FormField'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { COMMON, INVENTORY } from '@/app/constants'
import {
  productFormSchema,
  type ProductFormValues,
} from '@/app/helpers/inventoryValidation'
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from '@/app/hooks/queries/useInventoryQuery'
import type { SalonProduct } from '@/app/service/products/productsApi'
import { toErrorMessage } from '@/app/utils'

interface ProductFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: SalonProduct | null
}

export function ProductFormSheet({
  open,
  onOpenChange,
  product,
}: ProductFormSheetProps) {
  const isEdit = Boolean(product)
  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation()
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      price: 0,
      type: 'retail',
      unit: '',
      trackStock: false,
      openingStock: 0,
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      product
        ? {
            name: product.name,
            price: product.price,
            type: product.type ?? 'retail',
            unit: product.unit ?? '',
            trackStock: Boolean(product.trackStock),
            openingStock: product.stockQty ?? 0,
          }
        : {
            name: '',
            price: 0,
            type: 'retail',
            unit: '',
            trackStock: false,
            openingStock: 0,
          },
    )
  }, [open, product, form])

  const type = form.watch('type')
  const trackStock = form.watch('trackStock')

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      price: values.type === 'consumable' ? values.price || 0 : values.price,
      type: values.type,
      unit: values.unit,
      trackStock: values.trackStock,
      openingStock: values.trackStock ? values.openingStock : undefined,
    }
    try {
      if (isEdit && product) {
        await updateMutation.mutateAsync({ id: product._id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (error) {
      form.setError('root', {
        message: toErrorMessage(error, INVENTORY.toasts.stockFailed),
      })
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? INVENTORY.form.editTitle : INVENTORY.form.createTitle}
          </SheetTitle>
          <SheetDescription>{INVENTORY.form.description}</SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit} noValidate>
          <SheetBody className="space-y-4">
            <FormField
              label={INVENTORY.form.name}
              htmlFor="product-name"
              error={form.formState.errors.name?.message}
            >
              <Input id="product-name" {...form.register('name')} />
            </FormField>

            <FormField label={INVENTORY.form.type} htmlFor="product-type">
              <Select
                value={type}
                onValueChange={(v) =>
                  form.setValue('type', v as 'retail' | 'consumable', {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="product-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">{INVENTORY.list.typeRetail}</SelectItem>
                  <SelectItem value="consumable">
                    {INVENTORY.list.typeConsumable}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {type === 'retail' ? (
              <FormField
                label={INVENTORY.form.price}
                htmlFor="product-price"
                error={form.formState.errors.price?.message}
              >
                <Input
                  id="product-price"
                  type="number"
                  min={0}
                  step={1}
                  {...form.register('price', { valueAsNumber: true })}
                />
              </FormField>
            ) : null}

            <FormField
              label={INVENTORY.form.unit}
              htmlFor="product-unit"
              error={form.formState.errors.unit?.message}
            >
              <Input
                id="product-unit"
                placeholder={INVENTORY.form.unitPlaceholder}
                {...form.register('unit')}
              />
            </FormField>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={trackStock}
                onChange={(e) =>
                  form.setValue('trackStock', e.target.checked, {
                    shouldDirty: true,
                  })
                }
              />
              {INVENTORY.form.trackStock}
            </label>

            {trackStock ? (
              <FormField
                label={INVENTORY.form.openingStock}
                htmlFor="product-opening"
                error={form.formState.errors.openingStock?.message}
              >
                <Input
                  id="product-opening"
                  type="number"
                  min={0}
                  step={1}
                  {...form.register('openingStock', { valueAsNumber: true })}
                />
              </FormField>
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
              className="min-touch w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              {COMMON.actions.cancel}
            </Button>
            <Button
              type="submit"
              className="min-touch w-full sm:w-auto"
              disabled={pending}
            >
              {pending ? COMMON.labels.loading : COMMON.actions.save}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
