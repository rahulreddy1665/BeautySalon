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
  customerFormSchema,
  formValuesToPayload,
  type CustomerFormValues,
} from '@/app/helpers/customerValidation'
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '@/app/hooks/queries/useCustomersQuery'
import type { Customer } from '@/app/service/customers/customersApi'

interface CustomerFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onCreated?: (customer: Customer) => void
}

function toFormValues(customer?: Customer | null): CustomerFormValues {
  if (!customer) {
    return {
      name: '',
      email: '',
      phone: '',
    }
  }

  return {
    name: [customer.name, customer.lastName].filter(Boolean).join(' '),
    email: customer.email ?? '',
    phone: String(customer.phone ?? ''),
  }
}

export function CustomerFormSheet({
  open,
  onOpenChange,
  customer,
  onCreated,
}: CustomerFormSheetProps) {
  const isEdit = Boolean(customer)
  const createMutation = useCreateCustomerMutation()
  const updateMutation = useUpdateCustomerMutation()
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: toFormValues(customer),
  })

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(customer))
    }
  }, [open, customer, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = formValuesToPayload(values)
    if (isEdit && customer) {
      await updateMutation.mutateAsync({ id: customer._id, payload })
    } else {
      const created = await createMutation.mutateAsync(payload)
      onCreated?.(created)
    }
    onOpenChange(false)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit customer' : 'Add customer'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update profile details for this guest.'
              : 'Only the phone number is required.'}
          </SheetDescription>
        </SheetHeader>

        <form
          id="customer-form"
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={onSubmit}
          noValidate
        >
          <SheetBody>
            <FormField
              label="Phone *"
              htmlFor="phone"
              error={form.formState.errors.phone?.message}
            >
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="9876543210"
                {...form.register('phone')}
                autoComplete="tel"
              />
            </FormField>

            <FormField
              label="Name"
              htmlFor="name"
              error={form.formState.errors.name?.message}
            >
              <Input id="name" {...form.register('name')} autoComplete="name" />
            </FormField>

            <FormField
              label="Email"
              htmlFor="email"
              error={form.formState.errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                autoComplete="email"
              />
            </FormField>
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
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
