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
      lastName: '',
      email: '',
      phone: '',
      address: '',
      address1: '',
      pincode: '',
    }
  }

  return {
    name: customer.name ?? '',
    lastName: customer.lastName ?? '',
    email: customer.email ?? '',
    phone: String(customer.phone ?? ''),
    address: customer.address ?? '',
    address1: customer.address1 ?? '',
    pincode: customer.pincode ? String(customer.pincode) : '',
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
              : 'Capture name and phone for walk-ins and bookings.'}
          </SheetDescription>
        </SheetHeader>

        <form
          id="customer-form"
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={onSubmit}
          noValidate
        >
          <SheetBody>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="First name"
                htmlFor="name"
                error={form.formState.errors.name?.message}
              >
                <Input id="name" {...form.register('name')} autoComplete="given-name" />
              </FormField>
              <FormField label="Last name" htmlFor="lastName">
                <Input
                  id="lastName"
                  {...form.register('lastName')}
                  autoComplete="family-name"
                />
              </FormField>
            </div>

            <FormField
              label="Phone"
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

            <FormField label="Address" htmlFor="address">
              <Input id="address" {...form.register('address')} />
            </FormField>

            <FormField label="Address line 2" htmlFor="address1">
              <Input id="address1" {...form.register('address1')} />
            </FormField>

            <FormField
              label="PIN code"
              htmlFor="pincode"
              error={form.formState.errors.pincode?.message}
            >
              <Input
                id="pincode"
                inputMode="numeric"
                {...form.register('pincode')}
                autoComplete="postal-code"
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
