import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { bookingsApi, type Booking } from '@/app/service/bookings/bookingsApi'

function bookingCustomerId(booking: Booking): string {
  if (typeof booking.customer === 'string') return booking.customer
  return booking.customer?._id ?? ''
}

/** Client-side filter: backend has no customer-scoped bookings endpoint. */
export function useCustomerBookingsQuery(customerId: string | undefined) {
  const query = useQuery({
    queryKey: [...queryKeys.bookings.all, 'by-customer', customerId ?? ''],
    queryFn: () => bookingsApi.getAll(),
    enabled: Boolean(customerId),
    select: (bookings) =>
      bookings.filter((booking) => bookingCustomerId(booking) === customerId),
  })

  return query
}
