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
  serviceFormSchema,
  type ServiceFormValues,
} from '@/app/helpers/serviceValidation'
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from '@/app/hooks/queries/useServicesQuery'
import type { SalonService } from '@/app/service/services/servicesApi'

interface ServiceFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: SalonService | null
}

function toValues(service?: SalonService | null): ServiceFormValues {
  if (!service) {
    return { name: '', category: '', price: 0, durationMinutes: 30 }
  }
  return {
    name: service.name,
    category: service.category,
    price: service.price,
    durationMinutes: service.durationMinutes ?? 30,
  }
}

export function ServiceFormSheet({ open, onOpenChange, service }: ServiceFormSheetProps) {
  const isEdit = Boolean(service)
  const createMutation = useCreateServiceMutation()
  const updateMutation = useUpdateServiceMutation()
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: toValues(service),
  })

  useEffect(() => {
    if (open) form.reset(toValues(service))
  }, [open, service, form])

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && service) {
      await updateMutation.mutateAsync({ id: service._id, payload: values })
    } else {
      await createMutation.mutateAsync(values)
    }
    onOpenChange(false)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit service' : 'Add service'}</SheetTitle>
          <SheetDescription>
            Name, category, price, and how long the service takes.
          </SheetDescription>
        </SheetHeader>

        <form
          id="service-form"
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={onSubmit}
          noValidate
        >
          <SheetBody>
            <FormField
              label="Service name"
              htmlFor="svc-name"
              error={form.formState.errors.name?.message}
            >
              <Input id="svc-name" {...form.register('name')} />
            </FormField>

            <FormField
              label="Category"
              htmlFor="svc-category"
              error={form.formState.errors.category?.message}
            >
              <Input
                id="svc-category"
                placeholder="Hair, Nails, Skin…"
                {...form.register('category')}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Price (₹)"
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
                label="Duration (min)"
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
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add service'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
