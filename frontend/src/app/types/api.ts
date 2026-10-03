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
  email?: string | null
  username?: string | null
  role: string
  permissions: string[]
  mustChangePassword?: boolean
  staffId?: string | null
  canViewRevenue?: boolean
  canExport?: boolean
  maxDiscountPercent?: number
}

export interface LoginPayload {
  identifier: string
  password: string
}

export interface LoginResult {
  token: string
  mustChangePassword?: boolean
  user: AuthUser
}

export type AppRole = 'owner' | 'manager' | 'staff' | 'admin'
