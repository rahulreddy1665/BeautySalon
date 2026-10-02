import { apiClient } from '@/app/service/apiClient'
import type { ApiSuccessResponse, LoginPayload, LoginResult } from '@/app/types/api'

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResult> => {
    const { data } = await apiClient.post<ApiSuccessResponse<LoginResult>>(
      '/auth/login',
      payload,
    )
    return data.data
  },
}
