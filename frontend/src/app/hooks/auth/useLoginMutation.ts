import { useMutation } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import { AUTH, ROUTES } from '@/app/constants'
import { ERRORS } from '@/app/constants/errors'
import { authApi } from '@/app/service/auth/authApi'
import { setCredentials } from '@/app/state/redux/slices/authSlice'
import type { LoginPayload } from '@/app/types/api'
import { toErrorMessage } from '@/app/utils/errors'

export function useLoginMutation() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (result) => {
      dispatch(
        setCredentials({
          token: result.token,
          user: {
            ...result.user,
            mustChangePassword: Boolean(result.mustChangePassword),
          },
        }),
      )
      if (result.mustChangePassword) {
        navigate(ROUTES.setPassword, { replace: true })
      }
    },
  })
}

export function getLoginErrorMessage(error: unknown): string {
  if (!error) return AUTH.failed
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { code?: unknown; status?: unknown; message?: unknown }
    if (maybe.code === 'INVALID_CREDENTIALS' || maybe.status === 401) {
      return AUTH.invalidCredentials
    }
    if (maybe.code === 'RATE_LIMITED' || maybe.status === 429) {
      return AUTH.rateLimited
    }
    if (
      typeof maybe.message === 'string' &&
      /network|failed to fetch|timeout/i.test(maybe.message)
    ) {
      return AUTH.networkError
    }
  }
  if (error instanceof TypeError) return AUTH.networkError
  const mapped = toErrorMessage(error, AUTH.failed)
  if (mapped === ERRORS.unauthorized) return AUTH.invalidCredentials
  return mapped
}
