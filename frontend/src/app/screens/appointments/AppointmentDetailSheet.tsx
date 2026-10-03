import { useNavigate } from 'react-router-dom'

import { FormField } from '@/app/components/FormField'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
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
  useCancelAppointmentMutation,
  useChangeAppointmentStatusMutation,
} from '@/app/hooks/queries/useAppointmentsQuery'
import {
  appointmentCustomerLabel,
  appointmentStaffName,
  type Appointment,
  type AppointmentStatus,
} from '@/app/service/appointments/appointmentsApi'
import { formatINR } from '@/app/utils'

interface AppointmentDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  onEdit: (appointment: Appointment) => void
  onAppointmentChange?: (appointment: Appointment) => void
}

function invoiceId(appointment: Appointment): string | null {
  if (!appointment.invoice) return null
  return typeof appointment.invoice === 'string'
    ? appointment.invoice
    : appointment.invoice._id
}

export function AppointmentDetailSheet({
  open,
  onOpenChange,
  appointment,
  onEdit,
  onAppointmentChange,
}: AppointmentDetailSheetProps) {
  const navigate = useNavigate()
  const cancelMutation = useCancelAppointmentMutation()
  const statusMutation = useChangeAppointmentStatusMutation()

  if (!appointment) return null

  const canBill = appointment.status === 'booked' && !invoiceId(appointment)
  const canEdit = appointment.status === 'booked'
  const canCancel = appointment.status === 'booked'
  const linkedInvoice = invoiceId(appointment)

  const phone =
    appointment.customer && typeof appointment.customer === 'object'
      ? appointment.customer.phone
      : appointment.guestPhone

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{appointmentCustomerLabel(appointment)}</SheetTitle>
          <SheetDescription>
            {appointment.date} · {appointment.startTime}–{appointment.endTime}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md capitalize">
              {appointment.status.replace('_', ' ')}
            </Badge>
            {phone ? (
              <span className="text-xs text-muted-foreground tabular-nums">{phone}</span>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Services</p>
            <ul className="space-y-2">
              {appointment.services.map((line, index) => {
                const price =
                  typeof line.service === 'object' && line.service
                    ? line.service.price
                    : undefined
                return (
                  <li
                    key={`${appointmentServiceKey(line)}-${index}`}
                    className="rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{line.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.durationMinutes} min · {appointmentStaffName(line)}
                      {price != null ? ` · ${formatINR(price)}` : ''}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>

          {appointment.notes ? (
            <p className="text-sm text-muted-foreground">Notes: {appointment.notes}</p>
          ) : null}

          {canEdit ? (
            <FormField label="Status">
              <Select
                value={appointment.status}
                onValueChange={(value) => {
                  void statusMutation
                    .mutateAsync({
                      id: appointment._id,
                      status: value as AppointmentStatus,
                    })
                    .then((updated) => onAppointmentChange?.(updated))
                }}
                disabled={statusMutation.isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="no_show">No show</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          {linkedInvoice ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false)
                navigate(`/billing/${linkedInvoice}`)
              }}
            >
              View invoice
            </Button>
          ) : null}
        </SheetBody>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          {canBill ? (
            <Button
              type="button"
              className="min-touch w-full"
              onClick={() => {
                onOpenChange(false)
                navigate(`/billing/new?appointmentId=${appointment._id}`)
              }}
            >
              Create bill
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              className="min-touch w-full"
              onClick={() => {
                onOpenChange(false)
                onEdit(appointment)
              }}
            >
              Edit / reschedule
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              variant="outline"
              className="min-touch w-full text-destructive"
              disabled={cancelMutation.isPending}
              onClick={() => {
                void cancelMutation.mutateAsync(appointment._id).then(() => {
                  onOpenChange(false)
                })
              }}
            >
              {cancelMutation.isPending ? 'Cancelling…' : 'Cancel appointment'}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function appointmentServiceKey(line: Appointment['services'][number]): string {
  return typeof line.service === 'string' ? line.service : line.service._id
}
