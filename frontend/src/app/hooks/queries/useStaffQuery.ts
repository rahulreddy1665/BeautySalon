import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  staffApi,
  type StaffInput,
  type StaffListParams,
} from '@/app/service/staff/staffApi'
import { toErrorMessage } from '@/app/utils'

export function useStaffListQuery(params: StaffListParams = {}) {
  return useQuery({
    queryKey: queryKeys.staff.list(params as Record<string, unknown>),
    queryFn: () => staffApi.list(params),
  })
}

export function useActiveStaffQuery() {
  return useQuery({
    queryKey: queryKeys.staff.list({ isActive: 'true', catalog: true }),
    queryFn: () => staffApi.getActive(),
  })
}

export function useStaffQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.detail(id ?? ''),
    queryFn: () => staffApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateStaffMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: StaffInput) => staffApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.all })
      toast.success('Staff member added')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not add staff'))
    },
  })
}

export function useUpdateStaffMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<StaffInput>
    }) => staffApi.update(id, payload),
    onSuccess: (staff) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.all })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.staff.detail(staff._id),
      })
      toast.success('Staff updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update staff'))
    },
  })
}

export function useDeleteStaffMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.all })
      toast.success('Staff removed')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not remove staff'))
    },
  })
}
