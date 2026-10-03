import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  servicesApi,
  type ServiceInput,
  type ServiceListParams,
} from '@/app/service/services/servicesApi'
import { toErrorMessage } from '@/app/utils'

export function useServicesQuery(params: ServiceListParams = {}) {
  return useQuery({
    queryKey: queryKeys.services.list(params as Record<string, unknown>),
    queryFn: () => servicesApi.list(params),
  })
}

/** Flat catalog for billing / appointment pickers. */
export function useServicesCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.services.list({ catalog: true }),
    queryFn: () => servicesApi.getAll(),
  })
}

export function useServiceCategoriesQuery() {
  return useQuery({
    queryKey: [...queryKeys.services.all, 'categories'] as const,
    queryFn: () => servicesApi.getCategories(),
  })
}

export function useServiceQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.services.detail(id ?? ''),
    queryFn: () => servicesApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateServiceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ServiceInput) => servicesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success('Service added')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not add service'))
    },
  })
}

export function useUpdateServiceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ServiceInput> }) =>
      servicesApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success('Service updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update service'))
    },
  })
}

export function useDeleteServiceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success('Service deleted')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not delete service'))
    },
  })
}

export function useImportServicesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => servicesApi.importFile(file),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success(
        `Import done · ${result.summary.created} created · ${result.summary.updated} updated · ${result.summary.error} errors`,
      )
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Import failed'))
    },
  })
}
