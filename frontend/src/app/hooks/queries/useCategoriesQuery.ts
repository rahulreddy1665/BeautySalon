import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { SERVICES } from '@/app/constants'
import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  categoriesApi,
  type CategoryInput,
} from '@/app/service/categories/categoriesApi'
import { toErrorMessage } from '@/app/utils'

export function useCategoriesQuery(activeOnly = false) {
  return useQuery({
    queryKey: [...queryKeys.services.all, 'category-master', { activeOnly }] as const,
    queryFn: () => categoriesApi.list(activeOnly),
  })
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CategoryInput) => categoriesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success(SERVICES.categories.toasts.created)
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, SERVICES.categories.toasts.createFailed))
    },
  })
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<CategoryInput>
    }) => categoriesApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
      toast.success(SERVICES.categories.toasts.updated)
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, SERVICES.categories.toasts.updateFailed))
    },
  })
}
