import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse } from '@/app/types/api'
import type { LoyaltySettings } from '@/app/service/settings/settingsApi'

export type LoyaltyMovementType = 'earn' | 'redeem' | 'adjust'

export type LoyaltyRules = LoyaltySettings

export interface LoyaltyBalance {
  customerId: string
  points: number
  updatedAt?: string
  customer?: {
    _id: string
    name?: string
    lastName?: string
    phone?: number
  }
}

export interface LoyaltyMovement {
  _id: string
  id?: string
  customer: string | { _id: string; name?: string; lastName?: string }
  type: LoyaltyMovementType
  points: number
  reason: string
  balanceAfter: number
  createdAt: string
}

export interface AdjustLoyaltyPayload {
  customerId: string
  type: LoyaltyMovementType
  points: number
  reason: string
}

export type UpdateLoyaltyRulesPayload = Partial<LoyaltyRules>

const MAX_IDS_IN_URL = 100

export const loyaltyApi = {
  getRules: async (): Promise<LoyaltyRules> => {
    const { data } =
      await apiClient.get<ApiSuccessResponse<LoyaltyRules>>('/loyalty/rules')
    return data.data
  },

  updateRules: async (payload: UpdateLoyaltyRulesPayload): Promise<LoyaltyRules> => {
    const { data } = await apiClient.patch<ApiSuccessResponse<LoyaltyRules>>(
      '/loyalty/rules',
      payload,
    )
    return data.data
  },

  listBalances: async (customerIds?: string[]): Promise<LoyaltyBalance[]> => {
    // IDs travel in the query string (24 chars each). Past ~100 the URL gets long
    // enough for proxies to reject it, so fetch all balances instead.
    const filterIds =
      customerIds?.length && customerIds.length <= MAX_IDS_IN_URL ? customerIds : undefined
    const { data } = await apiClient.get<ApiSuccessResponse<LoyaltyBalance[]>>(
      '/loyalty/balances',
      {
        params: filterIds ? { customerIds: filterIds.join(',') } : undefined,
      },
    )
    return data.data
  },

  getBalance: async (customerId: string): Promise<LoyaltyBalance> => {
    const { data } = await apiClient.get<ApiSuccessResponse<LoyaltyBalance>>(
      `/loyalty/balances/${customerId}`,
    )
    return data.data
  },

  listLedger: async (customerId?: string): Promise<LoyaltyMovement[]> => {
    const { data } = await apiClient.get<ApiSuccessResponse<LoyaltyMovement[]>>(
      '/loyalty/ledger',
      { params: customerId ? { customerId } : undefined },
    )
    return (data.data ?? []).map((row) => ({
      ...row,
      id: row._id,
    }))
  },

  adjust: async (payload: AdjustLoyaltyPayload) => {
    const { data } = await apiClient.post<ApiSuccessResponse<unknown>>(
      '/loyalty/adjust',
      payload,
    )
    return data.data
  },
}
