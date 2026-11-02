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
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { Button } from '@/app/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet'
import { APPOINTMENTS, COMMON, ROUTES } from '@/app/constants'
import {
  useAppointmentsWindowQuery,
  useNextStaffAppointmentQuery,
} from '@/app/hooks/queries/useAppointmentsQuery'
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
  formatCompactTime,
} from '@/app/screens/appointments/calendarConfig'
import { cn } from '@/app/utils'
import { getSalonNow, parseHhMm } from '@/app/utils/salonTime'

type ViewMode = 'day' | 'week' | 'month' | 'list'

/** Shared empty arrays keep props referentially stable for the memoised calendars. */
const NO_APPOINTMENTS: Appointment[] = []
const NO_STAFF: never[] = []
const ALL_STAFF = 'all'

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

/**
 * URL state as plain values. Reading them through a hook (instead of straight
 * off the URLSearchParams object) lets the memoised handlers below depend on
 * immutable primitives.
 */
function useAppointmentsUrlState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const viewParam = searchParams.get('view')
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  return {
    searchParams,
    setSearchParams,
    selectedDate: isValidDateKey(dateParam) ? dateParam : todayKey(),
    view: (viewParam === 'week' ||
    viewParam === 'month' ||
    viewParam === 'day' ||
    viewParam === 'list'
      ? viewParam
      : isDesktopViewport()
        ? 'week'
        : 'day') as ViewMode,
    staffId: searchParams.get('staff') || undefined,
    listFromParam: isValidDateKey(fromParam) ? fromParam : null,
    listToParam: isValidDateKey(toParam) ? toParam : null,
    urlAppointmentId: searchParams.get('appointment') ?? searchParams.get('id'),
  }
}

export function AppointmentsScreen() {
  const navigate = useNavigate()
  const {
    searchParams,
    setSearchParams,
    selectedDate,
    view,
    staffId,
    listFromParam,
    listToParam,
    urlAppointmentId,
  } = useAppointmentsUrlState()

  const [mobilePanel, setMobilePanel] = useState(false)
  const [confirm, setConfirm] = useState<{
    kind: ConfirmKind
    appointment: Appointment
  } | null>(null)

  const staffQuery = useActiveStaffQuery()
  const settingsQuery = useSalonSettingsQuery()
  const business = settingsQuery.data?.business
  const apptSettings = settingsQuery.data?.appointments
  // Memoised so the calendars (memo components) don't re-render for an equal object.
  const calendarHours = useMemo(() => {
    const appt = apptSettings
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
  }, [business, apptSettings])

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
  const listFrom = listFromParam ?? weekStart
  const listTo = listToParam ?? weekEnd
  const rangeStart =
    view === 'day' ? selectedDate : view === 'month' ? monthGridStart : view === 'list' ? listFrom : weekStart
  const rangeEnd =
    view === 'day' ? selectedDate : view === 'month' ? monthGridEnd : view === 'list' ? listTo : weekEnd

  // Every appointment in the visible window; pages are fetched until `total`.
  const appointmentsQuery = useAppointmentsWindowQuery({
    from: rangeStart,
    to: rangeEnd,
    staffId,
  })
  const staff = staffQuery.data ?? NO_STAFF
  const appointments = appointmentsQuery.data?.items ?? NO_APPOINTMENTS
  // Day view filtered to one person with nothing booked that day: point them to
  // that person's next appointment instead of showing a silently empty grid.
  const staffDayEmpty =
    view === 'day' &&
    Boolean(staffId) &&
    !appointmentsQuery.isFetching &&
    appointmentsQuery.isSuccess &&
    !appointments.some((a) => a.date === selectedDate)
  const nextStaffQuery = useNextStaffAppointmentQuery(
    staffId,
    format(addDays(parseISO(`${selectedDate}T12:00:00`), 1), 'yyyy-MM-dd'),
    staffDayEmpty,
  )
  // Day view: one column for the selected staff member, or everyone.
  const dayStaff = useMemo(
    () => (staffId ? staff.filter((s) => s._id === staffId) : staff),
    [staff, staffId],
  )
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

  // Stable handlers (useCallback) so the memoised calendars don't re-render on
  // unrelated updates, e.g. opening the mobile details sheet.
  const selectAppt = useCallback(
    (appt: Appointment) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          params.set('appointment', appt._id)
          params.delete('id')
          return params
        },
        { replace: true },
      )
      if (!isDesktopViewport()) setMobilePanel(true)
    },
    [setSearchParams, setMobilePanel],
  )

  const onDaySlotClick = useCallback(
    (slotStaffId: string, startTime: string) =>
      navigate(
        `${ROUTES.appointments}/new?${new URLSearchParams({
          date: selectedDate,
          time: startTime,
          staffId: slotStaffId,
        }).toString()}`,
      ),
    [navigate, selectedDate],
  )

  const onWeekSlotClick = useCallback(
    (date: string, startTime: string) => {
      const q = new URLSearchParams({ date, time: startTime })
      if (staffId) q.set('staffId', staffId)
      navigate(`${ROUTES.appointments}/new?${q.toString()}`)
    },
    [navigate, staffId],
  )

  const onMonthDayClick = useCallback(
    (date: string) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        params.set('date', date)
        params.set('view', 'day')
        params.delete('appointment')
        params.delete('id')
        return params
      }),
    [setSearchParams],
  )

  const setStaffFilter = (next: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next === ALL_STAFF) params.delete('staff')
      else params.set('staff', next)
      params.delete('appointment')
      params.delete('id')
      return params
    })
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
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {/* Inline, fixed-size indicator: refetches no longer push the calendar down. */}
          <Loader2
            className={cn(
              'size-4 shrink-0 animate-spin text-muted-foreground',
              !appointmentsQuery.isFetching && 'invisible',
            )}
            aria-label={APPOINTMENTS.list.loadingRange}
          />
          <Select value={staffId ?? ALL_STAFF} onValueChange={setStaffFilter}>
            <SelectTrigger
              size="sm"
              className="w-full sm:w-44"
              aria-label={APPOINTMENTS.list.staffFilter}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STAFF}>{APPOINTMENTS.list.allStaff}</SelectItem>
              {staff.map((member) => (
                <SelectItem key={member._id} value={member._id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
          <div className="min-w-0 space-y-3">
            {staffDayEmpty ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
                <p className="min-w-0">
                  {APPOINTMENTS.list.staffDayEmpty
                    .replace('{name}', staff.find((m) => m._id === staffId)?.name ?? '')
                    .replace('{date}', format(anchor, 'd MMM'))}{' '}
                  {nextStaffQuery.data ? (
                    <span className="text-muted-foreground">
                      {APPOINTMENTS.list.staffNext.replace(
                        '{when}',
                        `${format(parseISO(`${nextStaffQuery.data.date}T12:00:00`), 'EEE d MMM')}, ${formatCompactTime(nextStaffQuery.data.startTime)}`,
                      )}
                    </span>
                  ) : nextStaffQuery.isSuccess ? (
                    <span className="text-muted-foreground">
                      {APPOINTMENTS.list.staffNoUpcoming.replace(
                        '{name}',
                        staff.find((m) => m._id === staffId)?.name ?? '',
                      )}
                    </span>
                  ) : null}
                </p>
                {nextStaffQuery.data ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setDate(nextStaffQuery.data!.date)}
                  >
                    {APPOINTMENTS.list.goToDay}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {view === 'day' ? (
              <DayCalendar
                date={selectedDate}
                staff={dayStaff}
                appointments={appointments}
                selectedId={selected?._id}
                hours={calendarHours}
                onSlotClick={onDaySlotClick}
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
                onSlotClick={onWeekSlotClick}
                onAppointmentClick={selectAppt}
              />
            ) : null}
            {view === 'month' ? (
              <MonthCalendar
                month={format(anchor, 'yyyy-MM')}
                appointments={appointments}
                onDayClick={onMonthDayClick}
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
                          {formatCompactTime(appt.startTime)}
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
