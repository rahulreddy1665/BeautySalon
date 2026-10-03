import {
  ERROR_CODE_MESSAGES,
  ERROR_STATUS_MESSAGES,
  ERRORS,
} from '@/app/constants/errors'
import type { AppError } from '@/app/types/api'

export function createAppError(
  message: string,
  options: Partial<Omit<AppError, 'message'>> = {},
): AppError {
  return {
    message,
    status: options.status,
    code: options.code,
    details: options.details,
    isUnauthorized: options.isUnauthorized ?? options.status === 401,
  }
}

export function toErrorMessage(
  error: unknown,
  fallback: string = ERRORS.unexpected,
): string {
  if (!error) return fallback
  if (typeof error === 'string') return error

  if (typeof error === 'object' && error !== null) {
    const maybe = error as {
      code?: unknown
      status?: unknown
      message?: unknown
    }
    if (typeof maybe.code === 'string' && ERROR_CODE_MESSAGES[maybe.code]) {
      return ERROR_CODE_MESSAGES[maybe.code] ?? fallback
    }
    if (typeof maybe.status === 'number' && ERROR_STATUS_MESSAGES[maybe.status]) {
      // Prefer explicit server message when present and non-generic
      if (typeof maybe.message === 'string' && maybe.message.trim()) {
        return maybe.message
      }
      return ERROR_STATUS_MESSAGES[maybe.status] ?? fallback
    }
    if (typeof maybe.message === 'string' && maybe.message.trim()) {
      return maybe.message
    }
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}
