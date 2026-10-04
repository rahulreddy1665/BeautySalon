import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { BILLING } from '@/app/constants'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { billingApi, type CreateBillPayload } from '@/app/service/billing/billingApi'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'
import { toErrorMessage } from '@/app/utils'

export function useBillsQuery(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: queryKeys.billing.list(params),
    queryFn: () => billingApi.list(params),
  })
}

export function useBillQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.billing.detail(id ?? ''),
    queryFn: () => billingApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useBillingProductsQuery() {
  return useQuery({
    queryKey: queryKeys.billing.products(),
    queryFn: () => billingApi.products(),
  })
}

export function usePopularBillingItemsQuery(limit = 12) {
  return useQuery({
    queryKey: queryKeys.billing.popular(limit),
    queryFn: () => invoicesApi.popular(limit),
  })
}

export function useCreateBillMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateBillPayload) => billingApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      toast.success(BILLING.toasts.created)
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, BILLING.toasts.createFailed))
    },
  })
}
