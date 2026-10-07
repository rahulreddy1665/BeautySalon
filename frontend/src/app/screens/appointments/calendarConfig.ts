/** Day calendar grid — defaults match Settings.appointments. */
export const CALENDAR_START_HOUR = 9
export const CALENDAR_END_HOUR = 21
export const CALENDAR_SLOT_MINUTES = 30

export const CALENDAR_SLOT_HEIGHT_PX = 44

export type CalendarHours = {
  startHour: number
  endHour: number
  slotMinutes: number
}

export const DEFAULT_CALENDAR_HOURS: CalendarHours = {
  startHour: CALENDAR_START_HOUR,
  endHour: CALENDAR_END_HOUR,
  slotMinutes: CALENDAR_SLOT_MINUTES,
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "4:00-4:45 PM" — one period when both times share it. */
export function formatCompactTimeRange(start: string, end: string): string {
  const parts = (time: string) => {
    const [hRaw, mRaw] = time.split(':').map(Number)
    const h = hRaw ?? 0
    const m = mRaw ?? 0
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 === 0 ? 12 : h % 12
    return { clock: `${hour12}:${String(m).padStart(2, '0')}`, period }
  }
  const a = parts(start)
  const b = parts(end)
  if (a.period === b.period) return `${a.clock}-${b.clock} ${b.period}`
  return `${a.clock} ${a.period}-${b.clock} ${b.period}`
}

export function formatHourLabel(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60)
  const m = minutesFromMidnight % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function buildTimeSlots(hours: CalendarHours = DEFAULT_CALENDAR_HOURS): number[] {
  const start = hours.startHour * 60
  const end = hours.endHour * 60
  const step = Math.max(5, hours.slotMinutes || CALENDAR_SLOT_MINUTES)
  const slots: number[] = []
  for (let t = start; t < end; t += step) {
    slots.push(t)
  }
  return slots
}

/** True when a clock time falls inside [startHour, endHour). */
export function isTimeWithinHours(
  time: string,
  hours: CalendarHours = DEFAULT_CALENDAR_HOURS,
): boolean {
  const mins = timeToMinutes(time)
  const start = hours.startHour * 60
  const end = hours.endHour * 60
  return mins >= start && mins < end
}

/** Appointment overlaps the visible calendar window. */
export function appointmentOverlapsHours(
  startTime: string,
  endTime: string,
  hours: CalendarHours = DEFAULT_CALENDAR_HOURS,
): boolean {
  const start = hours.startHour * 60
  const end = hours.endHour * 60
  const aStart = timeToMinutes(startTime)
  const aEnd = Math.max(aStart + 1, timeToMinutes(endTime))
  return aStart < end && aEnd > start
}

export function appointmentTopPx(
  startTime: string,
  hours: CalendarHours = DEFAULT_CALENDAR_HOURS,
): number {
  const start = hours.startHour * 60
  const step = Math.max(5, hours.slotMinutes || CALENDAR_SLOT_MINUTES)
  const mins = timeToMinutes(startTime) - start
  return (mins / step) * CALENDAR_SLOT_HEIGHT_PX
}

export function appointmentHeightPx(
  startTime: string,
  endTime: string,
  hours: CalendarHours = DEFAULT_CALENDAR_HOURS,
): number {
  const step = Math.max(5, hours.slotMinutes || CALENDAR_SLOT_MINUTES)
  const duration = Math.max(step, timeToMinutes(endTime) - timeToMinutes(startTime))
  return (duration / step) * CALENDAR_SLOT_HEIGHT_PX
}
