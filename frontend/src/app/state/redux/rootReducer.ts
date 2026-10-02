import { combineReducers } from '@reduxjs/toolkit'

import authReducer from '@/app/state/redux/slices/authSlice'
import billingCartReducer from '@/app/state/redux/slices/billingCartSlice'
import settingsReducer from '@/app/state/redux/slices/settingsSlice'

/**
 * Root reducer.
 * Server/API caches stay in TanStack Query.
 * `billingCart` is ephemeral POS client state (not persisted).
 */
export const rootReducer = combineReducers({
  auth: authReducer,
  settings: settingsReducer,
  billingCart: billingCartReducer,
})

export type RootState = ReturnType<typeof rootReducer>
