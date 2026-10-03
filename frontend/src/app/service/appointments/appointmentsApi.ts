import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export type AppointmentStatus = 'booked' | 'completed' | 'cancelled' | 'no_show'

export interface AppointmentServiceLine {
  service:
    string | { _id: string; name?: string; price?: number; durationMinutes?: number }
  name: string
  durationMinutes: number
  staff: string | { _id: string; name?: string; isActive?: boolean }
}

export interface Appointment {
  _id: string
  customer?:
    string | { _id: string; name?: string; lastName?: string; phone?: number } | null
  guestName?: string
  guestPhone?: string
  services: AppointmentServiceLine[]
  date: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes?: string
  invoice?: string | { _id: string } | null
  createdAt?: string
  updatedAt?: string
}

export interface AppointmentServiceInput {
  serviceId: string
  staffId: string
}

export interface CreateAppointmentInput {
  customerId?: string | null
  guestName?: string
  guestPhone?: string
  services: AppointmentServiceInput[]
  date: string
  startTime: string
  notes?: string
}

export type UpdateAppointmentInput = Partial<CreateAppointmentInput>

export interface PaginatedAppointments {
  items: Appointment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AppointmentListParams {
  date?: string
  from?: string
  to?: string
  staffId?: string
  status?: AppointmentStatus | string
  page?: number
  limit?: number
}

export function appointmentCustomerLabel(appt: Appointment): string {
  if (appt.customer && typeof appt.customer === 'object') {
    return [appt.customer.name, appt.customer.lastName].filter(Boolean).join(' ')
  }
  return appt.guestName || 'Guest'
}

export function appointmentStaffId(line: AppointmentServiceLine): string {
  return typeof line.staff === 'string' ? line.staff : line.staff._id
}

export function appointmentStaffName(line: AppointmentServiceLine): string {
  return typeof line.staff === 'string' ? line.staff : line.staff.name || 'Staff'
}

export function appointmentServiceId(line: AppointmentServiceLine): string {
  return typeof line.service === 'string' ? line.service : line.service._id
}

export const appointmentsApi = {
  list: async (params: AppointmentListParams = {}): Promise<PaginatedAppointments> => {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedAppointments>>(
      '/appointment',
      { params },
    )
    return data.data
  },

  getById: async (id: string): Promise<Appointment> => {
    const { data } = await apiClient.get<ApiSuccessResponse<Appointment>>(
      `/appointment/${id}`,
    )
    return data.data
  },

  create: async (payload: CreateAppointmentInput): Promise<Appointment> => {
    const { data } = await apiClient.post<ApiSuccessResponse<Appointment>>(
      '/appointment',
      payload,
    )
    return data.data
  },

  update: async (id: string, payload: UpdateAppointmentInput): Promise<Appointment> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<Appointment>>(
      `/appointment/${id}`,
      payload,
    )
    return data.data
  },

  changeStatus: async (id: string, status: AppointmentStatus): Promise<Appointment> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<Appointment>>(
      `/appointment/${id}/status`,
      { status },
    )
    return data.data
  },

  cancel: async (id: string): Promise<Appointment> => {
    const { data } = await apiClient.post<ApiSuccessResponse<Appointment>>(
      `/appointment/${id}/cancel`,
    )
    return data.data
  },
}
