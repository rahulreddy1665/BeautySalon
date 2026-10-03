import { Link } from 'react-router-dom'

import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { Button } from '@/app/components/ui/button'
import { APPOINTMENTS, ROUTES } from '@/app/constants'
import {
  useCancelAppointmentMutation,
} from '@/app/hooks/queries/useAppointmentsQuery'
import { useServicesCatalogQuery } from '@/app/hooks/queries/useServicesQuery'
import {
  appointmentCustomerLabel,
  appointmentServiceId,
  appointmentStaffName,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'
import { appointmentStatusChipClasses } from '@/app/screens/appointments/appointmentStatusStyles'
import { formatINR } from '@/app/utils'
import { cn } from '@/app/utils'

interface Props {
  appointment: Appointment | null
  onEdit: (appt: Appointment) => void
  onCancelled: (appt: Appointment) => void
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function AppointmentSidePanel({
  appointment,
  onEdit,
  onCancelled,
  className,
}: Props) {
  const cancelMutation = useCancelAppointmentMutation()
  const servicesQuery = useServicesCatalogQuery()

  if (!appointment) {
    return (
      <aside
        className={cn(
          'flex h-full flex-col rounded-xl border border-dashed border-border bg-card p-4',
          className,
        )}
      >
        <p className="text-sm font-medium">{APPOINTMENTS.list.emptySlot}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {APPOINTMENTS.list.emptySlotHint}
        </p>
      </aside>
    )
  }

  const name = appointmentCustomerLabel(appointment)
  const phone =
    (typeof appointment.customer === 'object' && appointment.customer?.phone
      ? String(appointment.customer.phone)
      : appointment.guestPhone) || '—'
  const catalog = servicesQuery.data ?? []
  const price = appointment.services.reduce((sum, line) => {
    const svc = catalog.find((s) => s._id === appointmentServiceId(line))
    return sum + (svc?.price ?? 0)
  }, 0)
  const canBill =
    appointment.status === 'booked' && !appointment.invoice

  return (
    <aside
      className={cn(
        'flex h-full flex-col rounded-xl border border-border bg-card p-4',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {APPOINTMENTS.list.selectedTitle}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarFallback className="bg-gold-soft text-sm font-semibold text-gold-deep">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <span
            className={cn(
              'mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
              appointmentStatusChipClasses(appointment.status),
            )}
          >
            {APPOINTMENTS.status[appointment.status]}
          </span>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">
            {APPOINTMENTS.detail.phone}
          </dt>
          <dd className="tabular-nums">{phone}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {APPOINTMENTS.detail.services}
          </dt>
          <dd>{appointment.services.map((s) => s.name).join(', ')}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {APPOINTMENTS.detail.timeSlot}
          </dt>
          <dd className="tabular-nums">
            {appointment.date} · {appointment.startTime}–{appointment.endTime}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {APPOINTMENTS.detail.staff}
          </dt>
          <dd>
            {[
              ...new Set(
                appointment.services.map((s) => appointmentStaffName(s)),
              ),
            ].join(', ')}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            {APPOINTMENTS.detail.price}
          </dt>
          <dd className="font-semibold text-gold-deep">{formatINR(price)}</dd>
        </div>
        {appointment.notes ? (
          <div>
            <dt className="text-xs text-muted-foreground">
              {APPOINTMENTS.detail.notes}
            </dt>
            <dd className="whitespace-pre-wrap">{appointment.notes}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button type="button" onClick={() => onEdit(appointment)}>
          {APPOINTMENTS.detail.edit}
        </Button>
        {canBill ? (
          <Button asChild variant="outline">
            <Link to={`${ROUTES.billingNew}?appointmentId=${appointment._id}`}>
              {APPOINTMENTS.detail.collectPayment}
            </Link>
          </Button>
        ) : null}
        {appointment.status === 'booked' ? (
          <Button
            type="button"
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
            disabled={cancelMutation.isPending}
            onClick={async () => {
              await cancelMutation.mutateAsync(appointment._id)
              onCancelled({ ...appointment, status: 'cancelled' })
            }}
          >
            {APPOINTMENTS.detail.cancel}
          </Button>
        ) : null}
      </div>
    </aside>
  )
}
