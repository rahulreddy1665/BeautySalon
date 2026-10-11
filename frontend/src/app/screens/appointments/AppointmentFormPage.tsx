import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import {
  CategorySuggestions,
  type SuggestableService,
} from '@/app/components/CategorySuggestions'
import { FormField } from '@/app/components/FormField'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { Button } from '@/app/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import {
  SearchableSelect,
  type SearchableOption,
} from '@/app/components/ui/searchable-select'
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
import { useCombosQuery } from '@/app/hooks/queries/useCombosQuery'
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
import { formatINR, toErrorMessage } from '@/app/utils'
import { isAppointmentLocked } from '@/app/utils/salonTime'
import { AppointmentSidePanel } from '@/app/screens/appointments/AppointmentSidePanel'

const lineSchema = z.object({
  /** Service ObjectId, or `combo:<id>` for package selection. */
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
  const combosQuery = useCombosQuery(true)
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

  const watchedServices = useWatch({ control: form.control, name: 'services' })
  const mode = useWatch({ control: form.control, name: 'mode' })
  const catalog = servicesQuery.data ?? []
  const suggestCatalog = useMemo(
    (): SuggestableService[] =>
      catalog.map((s) => ({
        id: s._id,
        name: s.name,
        price: s.price,
        category: s.category,
      })),
    [catalog],
  )
  const [focusStaffIndex, setFocusStaffIndex] = useState<number | null>(null)
  const staffFocusRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (focusStaffIndex == null) return
    staffFocusRefs.current[focusStaffIndex]?.focus()
    setFocusStaffIndex(null)
  }, [focusStaffIndex, fields.length])

  const combos = combosQuery.data ?? []

  // Combos first, then services grouped by category (catalog is already sorted by category).
  const serviceOptions = useMemo(
    (): SearchableOption[] => [
      ...combos.map((combo) => ({
        value: `combo:${combo._id}`,
        label: combo.name,
        group: APPOINTMENTS.form.combosGroup,
        hint: formatINR(combo.comboPrice),
      })),
      ...catalog.map((svc) => ({
        value: svc._id,
        label: svc.name,
        group: svc.category || APPOINTMENTS.form.otherGroup,
        hint: formatINR(svc.price),
      })),
    ],
    [combos, catalog],
  )

  const priceTotal = useMemo(
    () =>
      (watchedServices ?? []).reduce((sum, line) => {
        if (line.serviceId.startsWith('combo:')) {
          const combo = combos.find((c) => c._id === line.serviceId.slice(6))
          return sum + (combo?.comboPrice ?? 0)
        }
        const svc = catalog.find((s) => s._id === line.serviceId)
        return sum + (svc?.price ?? 0)
      }, 0),
    [watchedServices, catalog, combos],
  )

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      date: values.date,
      startTime: values.startTime,
      notes: values.notes?.trim() || undefined,
      services: values.services.map((line) =>
        line.serviceId.startsWith('combo:')
          ? { comboId: line.serviceId.slice(6), staffId: line.staffId }
          : { serviceId: line.serviceId, staffId: line.staffId },
      ),
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

  const salonName = settingsQuery.data?.business?.salonName?.trim() || COMMON.appName

  const lockedEdit =
    isEdit &&
    appointmentQuery.data &&
    isAppointmentLocked(
      appointmentQuery.data.status,
      appointmentQuery.data.date,
      appointmentQuery.data.startTime,
    )

  if (lockedEdit && appointmentQuery.data) {
    return (
      <div className="mx-auto min-w-0 max-w-lg space-y-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="h-9 px-2">
            <Link to={ROUTES.appointments}>
              <ArrowLeft className="size-4" strokeWidth={1.75} />
              {APPOINTMENTS.form.back}
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">{APPOINTMENTS.form.viewTitle}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {APPOINTMENTS.form.viewOnlyBanner}
        </p>
        <AppointmentSidePanel
          appointment={appointmentQuery.data}
          onEdit={() => undefined}
          onCancelled={() => undefined}
        />
      </div>
    )
  }

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
          {isEdit ? APPOINTMENTS.form.editTitle : APPOINTMENTS.form.createTitle}
        </h1>
      </div>

      <form className="grid grid-cols-1 gap-4 lg:grid-cols-3" onSubmit={onSubmit} noValidate>
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{APPOINTMENTS.form.sectionContact}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField label={APPOINTMENTS.form.customer}>
                <Select
                  value={mode}
                  onValueChange={(v) => {
                    const next = v as 'customer' | 'guest'
                    if (next === 'guest') {
                      form.setValue('customerId', '')
                      form.setValue('guestName', '')
                      form.setValue('guestPhone', '')
                    }
                    form.setValue('mode', next)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">{APPOINTMENTS.form.guest}</SelectItem>
                    <SelectItem value="customer">{APPOINTMENTS.form.customer}</SelectItem>
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
                      const c = (customersQuery.data ?? []).find((x) => x._id === v)
                      if (c?.phone) form.setValue('guestPhone', String(c.phone))
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
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
                    value={(() => {
                      const c = (customersQuery.data ?? []).find(
                        (x) => x._id === form.watch('customerId'),
                      )
                      return c?.phone != null ? String(c.phone) : ''
                    })()}
                    readOnly
                  />
                </FormField>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{APPOINTMENTS.form.sectionServices}</CardTitle>
              <CardAction>
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
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-end gap-2 rounded-xl border border-border p-3"
                >
                  <FormField
                    label={APPOINTMENTS.form.services}
                    className="min-w-0 flex-1 basis-0"
                    error={
                      form.formState.errors.services?.[index]?.serviceId?.message
                    }
                  >
                    <SearchableSelect
                      value={form.watch(`services.${index}.serviceId`) || undefined}
                      onValueChange={(v) => {
                        form.setValue(`services.${index}.serviceId`, v, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                        setFocusStaffIndex(index)
                      }}
                      options={serviceOptions}
                      placeholder={APPOINTMENTS.form.servicePlaceholder}
                      searchPlaceholder={APPOINTMENTS.form.serviceSearch}
                      emptyText={APPOINTMENTS.form.serviceNoMatch}
                      aria-invalid={Boolean(
                        form.formState.errors.services?.[index]?.serviceId,
                      )}
                    />
                  </FormField>
                  <FormField
                    label={APPOINTMENTS.form.assignStaff}
                    className="min-w-0 flex-1 basis-0"
                    error={
                      form.formState.errors.services?.[index]?.staffId?.message
                    }
                  >
                    <Select
                      value={form.watch(`services.${index}.staffId`) || undefined}
                      onValueChange={(v) =>
                        form.setValue(`services.${index}.staffId`, v, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger
                        ref={(el) => {
                          staffFocusRefs.current[index] = el
                        }}
                        className="w-full"
                      >
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
                      className="shrink-0 self-end"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  ) : null}
                </div>
              ))}
              <CategorySuggestions
                selectedCatalogIds={(watchedServices ?? [])
                  .map((l) => l.serviceId)
                  .filter(Boolean)}
                catalog={suggestCatalog}
                onPick={(serviceId) => {
                  const emptyIndex = (watchedServices ?? []).findIndex(
                    (l) => !l.serviceId,
                  )
                  if (emptyIndex >= 0) {
                    form.setValue(`services.${emptyIndex}.serviceId`, serviceId, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                    setFocusStaffIndex(emptyIndex)
                    return
                  }
                  append({ serviceId, staffId: prefillStaff ?? '' })
                  setFocusStaffIndex(fields.length)
                }}
              />
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

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{APPOINTMENTS.form.schedule}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField
                label={APPOINTMENTS.form.date}
                error={form.formState.errors.date?.message}
              >
                <Input
                  type="date"
                  className="min-w-0 max-w-full max-lg:block max-lg:appearance-none max-lg:text-left max-lg:[&::-webkit-date-and-time-value]:text-left max-lg:[&::-webkit-date-and-time-value]:min-h-[1.5em]"
                  {...form.register('date')}
                />
              </FormField>
              <FormField
                label={APPOINTMENTS.form.startTime}
                error={form.formState.errors.startTime?.message}
              >
                <Input
                  type="time"
                  step={1800}
                  className="min-w-0 max-w-full max-lg:block max-lg:appearance-none max-lg:text-left max-lg:[&::-webkit-date-and-time-value]:text-left max-lg:[&::-webkit-date-and-time-value]:min-h-[1.5em]"
                  {...form.register('startTime')}
                />
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

          {/* Desktop: actions sit under pricing so the right column is usable without scrolling */}
          <div className="hidden gap-2 lg:grid lg:grid-cols-2">
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

        {form.formState.errors.root ? (
          <p className="text-sm text-destructive lg:col-span-3">
            {form.formState.errors.root.message}
          </p>
        ) : null}

        {/* Mobile: sticky bottom bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-safe lg:hidden">
          <div className="flex justify-end gap-2">
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
