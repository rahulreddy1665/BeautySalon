import { ArrowLeft, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { useCustomerBookingsQuery } from '@/app/hooks/queries/useCustomerBookingsQuery'
import { useCustomerQuery } from '@/app/hooks/queries/useCustomersQuery'
import type { Booking } from '@/app/service/bookings/bookingsApi'
import { getCustomerExtrasMock } from '@/app/service/mocks/customerExtrasMock'
import { CustomerFormSheet } from '@/app/screens/customers/CustomerFormSheet'

type VisitRow = {
  id: string
  date: string
  service: string
  invoice: string
}

const visitColumns: ColumnDef<VisitRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'service', header: 'Service' },
  { accessorKey: 'invoice', header: 'Invoice' },
]

function toVisitRows(bookings: Booking[]): VisitRow[] {
  return bookings.map((booking) => ({
    id: booking._id,
    date: booking.date,
    service: booking.service || '—',
    invoice: booking.invoice || '—',
  }))
}

export function CustomerDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const customerQuery = useCustomerQuery(id)
  const bookingsQuery = useCustomerBookingsQuery(id)
  const [editOpen, setEditOpen] = useState(false)

  const extras = useMemo(
    () => (id ? getCustomerExtrasMock(id) : { loyaltyPoints: 0, lifetimeSpend: 0 }),
    [id],
  )

  const visits = useMemo(
    () => toVisitRows(bookingsQuery.data ?? []),
    [bookingsQuery.data],
  )

  if (customerQuery.isLoading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton variant="stats" />
        <LoadingSkeleton rows={4} />
      </div>
    )
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <ErrorState
        error={customerQuery.error}
        title="Customer not found"
        onRetry={() => void customerQuery.refetch()}
      />
    )
  }

  const customer = customerQuery.data
  const fullName = [customer.name, customer.lastName].filter(Boolean).join(' ')

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-2">
        <Button asChild type="button" size="sm" variant="outline" className="h-8">
          <Link to="/customers">
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            Back
          </Link>
        </Button>
      </div>

      <PageHeader
        description={`${fullName} · ${customer.phone}`}
        actions={
          <Button
            type="button"
            size="sm"
            className="min-touch h-9"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" strokeWidth={1.75} />
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <StatCard label="Visits" value={visits.length} />
        <StatCard label="Loyalty points" value={extras.loyaltyPoints} />
        <StatCard label="Lifetime spend" value={extras.lifetimeSpend} format="inr" />
        <Card className="gap-0 rounded-md py-0 shadow-none">
          <CardContent className="px-3 py-3 sm:px-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="mt-1 text-sm font-semibold">
              {customer.isActive === false ? 'Inactive' : 'Active'}
            </p>
          </CardContent>
        </Card>
      </div>

      {import.meta.env.DEV ? (
        <Badge variant="outline" className="rounded-md font-normal text-[11px]">
          Loyalty points from MOCK ledger · spend MOCK · visits from /api/booking
        </Badge>
      ) : null}

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p>{customer.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="tabular-nums">{customer.phone}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Address</p>
            <p>
              {[customer.address, customer.address1, customer.pincode]
                .filter(Boolean)
                .join(', ') || '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>Visit history</CardTitle>
        </CardHeader>
        <CardContent>
          {bookingsQuery.isLoading ? <LoadingSkeleton rows={3} /> : null}
          {bookingsQuery.isError ? (
            <ErrorState
              error={bookingsQuery.error}
              title="Could not load visits"
              onRetry={() => void bookingsQuery.refetch()}
            />
          ) : null}
          {!bookingsQuery.isLoading && !bookingsQuery.isError ? (
            <ResponsiveTable
              data={visits}
              columns={visitColumns}
              mobileTitleKey="date"
              emptyTitle="No visits yet"
              emptyDescription="Bookings for this customer will show here."
            />
          ) : null}
        </CardContent>
      </Card>

      <CustomerFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
      />
    </div>
  )
}
