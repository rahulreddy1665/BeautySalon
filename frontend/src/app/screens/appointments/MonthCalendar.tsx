import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

import {
  appointmentCustomerLabel,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'
import { cn } from '@/app/utils'

interface Props {
  month: string
  appointments: Appointment[]
  onDayClick: (date: string) => void
}

export function MonthCalendar({ month, appointments, onDayClick }: Props) {
  const anchor = parseISO(`${month}-01`)
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  const today = new Date()

  const byDate = new Map<string, Appointment[]>()
  for (const a of appointments) {
    const list = byDate.get(a.date) ?? []
    list.push(a)
    byDate.set(a.date, list)
  }

  return (
    <div className="rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-[11px] font-medium text-muted-foreground">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="px-1 py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const list = byDate.get(key) ?? []
          const inMonth = isSameMonth(day, anchor)
          const isToday = isSameDay(day, today)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDayClick(key)}
              className={cn(
                'min-h-24 border-r border-b border-border p-1.5 text-left hover:bg-muted/40',
                !inMonth && 'bg-muted/20 text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-6 items-center justify-center text-xs font-semibold',
                  isToday && 'rounded-full bg-gold text-on-gold',
                )}
              >
                {format(day, 'd')}
              </span>
              {list.length > 0 ? (
                <p className="mt-1 text-[10px] font-medium text-gold-deep">
                  {list.length}
                </p>
              ) : null}
              {list.slice(0, 2).map((a) => (
                <p key={a._id} className="truncate text-[10px] text-muted-foreground">
                  {appointmentCustomerLabel(a)}
                </p>
              ))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
