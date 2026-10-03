import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { customersApi, type CustomerInput } from '@/app/service/customers/customersApi'
import { toErrorMessage } from '@/app/utils'

export function useCustomersQuery() {
  return useQuery({
    queryKey: queryKeys.customers.list(),
    queryFn: () => customersApi.getAll(),
  })
}

export function useCustomerQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id ?? ''),
    queryFn: () => customersApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CustomerInput) => customersApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success('Customer added')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not add customer'))
    },
  })
}

export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CustomerInput> }) =>
      customersApi.update(id, payload),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(customer._id),
      })
      toast.success('Customer updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update customer'))
    },
  })
}

export function useDeleteCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success('Customer removed')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not remove customer'))
    },
  })
}
