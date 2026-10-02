/** Shared API types matching backend envelopes. */

export interface ApiSuccessResponse<T> {
  success: true
  status?: number
  message?: string
  data: T
  errors?: unknown
}

export interface ApiErrorResponse {
  success: false
  status?: number
  message: string
  data?: unknown
  errors?: unknown
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/** Normalized client-side error used across the app. */
export interface AppError {
  message: string
  status?: number
  code?: string
  details?: unknown
  isUnauthorized: boolean
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResult {
  token: string
  user: AuthUser
}

/** Product roles (placeholder). Backend currently seeds `admin`. */
export type AppRole = 'owner' | 'manager' | 'staff' | 'admin'
