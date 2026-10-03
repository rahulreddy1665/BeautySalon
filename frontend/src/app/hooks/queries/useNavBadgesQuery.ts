import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'

import { useHasPermission } from '@/app/hooks/useHasPermission'
import { appointmentsApi } from '@/app/service/appointments/appointmentsApi'
import { customersApi } from '@/app/service/customers/customersApi'
import { servicesApi } from '@/app/service/services/servicesApi'

export function useNavBadgesQuery() {
  const canAppointments = useHasPermission('appointment:read')
  const canCustomers = useHasPermission('customer:read')
  const canServices = useHasPermission('service:read')
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['nav-badges', today, canAppointments, canCustomers, canServices],
    queryFn: async () => {
      const [appts, customers, services] = await Promise.all([
        canAppointments
          ? appointmentsApi.list({ date: today, page: 1, limit: 1 })
          : Promise.resolve(null),
        canCustomers ? customersApi.getAll() : Promise.resolve(null),
        canServices ? servicesApi.list({ page: 1, limit: 1 }) : Promise.resolve(null),
      ])
      return {
        appointmentsToday: appts?.total ?? null,
        customersTotal: customers?.length ?? null,
        servicesTotal: services?.total ?? null,
      }
    },
    staleTime: 60_000,
  })
}
