import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

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
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import {
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
} from '@/app/hooks/queries/useAppointmentsQuery'
import { useServicesCatalogQuery } from '@/app/hooks/queries/useServicesQuery'
import { useActiveStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import {
  appointmentCustomerLabel,
  appointmentServiceId,
  appointmentStaffId,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'
import { minutesToTime, timeToMinutes } from '@/app/screens/appointments/calendarConfig'
import { toErrorMessage } from '@/app/utils'

const lineSchema = z.object({
  serviceId: z.string().min(1, 'Pick a service'),
  staffId: z.string().min(1, 'Pick staff'),
})

const formSchema = z
  .object({
    mode: z.enum(['customer', 'guest']),
    customerId: z.string().optional(),
    guestName: z.string().optional(),
    guestPhone: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time'),
    notes: z.string().optional(),
    services: z.array(lineSchema).min(1, 'Add at least one service'),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'customer' && !values.customerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a customer',
        path: ['customerId'],
      })
    }
    if (values.mode === 'guest' && !values.guestName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Guest name is required',
        path: ['guestName'],
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

export interface AppointmentPrefill {
  date: string
  startTime: string
  staffId?: string
}

interface AppointmentFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment?: Appointment | null
  prefill?: AppointmentPrefill | null
}

export function AppointmentFormSheet({
  open,
  onOpenChange,
  appointment,
  prefill,
}: AppointmentFormSheetProps) {
  const isEdit = Boolean(appointment)
  const customersQuery = useCustomersQuery()
  const servicesQuery = useServicesCatalogQuery()
  const staffQuery = useActiveStaffQuery()
  const createMutation = useCreateAppointmentMutation()
  const updateMutation = useUpdateAppointmentMutation()
  const pending = createMutation.isPending || updateMutation.isPending

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'guest',
      customerId: '',
      guestName: '',
      guestPhone: '',
      date: prefill?.date ?? new Date().toISOString().slice(0, 10),
      startTime: prefill?.startTime ?? '10:00',
      notes: '',
      services: [{ serviceId: '', staffId: prefill?.staffId ?? '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'services',
  })

  useEffect(() => {
    if (!open) return
    if (appointment) {
      const hasCustomer = Boolean(appointment.customer)
      form.reset({
        mode: hasCustomer ? 'customer' : 'guest',
        customerId:
          typeof appointment.customer === 'object' && appointment.customer
            ? appointment.customer._id
            : typeof appointment.customer === 'string'
              ? appointment.customer
              : '',
        guestName: appointment.guestName ?? '',
        guestPhone: appointment.guestPhone ?? '',
        date: appointment.date,
        startTime: appointment.startTime,
        notes: appointment.notes ?? '',
        services: appointment.services.map((line) => ({
          serviceId: appointmentServiceId(line),
          staffId: appointmentStaffId(line),
        })),
      })
    } else {
      form.reset({
        mode: 'guest',
        customerId: '',
        guestName: '',
        guestPhone: '',
        date: prefill?.date ?? new Date().toISOString().slice(0, 10),
        startTime: prefill?.startTime ?? '10:00',
        notes: '',
        services: [{ serviceId: '', staffId: prefill?.staffId ?? '' }],
      })
    }
  }, [open, appointment, prefill, form])

  const watchedServices = form.watch('services')
  const startTime = form.watch('startTime')
  const mode = form.watch('mode')

  const endTimePreview = useMemo(() => {
    const catalog = servicesQuery.data ?? []
    const duration = (watchedServices ?? []).reduce((sum, line) => {
      const svc = catalog.find((s) => s._id === line.serviceId)
      return sum + (svc?.durationMinutes ?? 0)
    }, 0)
    if (!startTime || duration <= 0) return '—'
    return minutesToTime(timeToMinutes(startTime) + duration)
  }, [watchedServices, startTime, servicesQuery.data])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      date: values.date,
      startTime: values.startTime,
      notes: values.notes?.trim() || undefined,
      services: values.services,
      ...(values.mode === 'customer'
        ? { customerId: values.customerId, guestName: undefined, guestPhone: undefined }
        : {
            customerId: null,
            guestName: values.guestName?.trim(),
            guestPhone: values.guestPhone?.trim(),
          }),
    }
    try {
      if (isEdit && appointment) {
        await updateMutation.mutateAsync({ id: appointment._id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (error) {
      form.setError('root', {
        message: toErrorMessage(error, 'Could not save appointment'),
      })
    }
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEdit
              ? `Edit · ${appointment ? appointmentCustomerLabel(appointment) : ''}`
              : 'New appointment'}
          </SheetTitle>
          <SheetDescription>
            End time is calculated from service durations.
          </SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit} noValidate>
          <SheetBody>
            <FormField label="Customer type">
              <Select
                value={mode}
                onValueChange={(v) => form.setValue('mode', v as 'customer' | 'guest')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guest">New guest</SelectItem>
                  <SelectItem value="customer">Existing customer</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {mode === 'customer' ? (
              <FormField
                label="Customer"
                error={form.formState.errors.customerId?.message}
              >
                <Select
                  value={form.watch('customerId') || undefined}
                  onValueChange={(v) => form.setValue('customerId', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Search list" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customersQuery.data ?? []).map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {[c.name, c.lastName].filter(Boolean).join(' ')} · {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Guest name"
                  htmlFor="guest-name"
                  error={form.formState.errors.guestName?.message}
                >
                  <Input id="guest-name" {...form.register('guestName')} />
                </FormField>
                <FormField label="Phone" htmlFor="guest-phone">
                  <Input id="guest-phone" {...form.register('guestPhone')} />
                </FormField>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Date"
                htmlFor="appt-date"
                error={form.formState.errors.date?.message}
              >
                <Input id="appt-date" type="date" {...form.register('date')} />
              </FormField>
              <FormField
                label="Start time"
                htmlFor="appt-start"
                error={form.formState.errors.startTime?.message}
              >
                <Input
                  id="appt-start"
                  type="time"
                  step={1800}
                  {...form.register('startTime')}
                />
              </FormField>
            </div>

            <p className="text-sm text-muted-foreground">
              End time (read-only):{' '}
              <span className="font-medium tabular-nums text-foreground">
                {endTimePreview}
              </span>
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Services</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    append({
                      serviceId: '',
                      staffId: prefill?.staffId ?? '',
                    })
                  }
                >
                  <Plus className="size-3.5" strokeWidth={1.75} />
                  Add
                </Button>
              </div>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-2 rounded-md border border-border p-3"
                >
                  <FormField
                    label="Service"
                    error={form.formState.errors.services?.[index]?.serviceId?.message}
                  >
                    <Select
                      value={form.watch(`services.${index}.serviceId`) || undefined}
                      onValueChange={(v) =>
                        form.setValue(`services.${index}.serviceId`, v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose service" />
                      </SelectTrigger>
                      <SelectContent>
                        {(servicesQuery.data ?? []).map((svc) => (
                          <SelectItem key={svc._id} value={svc._id}>
                            {svc.name} · {svc.durationMinutes} min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <div className="flex items-end gap-2">
                    <FormField
                      label="Staff"
                      className="min-w-0 flex-1"
                      error={form.formState.errors.services?.[index]?.staffId?.message}
                    >
                      <Select
                        value={form.watch(`services.${index}.staffId`) || undefined}
                        onValueChange={(v) =>
                          form.setValue(`services.${index}.staffId`, v)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {(staffQuery.data ?? []).map((s) => (
                            <SelectItem key={s._id} value={s._id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    {fields.length > 1 ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="mb-0.5"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {form.formState.errors.services?.root ||
              form.formState.errors.services?.message ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.services?.root?.message ||
                    form.formState.errors.services?.message}
                </p>
              ) : null}
            </div>

            <FormField label="Notes" htmlFor="appt-notes">
              <Input id="appt-notes" {...form.register('notes')} />
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
              {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Book'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
