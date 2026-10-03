import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { invoicesApi, type CreateInvoiceInput } from '@/app/service/invoices/invoicesApi'
import { toErrorMessage } from '@/app/utils'

export function useInvoicesQuery(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params),
    queryFn: () => invoicesApi.list(params),
  })
}

export function useInvoiceQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id ?? ''),
    queryFn: () => invoicesApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateInvoiceInput) => invoicesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      toast.success('Invoice collected')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not create invoice'))
    },
  })
}
