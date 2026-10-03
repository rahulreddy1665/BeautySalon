import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

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

export function ProductFormSheet({ open, onOpenChange, product }: ProductFormSheetProps) {
  const isEdit = Boolean(product)
  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation()
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: '', price: 0 },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      product ? { name: product.name, price: product.price } : { name: '', price: 0 },
    )
  }, [open, product, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit && product) {
        await updateMutation.mutateAsync({
          id: product._id,
          payload: values,
        })
      } else {
        await createMutation.mutateAsync(values)
      }
      onOpenChange(false)
    } catch (error) {
      form.setError('root', {
        message: toErrorMessage(error, 'Could not save product'),
      })
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit product' : 'Add product'}</SheetTitle>
          <SheetDescription>Name and retail price (INR).</SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit} noValidate>
          <SheetBody>
            <FormField
              label="Name"
              htmlFor="product-name"
              error={form.formState.errors.name?.message}
            >
              <Input id="product-name" {...form.register('name')} />
            </FormField>
            <FormField
              label="Price (₹)"
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
              Cancel
            </Button>
            <Button
              type="submit"
              className="min-touch w-full sm:w-auto"
              disabled={pending}
            >
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
