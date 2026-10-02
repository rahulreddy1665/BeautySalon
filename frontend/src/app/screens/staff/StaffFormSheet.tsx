import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

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
import {
  staffFormSchema,
  type StaffFormValues,
} from '@/app/helpers/staffValidation'
import {
  useCreateStaffMutation,
  useUpdateStaffMutation,
} from '@/app/hooks/queries/useStaffQuery'
import type { StaffMember } from '@/app/service/staff/staffApi'

interface StaffFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff?: StaffMember | null
}

function toValues(staff?: StaffMember | null): StaffFormValues {
  if (!staff) {
    return { name: '', age: 25, gender: 'Female', isActive: true }
  }
  return {
    name: staff.name,
    age: staff.age,
    gender: staff.gender,
    isActive: staff.isActive !== false,
  }
}

export function StaffFormSheet({
  open,
  onOpenChange,
  staff,
}: StaffFormSheetProps) {
  const isEdit = Boolean(staff)
  const createMutation = useCreateStaffMutation()
  const updateMutation = useUpdateStaffMutation()
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: toValues(staff),
  })

  useEffect(() => {
    if (open) form.reset(toValues(staff))
  }, [open, staff, form])

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && staff) {
      await updateMutation.mutateAsync({ id: staff._id, payload: values })
    } else {
      await createMutation.mutateAsync(values)
    }
    onOpenChange(false)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit staff' : 'Add staff'}</SheetTitle>
          <SheetDescription>
            Salon team member — no login account.
          </SheetDescription>
        </SheetHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={onSubmit}
          noValidate
        >
          <SheetBody>
            <FormField
              label="Name"
              htmlFor="staff-name"
              error={form.formState.errors.name?.message}
            >
              <Input id="staff-name" {...form.register('name')} />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Age"
                htmlFor="staff-age"
                error={form.formState.errors.age?.message}
              >
                <Input
                  id="staff-age"
                  type="number"
                  min={14}
                  max={80}
                  className="tabular-nums"
                  {...form.register('age', { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                label="Gender"
                error={form.formState.errors.gender?.message}
              >
                <Controller
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <FormField label="Status">
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <Select
                    value={field.value ? 'active' : 'inactive'}
                    onValueChange={(v) => field.onChange(v === 'active')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
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
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add staff'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
