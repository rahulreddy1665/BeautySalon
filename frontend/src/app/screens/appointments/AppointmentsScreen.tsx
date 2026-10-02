import { addDays, format, parseISO, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { useAppointmentsQuery } from '@/app/hooks/queries/useAppointmentsQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { useActiveStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import type { Appointment } from '@/app/service/appointments/appointmentsApi'
import {
  AppointmentFormSheet,
  type AppointmentPrefill,
} from '@/app/screens/appointments/AppointmentFormSheet'
import { AppointmentDetailSheet } from '@/app/screens/appointments/AppointmentDetailSheet'
import { DayCalendar } from '@/app/screens/appointments/DayCalendar'
import { DEFAULT_CALENDAR_HOURS } from '@/app/screens/appointments/calendarConfig'

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

function isValidDateKey(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

export function AppointmentsScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const selectedDate = isValidDateKey(dateParam) ? dateParam : todayKey()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [prefill, setPrefill] = useState<AppointmentPrefill | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [staffFilter, setStaffFilter] = useState<string>('all')

  const staffQuery = useActiveStaffQuery()
  const settingsQuery = useSalonSettingsQuery()
  const calendarHours = settingsQuery.data?.appointments ?? DEFAULT_CALENDAR_HOURS
  const appointmentsQuery = useAppointmentsQuery({
    date: selectedDate,
    staffId: staffFilter === 'all' ? undefined : staffFilter,
    page: 1,
    limit: 200,
  })

  const staff = staffQuery.data ?? []
  const visibleStaff = useMemo(() => {
    if (staffFilter === 'all') return staff
    return staff.filter((s) => s._id === staffFilter)
  }, [staff, staffFilter])

  const appointments = appointmentsQuery.data?.items ?? []

  const setDate = (next: string) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('date', next)
        return params
      },
      { replace: true },
    )
  }

  const openNew = (nextPrefill?: AppointmentPrefill) => {
    setEditing(null)
    setPrefill(
      nextPrefill ?? {
        date: selectedDate,
        startTime: '10:00',
      },
    )
    setFormOpen(true)
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Day calendar · book, reschedule, and bill when the guest arrives."
        actions={
          <Button
            type="button"
            size="sm"
            className="min-touch h-9"
            onClick={() => openNew()}
          >
            <Plus className="size-4" strokeWidth={1.75} />
            New appointment
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9"
            aria-label="Previous day"
            onClick={() =>
              setDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
            }
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </Button>
          <Input
            type="date"
            className="h-9 w-[10.5rem]"
            value={selectedDate}
            onChange={(e) => {
              if (isValidDateKey(e.target.value)) setDate(e.target.value)
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9"
            aria-label="Next day"
            onClick={() =>
              setDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
            }
          >
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9"
            onClick={() => setDate(todayKey())}
          >
            Today
          </Button>
        </div>

        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="h-9 w-full sm:w-48">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {staff.map((member) => (
              <SelectItem key={member._id} value={member._id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {staffQuery.isLoading || appointmentsQuery.isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : null}

      {staffQuery.isError || appointmentsQuery.isError ? (
        <ErrorState
          error={staffQuery.error ?? appointmentsQuery.error}
          title="Could not load calendar"
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
        <DayCalendar
          staff={visibleStaff}
          appointments={appointments}
          hours={calendarHours}
          onSlotClick={(staffId, startTime) =>
            openNew({ date: selectedDate, startTime, staffId })
          }
          onAppointmentClick={(appt) => {
            setSelected(appt)
            setDetailOpen(true)
          }}
        />
      ) : null}

      <AppointmentFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editing}
        prefill={prefill}
      />

      <AppointmentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        appointment={selected}
        onAppointmentChange={setSelected}
        onEdit={(appt) => {
          setEditing(appt)
          setPrefill(null)
          setFormOpen(true)
        }}
      />
    </div>
  )
}
