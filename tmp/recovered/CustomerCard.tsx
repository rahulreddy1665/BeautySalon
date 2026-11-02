import { isBefore, startOfDay } from 'date-fns'
import { useMemo, useState } from 'react'

import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { BILLING, COMMON, DASHBOARD } from '@/app/constants'
import { useAppointmentsQuery } from '@/app/hooks/queries/useAppointmentsQuery'
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import { useLoyaltyBalancesQuery } from '@/app/hooks/queries/useLoyaltyQuery'
import { SegmentedControl } from '@/app/screens/billing/new-bill/segmented'
import { CustomerFormSheet } from '@/app/screens/customers/CustomerFormSheet'
import {
  appointmentCustomerLabel,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'
import type { Customer } from '@/app/service/customers/customersApi'
import type { BillingCartState } from '@/app/state/redux/slices/billingCartSlice'
import { getSalonNow } from '@/app/utils/salonTime'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

function isReturningClient(customer?: Customer | null): boolean {
  if (!customer?.createdAt) return Boolean(customer)
  return isBefore(new Date(customer.createdAt), startOfDay(new Date()))
}

export function CustomerCard({
  cart,
  fromAppointment,
  onWalkIn,
  onSelectCustomer,
  onWalkInDetails,
  onLoadAppointment,
  onClearAppointment,
}: {
  cart: BillingCartState
  fromAppointment: boolean
  onWalkIn: () => void
  onSelectCustomer: (id: string, name: string) => void
  onWalkInDetails: (patch: { name?: string; phone?: string }) => void
  onLoadAppointment: (appt: Appointment) => void
  onClearAppointment: () => void
}) {
  const [mode, setMode] = useState<'walk-in' | 'appointment'>(
    cart.appointmentId ? 'appointment' : 'walk-in',
  )
  const [customerSearch, setCustomerSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const todayKey = getSalonNow().dateKey

  const customersQuery = useCustomersQuery()
  const balancesQuery = useLoyaltyBalancesQuery()
  const appointmentsQuery = useAppointmentsQuery({
    date: todayKey,
    status: 'booked',
    limit: 100,
  })

  const balanceById = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of balancesQuery.data ?? []) {
      map.set(row.customerId, row.points)
    }
    return map
  }, [balancesQuery.data])

  const customerResults = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return []
    return (customersQuery.data ?? [])
      .filter((c) => {
        const name = [c.name, c.lastName].filter(Boolean).join(' ').toLowerCase()
        const phone = String(c.phone ?? '')
        return name.includes(q) || phone.includes(q)
      })
      .slice(0, 8)
  }, [customerSearch, customersQuery.data])

  const selectedCustomer = useMemo(
    () => (customersQuery.data ?? []).find((c) => c._id === cart.customerId) ?? null,
    [customersQuery.data, cart.customerId],
  )

  const bookedAppointments = useMemo(
    () =>
      (appointmentsQuery.data?.items ?? []).filter(
        (a) => a.status === 'booked' && !a.invoice,
      ),
    [appointmentsQuery.data?.items],
  )

  const selectedAppt = useMemo(
    () => bookedAppointments.find((a) => a._id === cart.appointmentId) ?? null,
    [bookedAppointments, cart.appointmentId],
  )

  const switchMode = (next: 'walk-in' | 'appointment') => {
    setMode(next)
    if (next === 'walk-in' && cart.appointmentId) {
      onClearAppointment()
      onWalkIn()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base">{BILLING.new.customerCardTitle}</CardTitle>
        <SegmentedControl
          value={mode}
          onChange={switchMode}
          options={[
            { value: 'walk-in', label: BILLING.new.walkIn },
            { value: 'appointment', label: BILLING.new.appointmentMode },
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {mode === 'appointment' ? (
          selectedAppt || (fromAppointment && cart.appointmentId) ? (
            <SelectedAppointmentSummary
              name={cart.customerName}
              phone={
                selectedAppt
                  ? typeof selectedAppt.customer === 'object' && selectedAppt.customer
                    ? String(selectedAppt.customer.phone ?? selectedAppt.guestPhone ?? '')
                    : selectedAppt.guestPhone ?? ''
                  : cart.walkInPhone
              }
              time={selectedAppt?.startTime}
              returning={
                cart.customerId
                  ? isReturningClient(selectedCustomer)
                  : false
              }
              onChange={() => {
                onClearAppointment()
              }}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{BILLING.new.pickAppointment}</p>
              {bookedAppointments.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                  {BILLING.new.noAppointmentsToday}
                </p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-auto rounded-md border border-border">
                  {bookedAppointments.map((appt) => {
                    const name = appointmentCustomerLabel(appt)
                    return (
                      <li key={appt._id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
                          onClick={() => onLoadAppointment(appt)}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{name}</span>
                            <span className="text-xs text-muted-foreground">
                              {appt.services.map((s) => s.name).join(', ')}
                            </span>
                          </span>
                          <Badge variant="outline" className="shrink-0 font-normal">
                            {BILLING.new.bookedAt.replace('{time}', appt.startTime)}
                          </Badge>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        ) : cart.customerId ? (
          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-gold-soft text-xs font-semibold text-gold-deep">
                {initials(cart.customerName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{cart.customerName}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {selectedCustomer?.phone ?? ''}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="font-normal text-[11px]">
                  {isReturningClient(selectedCustomer)
                    ? BILLING.new.returningClient
                    : BILLING.new.newClient}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {BILLING.new.loyaltyBalance}:{' '}
                  <span className="tabular-nums">
                    {balanceById.get(cart.customerId) ?? 0}
                  </span>
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                onWalkIn()
                setCustomerSearch('')
              }}
            >
              {BILLING.new.changeCustomer}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{BILLING.new.searchCustomer}</Label>
              <Input
                className="min-touch h-11"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder={BILLING.new.searchCustomer}
              />
              {customerResults.length > 0 ? (
                <ul className="rounded-md border border-border bg-card">
                  {customerResults.map((c) => {
                    const name = [c.name, c.lastName].filter(Boolean).join(' ')
                    return (
                      <li key={c._id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => {
                            onSelectCustomer(c._id, name)
                            setCustomerSearch('')
                          }}
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {c.phone}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {balanceById.get(c._id) ?? 0} {DASHBOARD.points}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{BILLING.new.freeName}</Label>
                <Input
                  className="min-touch h-11"
                  value={cart.customerName === 'Walk-in' ? '' : cart.customerName}
                  onChange={(e) => onWalkInDetails({ name: e.target.value })}
                  placeholder={COMMON.labels.name}
                />
              </div>
              <div className="space-y-1">
                <Label>{BILLING.new.freePhone}</Label>
                <div className="flex gap-1">
                  <span className="flex h-11 items-center rounded-md border border-border px-2 text-sm text-muted-foreground">
                    {BILLING.new.phonePrefix}
                  </span>
                  <Input
                    className="min-touch h-11"
                    value={cart.walkInPhone}
                    onChange={(e) => onWalkInDetails({ phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="min-touch h-11"
              onClick={() => setAddOpen(true)}
            >
              {BILLING.new.addCustomer}
            </Button>
          </div>
        )}
      </CardContent>

      <CustomerFormSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(c) => {
          const name = [c.name, c.lastName].filter(Boolean).join(' ')
          onSelectCustomer(c._id, name)
        }}
      />
    </Card>
  )
}

function SelectedAppointmentSummary({
  name,
  phone,
  time,
  returning,
  onChange,
}: {
  name: string
  phone: string
  time?: string
  returning: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <Avatar className="size-10">
        <AvatarFallback className="bg-gold-soft text-xs font-semibold text-gold-deep">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {phone ? (
          <p className="text-xs text-muted-foreground tabular-nums">{phone}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="font-normal text-[11px]">
            {returning ? BILLING.new.returningClient : BILLING.new.newClient}
          </Badge>
          {time ? (
            <Badge variant="outline" className="font-normal text-[11px]">
              {BILLING.new.bookedAt.replace('{time}', time)}
            </Badge>
          ) : null}
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" className="h-8" onClick={onChange}>
        {BILLING.new.changeCustomer}
      </Button>
    </div>
  )
}

