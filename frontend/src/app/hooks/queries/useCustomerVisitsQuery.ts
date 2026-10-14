import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { customersApi } from '@/app/service/customers/customersApi'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'

/** One page of invoices billed to this customer (newest first). */
export function useCustomerVisitsQuery(
  customerId: string | undefined,
  page: number,
  limit: number,
) {
  return useQuery({
    queryKey: queryKeys.invoices.list({ customerId: customerId ?? '', page, limit }),
    queryFn: () => invoicesApi.list({ customerId, page, limit }),
    enabled: Boolean(customerId),
    placeholderData: keepPreviousData,
  })
}

/** Visit count / lifetime spend / last visit across every invoice, computed on the server. */
export function useCustomerSummaryQuery(customerId: string | undefined) {
  return useQuery({
    // Under invoices.* so new bills (which invalidate invoices) refresh it.
    queryKey: [...queryKeys.invoices.all, 'customer-summary', customerId ?? ''] as const,
    queryFn: () => customersApi.getSummary(customerId!),
    enabled: Boolean(customerId),
  })
}
