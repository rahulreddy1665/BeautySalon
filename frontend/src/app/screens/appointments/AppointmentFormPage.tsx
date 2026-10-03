import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { FormField } from '@/app/components/FormField'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { APPOINTMENTS, COMMON, ROUTES } from '@/app/constants'
import {
  useAppointmentQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
} from '@/app/hooks/queries/useAppointmentsQuery'
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { useServicesCatalogQuery } from '@/app/hooks/queries/useServicesQuery'
import { useActiveStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import {
  appointmentServiceId,
  appointmentStaffId,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'
import {
  AppointmentConfirmDialog,
  type ConfirmKind,
} from '@/app/screens/appointments/AppointmentConfirmDialog'
import {
  minutesToTime,
  timeToMinutes,
} from '@/app/screens/appointments/calendarConfig'
import { formatINR, toErrorMessage } from '@/app/utils'

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
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    notes: z.string().optional(),
    services: z.array(lineSchema).min(1),
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

export function AppointmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const appointmentQuery = useAppointmentQuery(id)
  const customersQuery = useCustomersQuery()
  const servicesQuery = useServicesCatalogQuery()
  const staffQuery = useActiveStaffQuery()
  const settingsQuery = useSalonSettingsQuery()
  const createMutation = useCreateAppointmentMutation()
  const updateMutation = useUpdateAppointmentMutation()
  const pending = createMutation.isPending || updateMutation.isPending

  const [confirm, setConfirm] = useState<{
    kind: ConfirmKind
    appointment: Appointment
    total?: number
  } | null>(null)

  const prefillDate = searchParams.get('date') || undefined
  const prefillTime = searchParams.get('time') || undefined
  const prefillStaff = searchParams.get('staffId') || undefined

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'guest',
      customerId: '',
      guestName: '',
      guestPhone: '',
      date: prefillDate ?? new Date().toISOString().slice(0, 10),
      startTime: prefillTime ?? '10:00',
      notes: '',
      services: [{ serviceId: '', staffId: prefillStaff ?? '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'services',
  })

  useEffect(() => {
    const appointment = appointmentQuery.data
    if (!appointment) return
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
  }, [appointmentQuery.data, form])

  const watchedServices = form.watch('services')
  const startTime = form.watch('startTime')
  const mode = form.watch('mode')
  const catalog = servicesQuery.data ?? []

  const duration = useMemo(
    () =>
      (watchedServices ?? []).reduce((sum, line) => {
        const svc = catalog.find((s) => s._id === line.serviceId)
        return sum + (svc?.durationMinutes ?? 0)
      }, 0),
    [watchedServices, catalog],
  )

  const endTimePreview =
    startTime && duration > 0
      ? minutesToTime(timeToMinutes(startTime) + duration)
      : '—'

  const priceTotal = useMemo(
    () =>
      (watchedServices ?? []).reduce((sum, line) => {
        const svc = catalog.find((s) => s._id === line.serviceId)
        return sum + (svc?.price ?? 0)
      }, 0),
    [watchedServices, catalog],
  )

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      date: values.date,
      startTime: values.startTime,
      notes: values.notes?.trim() || undefined,
      services: values.services,
      ...(values.mode === 'customer'
        ? {
            customerId: values.customerId,
            guestName: undefined,
            guestPhone: undefined,
          }
        : {
            customerId: null,
            guestName: values.guestName?.trim(),
            guestPhone: values.guestPhone?.trim(),
          }),
    }
    try {
      const saved =
        isEdit && id
          ? await updateMutation.mutateAsync({ id, payload })
          : await createMutation.mutateAsync(payload)
      setConfirm({
        kind: isEdit ? 'updated' : 'created',
        appointment: saved,
        total: priceTotal,
      })
    } catch (error) {
      form.setError('root', {
        message: toErrorMessage(error, APPOINTMENTS.errors.loadFailed),
      })
    }
  })

  if (isEdit && appointmentQuery.isLoading) return <LoadingSkeleton rows={8} />

  const salonName =
    settingsQuery.data?.business?.salonName?.trim() || COMMON.appName

  return (
    <div className="min-w-0 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-9 px-2">
          <Link to={ROUTES.appointments}>
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            {APPOINTMENTS.form.back}
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">
          {isEdit
            ? APPOINTMENTS.form.editTitle
            : APPOINTMENTS.form.createTitle}
        </h1>
      </div>

      <form className="grid gap-4 lg:grid-cols-3" onSubmit={onSubmit} noValidate>
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{APPOINTMENTS.form.sectionContact}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField label={APPOINTMENTS.form.customer}>
                <Select
                  value={mode}
                  onValueChange={(v) =>
                    form.setValue('mode', v as 'customer' | 'guest')
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">
                      {APPOINTMENTS.form.guest}
                    </SelectItem>
                    <SelectItem value="customer">
                      {APPOINTMENTS.form.customer}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {mode === 'customer' ? (
                <FormField
                  label={APPOINTMENTS.form.customer}
                  error={form.formState.errors.customerId?.message}
                >
                  <Select
                    value={form.watch('customerId') || undefined}
                    onValueChange={(v) => {
                      form.setValue('customerId', v)
                      const c = (customersQuery.data ?? []).find(
                        (x) => x._id === v,
                      )
                      if (c?.phone)
                        form.setValue('guestPhone', String(c.phone))
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(customersQuery.data ?? []).map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {[c.name, c.lastName].filter(Boolean).join(' ')} ·{' '}
                          {c.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    label={APPOINTMENTS.form.guestName}
                    error={form.formState.errors.guestName?.message}
                  >
                    <Input {...form.register('guestName')} />
                  </FormField>
                  <FormField label={APPOINTMENTS.form.guestPhone}>
                    <Input {...form.register('guestPhone')} />
                  </FormField>
                </div>
              )}
              {mode === 'customer' ? (
                <FormField label={APPOINTMENTS.form.guestPhone}>
                  <Input
                    value={
                      (() => {
                        const c = (customersQuery.data ?? []).find(
                          (x) => x._id === form.watch('customerId'),
                        )
                        return c?.phone != null ? String(c.phone) : ''
                      })()
                    }
                    readOnly
                  />
                </FormField>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{APPOINTMENTS.form.sectionServices}</CardTitle>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  append({ serviceId: '', staffId: prefillStaff ?? '' })
                }
              >
                <Plus className="size-3.5" strokeWidth={1.75} />
                {APPOINTMENTS.form.addService}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-2 rounded-xl border border-border p-3"
                >
                  <FormField
                    label={APPOINTMENTS.form.services}
                    error={
                      form.formState.errors.services?.[index]?.serviceId
                        ?.message
                    }
                  >
                    <Select
                      value={
                        form.watch(`services.${index}.serviceId`) || undefined
                      }
                      onValueChange={(v) =>
                        form.setValue(`services.${index}.serviceId`, v)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.map((svc) => (
                          <SelectItem key={svc._id} value={svc._id}>
                            {svc.name} · {svc.durationMinutes}{' '}
                            {APPOINTMENTS.form.estimatedMinutes}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <div className="flex items-end gap-2">
                    <FormField
                      label={APPOINTMENTS.form.assignStaff}
                      className="min-w-0 flex-1"
                      error={
                        form.formState.errors.services?.[index]?.staffId
                          ?.message
                      }
                    >
                      <Select
                        value={
                          form.watch(`services.${index}.staffId`) || undefined
                        }
                        onValueChange={(v) =>
                          form.setValue(`services.${index}.staffId`, v)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
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
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {APPOINTMENTS.form.duration}: {duration}{' '}
                {APPOINTMENTS.form.estimatedMinutes}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{APPOINTMENTS.form.sectionNotes}</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder={APPOINTMENTS.form.notesPlaceholder}
                {...form.register('notes')}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{APPOINTMENTS.form.schedule}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField
                label={APPOINTMENTS.form.date}
                error={form.formState.errors.date?.message}
              >
                <Input type="date" {...form.register('date')} />
              </FormField>
              <FormField
                label={APPOINTMENTS.form.startTime}
                error={form.formState.errors.startTime?.message}
              >
                <Input type="time" step={1800} {...form.register('startTime')} />
              </FormField>
              <FormField label={APPOINTMENTS.form.endTime}>
                <Input value={endTimePreview} readOnly />
              </FormField>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{APPOINTMENTS.form.pricing}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {APPOINTMENTS.form.priceTotal}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gold-deep tabular-nums">
                {formatINR(priceTotal)}
              </p>
            </CardContent>
          </Card>
        </div>

        {form.formState.errors.root ? (
          <p className="text-sm text-destructive lg:col-span-3">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-safe lg:static lg:col-span-3 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-5xl justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.appointments)}
            >
              {APPOINTMENTS.form.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? COMMON.labels.loading : APPOINTMENTS.form.save}
            </Button>
          </div>
        </div>
      </form>

      <AppointmentConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirm(null)
            navigate(ROUTES.appointments)
          }
        }}
        kind={confirm?.kind ?? 'created'}
        appointment={confirm?.appointment ?? null}
        salonName={salonName}
        totalPrice={confirm?.total}
      />
    </div>
  )
}
