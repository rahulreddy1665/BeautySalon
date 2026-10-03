import type { StaffMember } from '@/app/service/staff/staffApi'
import {
  appointmentCustomerLabel,
  appointmentStaffId,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'
import {
  CALENDAR_SLOT_HEIGHT_PX,
  DEFAULT_CALENDAR_HOURS,
  appointmentHeightPx,
  appointmentOverlapsHours,
  appointmentTopPx,
  buildTimeSlots,
  formatHourLabel,
  isTimeWithinHours,
  minutesToTime,
  type CalendarHours,
} from '@/app/screens/appointments/calendarConfig'
import { appointmentStatusClasses } from '@/app/screens/appointments/appointmentStatusStyles'
import { cn } from '@/app/utils'
import { isAppointmentEndPast, isSlotInPast } from '@/app/utils/salonTime'

interface DayCalendarProps {
  date: string
  staff: StaffMember[]
  appointments: Appointment[]
  selectedId?: string | null
  hours?: CalendarHours
  onSlotClick: (staffId: string, startTime: string) => void
  onAppointmentClick: (appointment: Appointment) => void
}

export function DayCalendar({
  date,
  staff,
  appointments,
  selectedId,
  hours = DEFAULT_CALENDAR_HOURS,
  onSlotClick,
  onAppointmentClick,
}: DayCalendarProps) {
  const slots = buildTimeSlots(hours)
  const gridHeight = slots.length * CALENDAR_SLOT_HEIGHT_PX

  if (staff.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Add active staff to see the day calendar.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <div
        className="grid min-w-[640px] overflow-y-hidden"
        style={{
          gridTemplateColumns: `56px repeat(${staff.length}, minmax(140px, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-20 border-b border-r border-border bg-card" />
        {staff.map((member) => (
          <div
            key={member._id}
            className="border-b border-r border-border bg-card px-2 py-2 text-center last:border-r-0"
          >
            <p className="truncate text-xs font-semibold">{member.name}</p>
          </div>
        ))}

        <div className="relative border-r border-border bg-card">
          {slots.map((mins) => (
            <div
              key={mins}
              className="border-b border-border px-1 text-[10px] text-muted-foreground tabular-nums"
              style={{ height: CALENDAR_SLOT_HEIGHT_PX }}
            >
              {mins % 60 === 0 ? formatHourLabel(mins) : ''}
            </div>
          ))}
        </div>

        {staff.map((member) => {
          const columnAppts = appointments.filter(
            (appt) =>
              appointmentOverlapsHours(appt.startTime, appt.endTime, hours) &&
              appt.services.some((line) => appointmentStaffId(line) === member._id),
          )
          return (
            <div
              key={member._id}
              className="relative overflow-hidden border-r border-border last:border-r-0"
              style={{ height: gridHeight }}
            >
              {slots.map((mins) => {
                const startTime = minutesToTime(mins)
                const past = isSlotInPast(date, startTime)
                const inHours = isTimeWithinHours(startTime, hours)
                return (
                  <button
                    key={mins}
                    type="button"
                    disabled={past || !inHours}
                    className={cn(
                      'absolute inset-x-0 w-full border-b border-border/70 transition-colors',
                      past || !inHours
                        ? 'cursor-not-allowed bg-muted/20'
                        : 'hover:bg-muted/50',
                    )}
                    style={{
                      top: appointmentTopPx(startTime, hours),
                      height: CALENDAR_SLOT_HEIGHT_PX,
                    }}
                    aria-label={`Book ${member.name} at ${startTime}`}
                    onClick={() => {
                      if (past || !inHours) return
                      onSlotClick(member._id, startTime)
                    }}
                  />
                )
              })}

              {columnAppts.map((appt) => {
                const top = Math.max(0, appointmentTopPx(appt.startTime, hours))
                const rawHeight = appointmentHeightPx(appt.startTime, appt.endTime, hours)
                const height = Math.min(
                  Math.max(rawHeight - 2, 28),
                  Math.max(0, gridHeight - top),
                )
                const past = isAppointmentEndPast(appt.date, appt.endTime)
                return (
                  <button
                    key={`${appt._id}-${member._id}`}
                    type="button"
                    className={cn(
                      'absolute inset-x-1 z-10 overflow-hidden rounded-lg px-1.5 py-1 text-left transition-shadow',
                      appointmentStatusClasses(appt.status, selectedId === appt._id),
                      past && 'opacity-60',
                      !past && 'hover:brightness-[0.98]',
                    )}
                    style={{ top, height }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAppointmentClick(appt)
                    }}
                  >
                    <p className="truncate text-[11px] font-semibold leading-tight">
                      {appointmentCustomerLabel(appt)}
                    </p>
                    <p className="truncate text-[10px] tabular-nums opacity-80">
                      {appt.startTime}–{appt.endTime}
                    </p>
                    <p className="truncate text-[10px] opacity-70">
                      {appt.services.map((s) => s.name).join(', ')}
                    </p>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
