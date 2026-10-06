import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'

/** Invoices billed to this customer — the real visit/billing history. */
export function useCustomerVisitsQuery(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.list({ customerId: customerId ?? '', limit: 100 }),
    queryFn: () =>
      invoicesApi.list({
        customerId,
        limit: 100,
        page: 1,
      }),
    enabled: Boolean(customerId),
    select: (page) => page.items,
  })
}
