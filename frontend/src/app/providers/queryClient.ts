import { QueryClient } from '@tanstack/react-query'

import type { AppError } from '@/app/types/api'

function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isUnauthorized' in error &&
    'message' in error
  )
}

function getStatus(error: unknown): number | undefined {
  if (isAppError(error)) return error.status
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === 'number' ? status : undefined
  }
  return undefined
}

/**
 * Shared QueryClient.
 * - staleTime: avoid refetch storms on navigation
 * - retry: skip client errors (4xx); retry transient failures lightly
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = getStatus(error)
        if (status !== undefined && status >= 400 && status < 500) {
          return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
