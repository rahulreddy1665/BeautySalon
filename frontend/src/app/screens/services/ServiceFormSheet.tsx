import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
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
import { COMMON, SERVICES } from '@/app/constants'
import {
  serviceFormSchema,
  type ServiceFormValues,
} from '@/app/helpers/serviceValidation'
import { useCategoriesQuery } from '@/app/hooks/queries/useCategoriesQuery'
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from '@/app/hooks/queries/useServicesQuery'
import type { SalonService } from '@/app/service/services/servicesApi'
import { CategoryCreateDialog } from '@/app/screens/services/CategoryCreateDialog'

const CREATE_CATEGORY = '__create_category__'

interface ServiceFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: SalonService | null
}

function categoryIdOf(service?: SalonService | null): string {
  if (!service) return ''
  const ref = service.categoryId
  if (typeof ref === 'string') return ref
  if (ref && typeof ref === 'object' && ref._id) return ref._id
  return ''
}

function toValues(service?: SalonService | null): ServiceFormValues {
  if (!service) {
    return { name: '', categoryId: '', price: 0, durationMinutes: 30 }
  }
  return {
    name: service.name,
    categoryId: categoryIdOf(service),
    price: service.price,
    durationMinutes: service.durationMinutes ?? 30,
  }
}

export function ServiceFormSheet({
  open,
  onOpenChange,
  service,
}: ServiceFormSheetProps) {
  const isEdit = Boolean(service)
  const createMutation = useCreateServiceMutation()
  const updateMutation = useUpdateServiceMutation()
  const categoriesQuery = useCategoriesQuery(true)
  const [createOpen, setCreateOpen] = useState(false)
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: toValues(service),
  })

  useEffect(() => {
    if (open) form.reset(toValues(service))
  }, [open, service, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      categoryId: values.categoryId,
      price: values.price,
      durationMinutes: values.durationMinutes,
    }
    if (isEdit && service) {
      await updateMutation.mutateAsync({ id: service._id, payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onOpenChange(false)
  })

  const categories = categoriesQuery.data ?? []

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {isEdit ? SERVICES.form.editTitle : SERVICES.form.createTitle}
            </SheetTitle>
            <SheetDescription>{SERVICES.form.description}</SheetDescription>
          </SheetHeader>

          <form
            id="service-form"
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={onSubmit}
            noValidate
          >
            <SheetBody>
              <FormField
                label={SERVICES.form.name}
                htmlFor="svc-name"
                error={form.formState.errors.name?.message}
              >
                <Input id="svc-name" {...form.register('name')} />
              </FormField>

              <FormField
                label={SERVICES.form.category}
                error={form.formState.errors.categoryId?.message}
              >
                <Select
                  value={form.watch('categoryId') || undefined}
                  onValueChange={(value) => {
                    if (value === CREATE_CATEGORY) {
                      setCreateOpen(true)
                      return
                    }
                    form.setValue('categoryId', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={SERVICES.form.categoryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={CREATE_CATEGORY}>
                      {SERVICES.form.createCategoryOption}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={SERVICES.form.price}
                  htmlFor="svc-price"
                  error={form.formState.errors.price?.message}
                >
                  <Input
                    id="svc-price"
                    type="number"
                    min={0}
                    step="1"
                    className="tabular-nums"
                    {...form.register('price', { valueAsNumber: true })}
                  />
                </FormField>
                <FormField
                  label={SERVICES.form.duration}
                  htmlFor="svc-duration"
                  error={form.formState.errors.durationMinutes?.message}
                >
                  <Input
                    id="svc-duration"
                    type="number"
                    min={5}
                    step={5}
                    className="tabular-nums"
                    {...form.register('durationMinutes', { valueAsNumber: true })}
                  />
                </FormField>
              </div>
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

      <CategoryCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(cat) => {
          form.setValue('categoryId', cat._id, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }}
      />
    </>
  )
}
