import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'

export interface ComboServiceRef {
  service: {
    _id: string
    name: string
    price: number
    category?: string
    categoryId?: string | null
  }
  qty: number
}

export interface SalonCombo {
  _id: string
  name: string
  isActive: boolean
  isDeleted?: boolean
  services: ComboServiceRef[]
  comboPrice: number
  listTotal: number
  saving: number
}

export interface ComboInput {
  name: string
  services: Array<{ serviceId: string; qty?: number }>
  comboPrice: number
  isActive?: boolean
  confirmPriceAboveList?: boolean
}

export const combosApi = {
  list: async (activeOnly = false): Promise<SalonCombo[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<SalonCombo[]>>(
      '/combo',
      { params: activeOnly ? { activeOnly: true } : undefined },
    )
    return data.data ?? []
  },

  getById: async (id: string): Promise<SalonCombo> => {
    const { data } = await apiClient.get<ApiSuccessResponse<SalonCombo>>(
      `/combo/${id}`,
    )
    return data.data
  },

  create: async (payload: ComboInput): Promise<SalonCombo> => {
    const { data } = await apiClient.post<ApiSuccessResponse<SalonCombo>>(
      '/combo',
      payload,
    )
    return data.data
  },

  update: async (
    id: string,
    payload: Partial<ComboInput>,
  ): Promise<SalonCombo> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<SalonCombo>>(
      `/combo/${id}`,
      payload,
    )
    return data.data
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/combo/${id}`)
  },
}
