import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { Button } from '@/app/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { APPOINTMENTS, COMMON, ROUTES } from '@/app/constants'
import { useAppointmentsQuery } from '@/app/hooks/queries/useAppointmentsQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { useActiveStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import type { Appointment } from '@/app/service/appointments/appointmentsApi'
import {
  AppointmentConfirmDialog,
  type ConfirmKind,
} from '@/app/screens/appointments/AppointmentConfirmDialog'
import { AppointmentSidePanel } from '@/app/screens/appointments/AppointmentSidePanel'
import { DayCalendar } from '@/app/screens/appointments/DayCalendar'
import { MonthCalendar } from '@/app/screens/appointments/MonthCalendar'
import { WeekCalendar } from '@/app/screens/appointments/WeekCalendar'
import { DEFAULT_CALENDAR_HOURS } from '@/app/screens/appointments/calendarConfig'
import { cn } from '@/app/utils'

type ViewMode = 'day' | 'week' | 'month'

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function isValidDateKey(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

export function AppointmentsScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const selectedDate = isValidDateKey(dateParam) ? dateParam : todayKey()
  const viewParam = searchParams.get('view') as ViewMode | null
  const view: ViewMode =
    viewParam === 'week' || viewParam === 'month' || viewParam === 'day'
      ? viewParam
      : typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
        ? 'week'
        : 'day'

  const [selectedId, setSelectedId] = useState<string | null>(null)
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
    if (business?.openingTime && business?.closingTime) {
      const [oh] = business.openingTime.split(':').map(Number)
      const [ch, cm] = business.closingTime.split(':').map(Number)
      return {
        startHour: oh ?? DEFAULT_CALENDAR_HOURS.startHour,
        endHour:
          (cm ?? 0) > 0
            ? (ch ?? DEFAULT_CALENDAR_HOURS.endHour) + 1
            : (ch ?? DEFAULT_CALENDAR_HOURS.endHour),
        slotMinutes: appt?.slotMinutes ?? DEFAULT_CALENDAR_HOURS.slotMinutes,
      }
    }
    return appt
      ? {
          startHour: appt.startHour,
          endHour: appt.endHour,
          slotMinutes: appt.slotMinutes,
        }
      : DEFAULT_CALENDAR_HOURS
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

  const weekStart = format(
    startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 }),
    'yyyy-MM-dd',
  )
  const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(parseISO(selectedDate)), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(parseISO(selectedDate)), 'yyyy-MM-dd')

  const listParams =
    view === 'day'
      ? { date: selectedDate, page: 1, limit: 200 }
      : view === 'week'
        ? { from: weekStart, to: weekEnd, page: 1, limit: 500 }
        : { from: monthStart, to: monthEnd, page: 1, limit: 500 }

  const appointmentsQuery = useAppointmentsQuery(listParams)
  const staff = staffQuery.data ?? []
  const appointments = appointmentsQuery.data?.items ?? []
  const urlId = searchParams.get('id')
  const effectiveId = selectedId ?? urlId
  const selected =
    appointments.find((a) => a._id === effectiveId) ?? null

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      navigate(`${ROUTES.appointments}/new?date=${selectedDate}`, {
        replace: true,
      })
    }
  }, [searchParams, selectedDate, navigate])

  const setDate = (next: string) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('date', next)
        params.delete('new')
        return params
      },
      { replace: true },
    )
  }

  const setView = (next: ViewMode) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('view', next)
        return params
      },
      { replace: true },
    )
  }

  const rangeLabel =
    view === 'day'
      ? format(parseISO(selectedDate), 'dd MMM yyyy')
      : view === 'week'
        ? `${format(parseISO(weekStart), 'dd MMM')} – ${format(parseISO(weekEnd), 'dd MMM yyyy')}`
        : format(parseISO(selectedDate), 'MMMM yyyy')

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
    } else if (view === 'week') {
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
    setSelectedId(appt._id)
    setMobilePanel(true)
  }

  const salonName =
    settingsQuery.data?.business?.salonName?.trim() || COMMON.appName

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-muted p-0.5">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium',
                  view === mode
                    ? 'bg-gold-soft text-gold-deep'
                    : 'text-muted-foreground',
                )}
                onClick={() => setView(mode)}
              >
                {mode === 'day'
                  ? APPOINTMENTS.list.viewDay
                  : mode === 'week'
                    ? APPOINTMENTS.list.viewWeek
                    : APPOINTMENTS.list.viewMonth}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="rounded-full"
              aria-label={APPOINTMENTS.list.prev}
              onClick={() => shift(-1)}
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
            </Button>
            <p className="min-w-[9rem] text-center text-sm font-semibold">
              {rangeLabel}
            </p>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="rounded-full"
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
        <Button asChild size="sm" className="h-9 rounded-full">
          <Link to={`${ROUTES.appointments}/new?date=${selectedDate}`}>
            {APPOINTMENTS.list.add}
          </Link>
        </Button>
      </div>

      {staffQuery.isLoading || appointmentsQuery.isLoading ? (
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
      !appointmentsQuery.isLoading &&
      !staffQuery.isError &&
      !appointmentsQuery.isError ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {view === 'day' ? (
              <DayCalendar
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
                month={format(parseISO(selectedDate), 'yyyy-MM')}
                appointments={appointments}
                onDayClick={(date) => {
                  setDate(date)
                  setView('day')
                }}
              />
            ) : null}
          </div>

          <div className="hidden lg:block">
            <AppointmentSidePanel
              appointment={selected}
              onEdit={(appt) =>
                navigate(`${ROUTES.appointments}/${appt._id}/edit`)
              }
              onCancelled={(appt) => {
                setSelectedId(appt._id)
                setConfirm({ kind: 'cancelled', appointment: appt })
              }}
            />
          </div>
        </div>
      ) : null}

      <Sheet
        open={mobilePanel || Boolean(urlId && selected)}
        onOpenChange={(open) => {
          setMobilePanel(open)
          if (!open && urlId) {
            setSearchParams(
              (prev) => {
                const params = new URLSearchParams(prev)
                params.delete('id')
                return params
              },
              { replace: true },
            )
            setSelectedId(null)
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-sm">
              {APPOINTMENTS.list.selectedTitle}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2 max-h-[70dvh] overflow-y-auto">
            <AppointmentSidePanel
              appointment={selected}
              onEdit={(appt) => {
                setMobilePanel(false)
                navigate(`${ROUTES.appointments}/${appt._id}/edit`)
              }}
              onCancelled={(appt) => {
                setSelectedId(appt._id)
                setMobilePanel(false)
                setConfirm({ kind: 'cancelled', appointment: appt })
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
