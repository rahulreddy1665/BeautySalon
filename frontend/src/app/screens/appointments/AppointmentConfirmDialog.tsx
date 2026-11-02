import { CheckCircle2, XCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { APPOINTMENTS } from '@/app/constants'
import {
  appointmentCustomerLabel,
  appointmentStaffName,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'
import { fillWhatsAppMessage, normalizeWhatsAppPhone } from '@/app/utils/phone'
import { formatINR } from '@/app/utils'
import { cn } from '@/app/utils'

export type ConfirmKind = 'created' | 'updated' | 'cancelled' | 'billed'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: ConfirmKind
  appointment: Appointment | null
  salonName: string
  totalPrice?: number
}

function titleFor(kind: ConfirmKind): string {
  switch (kind) {
    case 'updated':
      return APPOINTMENTS.confirm.updatedTitle
    case 'cancelled':
      return APPOINTMENTS.confirm.cancelledTitle
    case 'billed':
      return APPOINTMENTS.confirm.billedTitle
    default:
      return APPOINTMENTS.confirm.createdTitle
  }
}

export function AppointmentConfirmDialog({
  open,
  onOpenChange,
  kind,
  appointment,
  salonName,
  totalPrice,
}: Props) {
  if (!appointment) return null
  const customer = appointmentCustomerLabel(appointment)
  const phone =
    (typeof appointment.customer === 'object' && appointment.customer?.phone
      ? String(appointment.customer.phone)
      : appointment.guestPhone) || ''
  const services = appointment.services.map((s) => s.name).join(', ')
  const staff = [
    ...new Set(appointment.services.map((s) => appointmentStaffName(s))),
  ].join(', ')
  const dateLabel = format(parseISO(appointment.date), 'dd MMM yyyy')
  const timeLabel = appointment.startTime

  const onPrint = () => window.print()

  const onWhatsApp = () => {
    const digits = normalizeWhatsAppPhone(phone)
    if (!digits) return
    const text = fillWhatsAppMessage(APPOINTMENTS.confirm.whatsappTemplate, {
      customer,
      salon: salonName,
      amount: totalPrice != null ? formatINR(totalPrice) : '',
      link: '',
    })
      .replace('{date}', dateLabel)
      .replace('{time}', appointment.startTime)
      .replace('{services}', services)
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const Icon = kind === 'cancelled' ? XCircle : CheckCircle2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md print:shadow-none">
        <DialogHeader className="items-center text-center">
          <Icon
            className={cn(
              'mb-2 size-14',
              kind === 'cancelled' ? 'text-destructive' : 'text-success',
            )}
            strokeWidth={1.5}
          />
          <DialogTitle className="text-xl">{titleFor(kind)}</DialogTitle>
          <p className="text-sm text-muted-foreground">{APPOINTMENTS.confirm.subtitle}</p>
        </DialogHeader>

        <div className="border border-border bg-muted/30 p-3 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {APPOINTMENTS.confirm.summary}
          </p>
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{APPOINTMENTS.confirm.customer}</dt>
              <dd className="font-medium">{customer}</dd>
            </div>
            {phone ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{APPOINTMENTS.confirm.phone}</dt>
                <dd className="tabular-nums">{phone}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{APPOINTMENTS.confirm.services}</dt>
              <dd className="max-w-[60%] text-right">{services}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{APPOINTMENTS.confirm.staff}</dt>
              <dd className="text-right">{staff}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{APPOINTMENTS.confirm.date}</dt>
              <dd>{dateLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{APPOINTMENTS.confirm.time}</dt>
              <dd className="tabular-nums">{timeLabel}</dd>
            </div>
            {totalPrice != null ? (
              <div className="flex justify-between gap-2 border-t border-border pt-1.5 font-semibold">
                <dt>{APPOINTMENTS.confirm.total}</dt>
                <dd className="text-gold-deep">{formatINR(totalPrice)}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <DialogFooter className="print:hidden sm:justify-between">
          <Button type="button" variant="outline" onClick={onPrint}>
            {APPOINTMENTS.confirm.print}
          </Button>
          <Button type="button" disabled={!phone} onClick={onWhatsApp}>
            {APPOINTMENTS.confirm.sendWhatsApp}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
