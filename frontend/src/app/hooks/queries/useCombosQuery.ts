import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { SERVICES } from '@/app/constants'
import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { combosApi, type ComboInput } from '@/app/service/combos/combosApi'
import { toErrorMessage } from '@/app/utils'

export function useCombosQuery(activeOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.services.all, 'combos', { activeOnly }] as const,
    queryFn: () => combosApi.list(activeOnly),
  })
}

export function useCreateComboMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ComboInput) => combosApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success(SERVICES.combos.toasts.created)
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, SERVICES.combos.toasts.createFailed))
    },
  })
}

export function useUpdateComboMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<ComboInput>
    }) => combosApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success(SERVICES.combos.toasts.updated)
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, SERVICES.combos.toasts.updateFailed))
    },
  })
}

export function useDeleteComboMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => combosApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success(SERVICES.combos.toasts.deleted)
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, SERVICES.combos.toasts.deleteFailed))
    },
  })
}
