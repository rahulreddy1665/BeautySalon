import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface SalonService {
  _id: string
  name: string
  category: string
  price: number
  durationMinutes: number
  createdAt?: string
  updatedAt?: string
}

export interface ServiceInput {
  name: string
  category: string
  price: number
  durationMinutes?: number
}

export interface PaginatedServices {
  items: SalonService[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ServiceListParams {
  search?: string
  category?: string
  page?: number
  limit?: number
}

export interface ServiceImportRowResult {
  row: number
  status: 'created' | 'updated' | 'skipped' | 'error'
  reason?: string
  name?: string
  category?: string
}

export interface ServiceImportResult {
  results: ServiceImportRowResult[]
  summary: {
    created: number
    updated: number
    skipped: number
    error: number
  }
}

export const servicesApi = {
  list: async (params: ServiceListParams = {}): Promise<PaginatedServices> => {
    const { data } = await apiClient.get<ApiSuccessResponse<PaginatedServices>>(
      '/service',
      { params },
    )
    return data.data
  },

  /** Convenience for billing/appointments — first page large enough for catalogs. */
  getAll: async (): Promise<SalonService[]> => {
    const page = await servicesApi.list({ page: 1, limit: 100 })
    return page.items
  },

  getCategories: async (): Promise<string[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<string[]>>(
      '/service/categories',
    )
    return data.data ?? []
  },

  getById: async (id: string): Promise<SalonService> => {
    const { data } = await apiClient.get<ApiSuccessResponse<SalonService>>(
      `/service/${id}`,
    )
    return data.data
  },

  create: async (payload: ServiceInput): Promise<SalonService> => {
    const { data } = await apiClient.post<ApiSuccessResponse<SalonService>>(
      '/service',
      payload,
    )
    return data.data
  },

  update: async (id: string, payload: Partial<ServiceInput>): Promise<SalonService> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<SalonService>>(
      `/service/${id}`,
      payload,
    )
    return data.data
  },

  remove: async (id: string): Promise<SalonService> => {
    const { data } = await apiClient.delete<ApiSuccessResponse<SalonService>>(
      `/service/${id}`,
    )
    return data.data
  },

  importFile: async (file: File): Promise<ServiceImportResult> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await apiClient.post<ApiSuccessResponse<ServiceImportResult>>(
      '/service/import',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data.data
  },
}
