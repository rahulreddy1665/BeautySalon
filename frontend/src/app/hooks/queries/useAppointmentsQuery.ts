import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  appointmentsApi,
  type AppointmentListParams,
  type AppointmentStatus,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from '@/app/service/appointments/appointmentsApi'
import { toErrorMessage } from '@/app/utils'

export function useAppointmentsQuery(params: AppointmentListParams) {
  return useQuery({
    queryKey: queryKeys.appointments.list({
      from: params.from ?? '',
      to: params.to ?? '',
      date: params.date ?? '',
      staffId: params.staffId ?? '',
      status: params.status ?? '',
      page: params.page ?? 1,
      limit: params.limit ?? 50,
    }),
    queryFn: () => appointmentsApi.list(params),
    placeholderData: keepPreviousData,
  })
}

/** All appointments in a date window (never truncated). */
export function useAppointmentsWindowQuery(
  params: Omit<AppointmentListParams, 'page' | 'limit'>,
) {
  return useQuery({
    queryKey: queryKeys.appointments.list({
      from: params.from ?? '',
      to: params.to ?? '',
      date: params.date ?? '',
      staffId: params.staffId ?? '',
      status: params.status ?? '',
      window: true,
    }),
    queryFn: () => appointmentsApi.listWindow(params),
    placeholderData: keepPreviousData,
  })
}

/** First booked appointment for a staff member on or after `fromDate` (for "next: …" hints). */
export function useNextStaffAppointmentQuery(
  staffId: string | undefined,
  fromDate: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.appointments.list({ next: true, staffId: staffId ?? '', fromDate }),
    queryFn: () =>
      appointmentsApi.list({ staffId, from: fromDate, status: 'booked', page: 1, limit: 1 }),
    enabled: enabled && Boolean(staffId),
    select: (page) => page.items[0] ?? null,
  })
}

export function useAppointmentQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id ?? ''),
    queryFn: () => appointmentsApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateAppointmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAppointmentInput) => appointmentsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not book appointment'))
    },
  })
}

export function useUpdateAppointmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAppointmentInput }) =>
      appointmentsApi.update(id, payload),
    onSuccess: (appt) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appt._id),
      })
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update appointment'))
    },
  })
}

export function useChangeAppointmentStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.changeStatus(id, status),
    onSuccess: (appt) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appt._id),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      toast.success('Status updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update status'))
    },
  })
}

export function useCancelAppointmentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not cancel'))
    },
  })
}
