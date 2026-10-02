import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { AuthUser } from '@/app/types/api'

export interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
}

interface SetCredentialsPayload {
  token: string
  user: AuthUser
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<SetCredentialsPayload>) => {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true
    },
    clearCredentials: (state) => {
      state.token = null
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setCredentials, clearCredentials } = authSlice.actions
export default authSlice.reducer
