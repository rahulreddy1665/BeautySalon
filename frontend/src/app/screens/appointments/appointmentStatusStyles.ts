import type { AppointmentStatus } from '@/app/service/appointments/appointmentsApi'

/** Pastel status surfaces from theme status tokens. */
export function appointmentStatusClasses(
  status: AppointmentStatus,
  selected?: boolean,
): string {
  const base = 'border border-transparent'
  const outline = selected ? 'ring-2 ring-gold' : ''
  switch (status) {
    case 'completed':
      return `${base} ${outline} bg-status-completed-bg text-status-completed`
    case 'cancelled':
      return `${base} ${outline} bg-status-cancelled-bg text-status-cancelled line-through opacity-80`
    case 'no_show':
      return `${base} ${outline} bg-status-no-show-bg text-status-no-show`
    default:
      return `${base} ${outline} bg-status-booked-bg text-status-booked`
  }
}

export function appointmentStatusChipClasses(status: AppointmentStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-status-completed-bg text-status-completed'
    case 'cancelled':
      return 'bg-status-cancelled-bg text-status-cancelled'
    case 'no_show':
      return 'bg-status-no-show-bg text-status-no-show'
    default:
      return 'bg-status-booked-bg text-status-booked'
  }
}
