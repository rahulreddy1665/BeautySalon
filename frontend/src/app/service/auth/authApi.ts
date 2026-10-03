import { apiClient } from '@/app/service/apiClient'
import type {
  ApiSuccessResponse,
  AuthUser,
  LoginPayload,
  LoginResult,
} from '@/app/types/api'

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResult> => {
    const { data } = await apiClient.post<ApiSuccessResponse<LoginResult>>(
      '/auth/login',
      {
        identifier: payload.identifier,
        email: payload.identifier,
        password: payload.password,
      },
    )
    return data.data
  },

  changePassword: async (payload: {
    currentPassword: string
    newPassword: string
  }): Promise<LoginResult> => {
    const { data } = await apiClient.post<ApiSuccessResponse<LoginResult>>(
      '/auth/change-password',
      payload,
    )
    return data.data
  },

  changeEmail: async (payload: {
    email: string
    currentPassword: string
  }): Promise<{ email: string }> => {
    const { data } = await apiClient.post<
      ApiSuccessResponse<{ email: string }>
    >('/auth/change-email', payload)
    return data.data
  },
}

export type { AuthUser }
