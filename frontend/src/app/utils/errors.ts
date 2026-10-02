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
  fallback = 'Something went wrong',
): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}
