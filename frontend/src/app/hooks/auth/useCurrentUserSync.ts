import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import { authApi } from '@/app/service/auth/authApi'
import { setUser } from '@/app/state/redux/slices/authSlice'

/**
 * Keeps the signed-in user's role and permissions current. Login only gives a
 * snapshot; if an admin edits the role, the menu and route guards follow on the
 * next app load or when the tab regains focus, without logging out.
 */
export function useCurrentUserSync() {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (query.data) dispatch(setUser(query.data))
  }, [query.data, dispatch])
}
