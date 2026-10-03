import {
  addDays,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns'

import {
  appointmentCustomerLabel,
  appointmentStaffName,
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

interface Props {
  weekStart: string
  appointments: Appointment[]
  selectedId?: string | null
  hours?: CalendarHours
  closedWeekdays?: string[]
  onSlotClick: (date: string, startTime: string) => void
  onAppointmentClick: (appointment: Appointment) => void
}

const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

export function WeekCalendar({
  weekStart,
  appointments,
  selectedId,
  hours = DEFAULT_CALENDAR_HOURS,
  closedWeekdays = [],
  onSlotClick,
  onAppointmentClick,
}: Props) {
  const start = startOfWeek(parseISO(weekStart), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const slots = buildTimeSlots(hours)
  const gridHeight = slots.length * CALENDAR_SLOT_HEIGHT_PX
  const today = new Date()

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <div
        className="grid min-w-[720px]"
        style={{
          gridTemplateColumns: `56px repeat(7, minmax(110px, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-border bg-card" />
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const closed = closedWeekdays.includes(
            WEEKDAY_KEYS[day.getDay()] ?? '',
          )
          const isToday = isSameDay(day, today)
          return (
            <div
              key={key}
              className={cn(
                'border-b border-r border-border bg-card px-1 py-2 text-center last:border-r-0',
                closed && 'bg-muted/50',
              )}
            >
              <p className="text-[10px] uppercase text-muted-foreground">
                {format(day, 'EEE')}
              </p>
              <p
                className={cn(
                  'mx-auto mt-0.5 flex size-7 items-center justify-center text-sm font-semibold',
                  isToday && 'rounded-full bg-gold text-on-gold',
                )}
              >
                {format(day, 'd')}
              </p>
            </div>
          )
        })}

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

        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const closed = closedWeekdays.includes(
            WEEKDAY_KEYS[day.getDay()] ?? '',
          )
          const dayAppts = appointments.filter((a) => a.date === key)
          return (
            <div
              key={key}
              className={cn(
                'relative border-r border-border last:border-r-0',
                closed && 'bg-muted/30',
              )}
              style={{ height: gridHeight }}
            >
              {slots.map((mins) => {
                const startTime = minutesToTime(mins)
                return (
                  <button
                    key={mins}
                    type="button"
                    disabled={closed}
                    className="absolute inset-x-0 w-full border-b border-border/60 hover:bg-muted/40 disabled:pointer-events-none"
                    style={{
                      top: appointmentTopPx(startTime, hours),
                      height: CALENDAR_SLOT_HEIGHT_PX,
                    }}
                    onClick={() => onSlotClick(key, startTime)}
                  />
                )
              })}
              {dayAppts.map((appt) => (
                <button
                  key={appt._id}
                  type="button"
                  className={cn(
                    'absolute inset-x-0.5 z-10 overflow-hidden rounded-lg px-1 py-0.5 text-left text-[10px]',
                    appointmentStatusClasses(
                      appt.status,
                      selectedId === appt._id,
                    ),
                  )}
                  style={{
                    top: appointmentTopPx(appt.startTime, hours),
                    height: Math.max(
                      appointmentHeightPx(appt.startTime, appt.endTime, hours) -
                        2,
                      28,
                    ),
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAppointmentClick(appt)
                  }}
                >
                  <p className="truncate font-semibold">
                    {appointmentCustomerLabel(appt)}
                  </p>
                  <p className="truncate opacity-80">
                    {appt.services[0]?.name}
                  </p>
                  <p className="truncate opacity-70">
                    {appointmentStaffName(appt.services[0]!)}
                  </p>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
