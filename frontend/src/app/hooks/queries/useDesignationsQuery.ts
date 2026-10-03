import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { SETTINGS } from '@/app/constants'
import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  designationsApi,
  type DesignationInput,
} from '@/app/service/designations/designationsApi'
import { toErrorMessage } from '@/app/utils'

export function useDesignationsQuery() {
  return useQuery({
    queryKey: queryKeys.designations.list(),
    queryFn: () => designationsApi.list(),
  })
}

export function useCreateDesignationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DesignationInput) => designationsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.designations.all,
      })
      toast.success(SETTINGS.toasts.designationCreated)
    },
    onError: (e) => toast.error(toErrorMessage(e)),
  })
}

export function useUpdateDesignationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DesignationInput }) =>
      designationsApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.designations.all,
      })
      toast.success(SETTINGS.toasts.designationUpdated)
    },
    onError: (e) => toast.error(toErrorMessage(e)),
  })
}
