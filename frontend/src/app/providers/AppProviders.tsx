import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { BrowserRouter } from 'react-router-dom'

import { PwaUpdatePrompt } from '@/app/components/PwaUpdatePrompt'
import { DocumentTitle } from '@/app/components/DocumentTitle'
import { Toaster } from '@/app/components/ui/sonner'
import { queryClient } from '@/app/providers/queryClient'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { persistor, store } from '@/app/state/redux/store'
import { env } from '@/app/utils/env'

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <DocumentTitle />
              {children}
              <Toaster richColors={false} position="top-center" />
              <PwaUpdatePrompt />
              {env.isDev ? <ReactQueryDevtools initialIsOpen={false} /> : null}
            </BrowserRouter>
          </QueryClientProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  )
}
