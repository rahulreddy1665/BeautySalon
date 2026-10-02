import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

import { store } from '@/app/state/redux/store'
import { clearCredentials } from '@/app/state/redux/slices/authSlice'
import type { AppError } from '@/app/types/api'
import { env } from '@/app/utils/env'
import { createAppError } from '@/app/utils/errors'

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

class ApiClient {
  private readonly instance: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (token: string | null) => void
    reject: (error: unknown) => void
  }> = []

  constructor() {
    this.instance = axios.create({
      baseURL: env.apiBaseUrl,
      timeout: 30_000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.instance.interceptors.request.use((config) => {
      const token = store.getState().auth.token
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleResponseError(error),
    )
  }

  private processQueue(error: unknown, token: string | null = null) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error)
      } else {
        promise.resolve(token)
      }
    })
    this.failedQueue = []
  }

  /**
   * Reserved hook for a future refresh-token flow.
   * Currently always returns null → forces logout.
   */
  private async refreshAccessToken(): Promise<string | null> {
    // Backend has no /auth/refresh yet. Keep the shape ready.
    return null
  }

  private async handleUnauthorized(originalRequest: RetriableConfig): Promise<unknown> {
    if (originalRequest._retry) {
      store.dispatch(clearCredentials())
      return Promise.reject(
        createAppError('Session expired. Please sign in again.', {
          status: 401,
          isUnauthorized: true,
        }),
      )
    }

    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({
          resolve: (token) => {
            if (!token) {
              reject(
                createAppError('Session expired. Please sign in again.', {
                  status: 401,
                  isUnauthorized: true,
                }),
              )
              return
            }
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(this.instance(originalRequest))
          },
          reject,
        })
      })
    }

    originalRequest._retry = true
    this.isRefreshing = true

    try {
      const newToken = await this.refreshAccessToken()

      if (!newToken) {
        this.processQueue(
          createAppError('Session expired. Please sign in again.', {
            status: 401,
            isUnauthorized: true,
          }),
          null,
        )
        store.dispatch(clearCredentials())
        return Promise.reject(
          createAppError('Session expired. Please sign in again.', {
            status: 401,
            isUnauthorized: true,
          }),
        )
      }

      this.processQueue(null, newToken)
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return this.instance(originalRequest)
    } catch (refreshError) {
      this.processQueue(refreshError, null)
      store.dispatch(clearCredentials())
      return Promise.reject(this.normalizeError(refreshError))
    } finally {
      this.isRefreshing = false
    }
  }

  private normalizeError(error: unknown): AppError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const data = error.response?.data as
        { message?: string; errors?: unknown; success?: boolean } | undefined

      return createAppError(
        status === 403 && data?.message === 'Permission denied'
          ? 'Permission denied. Sign out and sign back in to refresh your access.'
          : data?.message || error.message || 'Request failed',
        {
          status,
          details: data?.errors ?? data,
          isUnauthorized: status === 401,
          code: error.code,
        },
      )
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const maybeAppError = error as AppError
      if (
        typeof maybeAppError.message === 'string' &&
        'isUnauthorized' in maybeAppError
      ) {
        return maybeAppError
      }
    }

    return createAppError('Unexpected error', {
      details: error,
      isUnauthorized: false,
    })
  }

  private async handleResponseError(error: AxiosError): Promise<never> {
    const status = error.response?.status
    const originalRequest = error.config as RetriableConfig | undefined

    if (status === 401 && originalRequest) {
      // Don't try to "refresh" the login call itself.
      const isLoginRequest = originalRequest.url?.includes('/auth/login')
      if (!isLoginRequest) {
        return this.handleUnauthorized(originalRequest) as Promise<never>
      }
    }

    return Promise.reject(this.normalizeError(error))
  }

  get<T>(url: string, config?: AxiosRequestConfig) {
    return this.instance.get<T>(url, config)
  }

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.instance.post<T>(url, data, config)
  }

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.instance.patch<T>(url, data, config)
  }

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return this.instance.put<T>(url, data, config)
  }

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.instance.delete<T>(url, config)
  }
}

export const apiClient = new ApiClient()
