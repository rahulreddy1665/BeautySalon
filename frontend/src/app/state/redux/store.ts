import { configureStore } from '@reduxjs/toolkit'
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist'

import { persistStorage } from '@/app/state/redux/persistStorage'
import { rootReducer } from '@/app/state/redux/rootReducer'

const persistConfig = {
  key: 'beauty-salon',
  storage: persistStorage,
  /** Persist only client session + preferences — never server caches. */
  whitelist: ['auth', 'settings'],
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
})

export const persistor = persistStore(store)

export type AppStore = typeof store
export type AppDispatch = typeof store.dispatch
export type { RootState } from '@/app/state/redux/rootReducer'
