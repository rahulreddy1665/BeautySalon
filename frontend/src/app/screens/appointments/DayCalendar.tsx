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
  appointmentTopPx,
  buildTimeSlots,
  formatHourLabel,
  minutesToTime,
  type CalendarHours,
} from '@/app/screens/appointments/calendarConfig'
import { appointmentStatusClasses } from '@/app/screens/appointments/appointmentStatusStyles'
import { cn } from '@/app/utils'

interface DayCalendarProps {
  staff: StaffMember[]
  appointments: Appointment[]
  selectedId?: string | null
  hours?: CalendarHours
  onSlotClick: (staffId: string, startTime: string) => void
  onAppointmentClick: (appointment: Appointment) => void
}

export function DayCalendar({
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
        className="grid min-w-[640px]"
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
          const columnAppts = appointments.filter((appt) =>
            appt.services.some((line) => appointmentStaffId(line) === member._id),
          )
          return (
            <div
              key={member._id}
              className="relative border-r border-border last:border-r-0"
              style={{ height: gridHeight }}
            >
              {slots.map((mins) => {
                const startTime = minutesToTime(mins)
                return (
                  <button
                    key={mins}
                    type="button"
                    className="absolute inset-x-0 w-full border-b border-border/70 transition-colors hover:bg-muted/50"
                    style={{
                      top: appointmentTopPx(startTime, hours),
                      height: CALENDAR_SLOT_HEIGHT_PX,
                    }}
                    aria-label={`Book ${member.name} at ${startTime}`}
                    onClick={() => onSlotClick(member._id, startTime)}
                  />
                )
              })}

              {columnAppts.map((appt) => {
                const top = appointmentTopPx(appt.startTime, hours)
                const height = appointmentHeightPx(
                  appt.startTime,
                  appt.endTime,
                  hours,
                )
                return (
                  <button
                    key={`${appt._id}-${member._id}`}
                    type="button"
                    className={cn(
                      'absolute inset-x-1 z-10 overflow-hidden rounded-lg px-1.5 py-1 text-left',
                      appointmentStatusClasses(
                        appt.status,
                        selectedId === appt._id,
                      ),
                    )}
                    style={{ top, height: Math.max(height - 2, 28) }}
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
