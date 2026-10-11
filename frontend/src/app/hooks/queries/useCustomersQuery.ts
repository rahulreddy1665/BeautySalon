import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  customersApi,
  type CustomerInput,
  type CustomerListParams,
} from '@/app/service/customers/customersApi'
import { toErrorMessage } from '@/app/utils'

/** Full customer list. Prefer `useCustomersPageQuery` for anything that grows. */
export function useCustomersQuery() {
  return useQuery({
    queryKey: queryKeys.customers.list({ all: true }),
    queryFn: () => customersApi.getAll(),
  })
}

/** Server-paginated / searched customers. Keeps the previous page visible while the next loads. */
export function useCustomersPageQuery(
  params: CustomerListParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.customers.list(params as Record<string, unknown>),
    queryFn: () => customersApi.list(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
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

export function useImportCustomersMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => customersApi.importFile(file),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success(
        `Import done · ${result.summary.created} created · ${result.summary.updated} updated · ${result.summary.error} errors`,
      )
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Import failed'))
    },
  })
}
