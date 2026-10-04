import { QueryClientProvider } from '@tanstack/react-query'
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

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider>
              <DocumentTitle />
              {children}
              <Toaster richColors={false} position="top-center" />
              <PwaUpdatePrompt />
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  )
}
