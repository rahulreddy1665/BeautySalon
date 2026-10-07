import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { Button } from '@/app/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet'
import { APPOINTMENTS, COMMON, ROUTES } from '@/app/constants'
import { useAppointmentsQuery } from '@/app/hooks/queries/useAppointmentsQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { useActiveStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import {
  appointmentCustomerLabel,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'
import {
  AppointmentConfirmDialog,
  type ConfirmKind,
} from '@/app/screens/appointments/AppointmentConfirmDialog'
import { AppointmentSidePanel } from '@/app/screens/appointments/AppointmentSidePanel'
import { DayCalendar } from '@/app/screens/appointments/DayCalendar'
import { MonthCalendar } from '@/app/screens/appointments/MonthCalendar'
import { WeekCalendar } from '@/app/screens/appointments/WeekCalendar'
import {
  DEFAULT_CALENDAR_HOURS,
  formatCompactTimeRange,
} from '@/app/screens/appointments/calendarConfig'
import { cn } from '@/app/utils'
import { getSalonNow, parseHhMm } from '@/app/utils/salonTime'

type ViewMode = 'day' | 'week' | 'month' | 'list'

function todayKey(): string {
  return getSalonNow().dateKey
}

function isValidDateKey(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function findNextUpcoming(items: Appointment[]): Appointment | null {
  const salon = getSalonNow()
  const upcoming = items
    .filter((a) => a.status === 'booked')
    .filter((a) => {
      if (a.date > salon.dateKey) return true
      if (a.date < salon.dateKey) return false
      const start = parseHhMm(a.startTime)
      return start != null && start >= salon.totalMinutes
    })
    .sort((a, b) =>
      a.date === b.date
        ? a.startTime.localeCompare(b.startTime)
        : a.date.localeCompare(b.date),
    )
  return upcoming[0] ?? null
}

function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
}

export function AppointmentsScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const selectedDate = isValidDateKey(dateParam) ? dateParam : todayKey()
  const viewParam = searchParams.get('view')
  const defaultView: ViewMode = isDesktopViewport() ? 'week' : 'day'
  const view: ViewMode =
    viewParam === 'week' ||
    viewParam === 'month' ||
    viewParam === 'day' ||
    viewParam === 'list'
      ? viewParam
      : defaultView
  const staffId = searchParams.get('staff') || undefined

  const [mobilePanel, setMobilePanel] = useState(false)
  const [confirm, setConfirm] = useState<{
    kind: ConfirmKind
    appointment: Appointment
  } | null>(null)

  const staffQuery = useActiveStaffQuery()
  const settingsQuery = useSalonSettingsQuery()
  const calendarHours = (() => {
    const business = settingsQuery.data?.business
    const appt = settingsQuery.data?.appointments
    const slotMinutes = appt?.slotMinutes ?? DEFAULT_CALENDAR_HOURS.slotMinutes

    if (business?.openingTime && business?.closingTime) {
      const openMin = (() => {
        const [h, m] = business.openingTime.split(':').map(Number)
        return (h ?? 9) * 60 + (m ?? 0)
      })()
      const closeMin = (() => {
        const [h, m] = business.closingTime.split(':').map(Number)
        return (h ?? 18) * 60 + (m ?? 0)
      })()
      // Grid uses whole hours; endHour is exclusive upper bound (ceil close).
      const startHour = Math.floor(openMin / 60)
      const endHour = Math.max(startHour + 1, Math.ceil(closeMin / 60))
      return { startHour, endHour, slotMinutes }
    }
    if (appt) {
      return {
        startHour: appt.startHour,
        endHour: appt.endHour,
        slotMinutes,
      }
    }
    return DEFAULT_CALENDAR_HOURS
  })()

  const closedWeekdays = useMemo(() => {
    const working = settingsQuery.data?.business?.workingDays ?? []
    const all = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]
    return all.filter((d) => !working.includes(d as never))
  }, [settingsQuery.data?.business?.workingDays])

  const anchor = parseISO(`${selectedDate}T12:00:00`)
  const weekStart = format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthGridStart = format(
    startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    'yyyy-MM-dd',
  )
  const monthGridEnd = format(
    endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
    'yyyy-MM-dd',
  )
  const listFrom = isValidDateKey(searchParams.get('from'))
    ? searchParams.get('from')!
    : weekStart
  const listTo = isValidDateKey(searchParams.get('to'))
    ? searchParams.get('to')!
    : weekEnd
  const rangeStart =
    view === 'day' ? selectedDate : view === 'month' ? monthGridStart : view === 'list' ? listFrom : weekStart
  const rangeEnd =
    view === 'day' ? selectedDate : view === 'month' ? monthGridEnd : view === 'list' ? listTo : weekEnd

  const listParams = {
    from: rangeStart,
    to: rangeEnd,
    staffId,
    page: 1,
    limit: view === 'day' ? 200 : 500,
  }

  const appointmentsQuery = useAppointmentsQuery(listParams)
  const staff = staffQuery.data ?? []
  const appointments = appointmentsQuery.data?.items ?? []
  const urlAppointmentId = searchParams.get('appointment') ?? searchParams.get('id')
  const selected = appointments.find((a) => a._id === urlAppointmentId) ?? null

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      navigate(`${ROUTES.appointments}/new?date=${selectedDate}`, {
        replace: true,
      })
    }
  }, [searchParams, selectedDate, navigate])

  useEffect(() => {
    if (urlAppointmentId || appointmentsQuery.isLoading) return
    if (!appointments.length) return
    const next = findNextUpcoming(appointments)
    if (!next) return
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('appointment', next._id)
        params.delete('id')
        return params
      },
      { replace: true },
    )
  }, [urlAppointmentId, appointments, appointmentsQuery.isLoading, setSearchParams])

  const setAppointmentId = (id: string | null) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (id) {
          params.set('appointment', id)
        } else {
          params.delete('appointment')
        }
        params.delete('id')
        return params
      },
      { replace: true },
    )
  }

  const setDate = (next: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('date', next)
      params.set('view', view)
      params.delete('new')
      params.delete('appointment')
      params.delete('id')
      return params
    })
  }

  const setView = (next: ViewMode) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('view', next)
      params.set('date', selectedDate)
      params.delete('appointment')
      params.delete('id')
      return params
    })
  }

  const weekStartDate = parseISO(`${weekStart}T12:00:00`)
  const weekEndDate = parseISO(`${weekEnd}T12:00:00`)
  const rangeLabel =
    view === 'week' || view === 'list'
      ? weekStartDate.getMonth() === weekEndDate.getMonth()
        ? `${format(weekStartDate, 'MMM d')} – ${format(weekEndDate, 'd, yyyy')}`
        : `${format(weekStartDate, 'MMM d')} – ${format(weekEndDate, 'MMM d, yyyy')}`
      : view === 'month'
        ? format(anchor, 'MMM yyyy')
        : format(anchor, 'd MMM yyyy')

  const shift = (dir: -1 | 1) => {
    if (view === 'day') {
      setDate(
        format(
          dir === 1
            ? addDays(parseISO(selectedDate), 1)
            : subDays(parseISO(selectedDate), 1),
          'yyyy-MM-dd',
        ),
      )
    } else if (view === 'week' || view === 'list') {
      setDate(
        format(
          dir === 1
            ? addDays(parseISO(selectedDate), 7)
            : subDays(parseISO(selectedDate), 7),
          'yyyy-MM-dd',
        ),
      )
    } else {
      setDate(
        format(
          dir === 1
            ? addMonths(parseISO(selectedDate), 1)
            : subMonths(parseISO(selectedDate), 1),
          'yyyy-MM-dd',
        ),
      )
    }
  }

  const openNew = (date: string, startTime: string, staffId?: string) => {
    const q = new URLSearchParams({ date, time: startTime })
    if (staffId) q.set('staffId', staffId)
    navigate(`${ROUTES.appointments}/new?${q.toString()}`)
  }

  const selectAppt = (appt: Appointment) => {
    setAppointmentId(appt._id)
    if (!isDesktopViewport()) {
      setMobilePanel(true)
    }
  }

  const salonName = settingsQuery.data?.business?.salonName?.trim() || COMMON.appName

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-muted p-0.5">
            {(['day', 'week', 'month', 'list'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium',
                  view === mode ? 'bg-gold-soft text-gold-deep' : 'text-muted-foreground',
                )}
                onClick={() => setView(mode)}
              >
                {mode === 'day'
                  ? APPOINTMENTS.list.viewDay
                  : mode === 'week'
                    ? APPOINTMENTS.list.viewWeek
                    : mode === 'month'
                      ? APPOINTMENTS.list.viewMonth
                      : APPOINTMENTS.list.viewList}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="shrink-0 rounded-full"
              aria-label={APPOINTMENTS.list.prev}
              onClick={() => shift(-1)}
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
            </Button>
            <p className="min-w-0 flex-1 truncate text-center text-xs font-semibold sm:text-sm">
              {rangeLabel}
            </p>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="shrink-0 rounded-full"
              aria-label={APPOINTMENTS.list.next}
              onClick={() => shift(1)}
            >
              <ChevronRight className="size-4" strokeWidth={1.75} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => setDate(todayKey())}
            >
              {APPOINTMENTS.list.today}
            </Button>
          </div>
        </div>
      </div>

      {appointmentsQuery.isFetching ? (
        <p className="text-xs text-muted-foreground">{APPOINTMENTS.list.loadingRange}</p>
      ) : null}

      {staffQuery.isLoading || (appointmentsQuery.isLoading && !appointmentsQuery.isPlaceholderData) ? (
        <LoadingSkeleton rows={8} />
      ) : null}

      {staffQuery.isError || appointmentsQuery.isError ? (
        <ErrorState
          error={staffQuery.error ?? appointmentsQuery.error}
          title={APPOINTMENTS.errors.loadFailed}
          onRetry={() => {
            void staffQuery.refetch()
            void appointmentsQuery.refetch()
          }}
        />
      ) : null}

      {!staffQuery.isLoading &&
      !(appointmentsQuery.isLoading && !appointmentsQuery.isPlaceholderData) &&
      !staffQuery.isError &&
      !appointmentsQuery.isError ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {view === 'day' ? (
              <DayCalendar
                date={selectedDate}
                staff={staff}
                appointments={appointments}
                selectedId={selected?._id}
                hours={calendarHours}
                onSlotClick={(staffId, startTime) =>
                  openNew(selectedDate, startTime, staffId)
                }
                onAppointmentClick={selectAppt}
              />
            ) : null}
            {view === 'week' ? (
              <WeekCalendar
                weekStart={weekStart}
                appointments={appointments}
                selectedId={selected?._id}
                hours={calendarHours}
                closedWeekdays={closedWeekdays}
                onSlotClick={(date, startTime) => openNew(date, startTime)}
                onAppointmentClick={selectAppt}
              />
            ) : null}
            {view === 'month' ? (
              <MonthCalendar
                month={format(anchor, 'yyyy-MM')}
                appointments={appointments}
                onDayClick={(date) => {
                  setDate(date)
                  setView('day')
                }}
              />
            ) : null}
            {view === 'list' ? (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {appointments.length === 0 ? (
                  <li className="px-3 py-6 text-sm text-muted-foreground">
                    {APPOINTMENTS.list.emptySlot}
                  </li>
                ) : (
                  appointments.map((appt) => (
                    <li key={appt._id}>
                      <button
                        type="button"
                        className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() => selectAppt(appt)}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {appointmentCustomerLabel(appt)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {format(parseISO(`${appt.date}T12:00:00`), 'd MMM')}{' '}
                          {formatCompactTimeRange(appt.startTime, appt.endTime)}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <div className="hidden lg:block">
            <AppointmentSidePanel
              appointment={selected}
              onEdit={(appt) => navigate(`${ROUTES.appointments}/${appt._id}/edit`)}
              onCancelled={(appt) => {
                setAppointmentId(appt._id)
                setConfirm({ kind: 'cancelled', appointment: appt })
              }}
              onStatusChange={(appt) => setAppointmentId(appt._id)}
            />
          </div>
        </div>
      ) : null}

      <Sheet
        open={mobilePanel}
        onOpenChange={(open) => {
          setMobilePanel(open)
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-sm">{APPOINTMENTS.list.selectedTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-2 max-h-[70dvh] overflow-y-auto">
            <AppointmentSidePanel
              appointment={selected}
              onEdit={(appt) => {
                setMobilePanel(false)
                navigate(`${ROUTES.appointments}/${appt._id}/edit`)
              }}
              onCancelled={(appt) => {
                setAppointmentId(appt._id)
                setMobilePanel(false)
                setConfirm({ kind: 'cancelled', appointment: appt })
              }}
              onStatusChange={(appt) => {
                setAppointmentId(appt._id)
                setMobilePanel(false)
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AppointmentConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        kind={confirm?.kind ?? 'cancelled'}
        appointment={confirm?.appointment ?? null}
        salonName={salonName}
      />
    </div>
  )
}
