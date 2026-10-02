import { useMutation } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { authApi } from '@/app/service/auth/authApi'
import { setCredentials } from '@/app/state/redux/slices/authSlice'
import type { LoginPayload } from '@/app/types/api'
import { toErrorMessage } from '@/app/utils/errors'

export function useLoginMutation() {
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (result) => {
      dispatch(
        setCredentials({
          token: result.token,
          user: result.user,
        }),
      )
    },
  })
}

export function getLoginErrorMessage(error: unknown): string {
  return toErrorMessage(error, 'Login failed')
}
