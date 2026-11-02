import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { BrowserRouter } from 'react-router-dom'

import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import { PwaUpdatePrompt } from '@/app/components/PwaUpdatePrompt'
import { DocumentTitle } from '@/app/components/DocumentTitle'
import { ServerStatusBanner } from '@/app/components/ServerStatusBanner'
import { Toaster } from '@/app/components/ui/sonner'
import { COMMON } from '@/app/constants'
import { queryClient } from '@/app/providers/queryClient'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { persistor, store } from '@/app/state/redux/store'

interface AppProvidersProps {
  children: ReactNode
}

function BootSplash() {
  return (
    <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
      {COMMON.labels.loading}
    </div>
  )
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={<BootSplash />} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider>
              <ErrorBoundary>
                <DocumentTitle />
                <ServerStatusBanner />
                {children}
                <Toaster richColors={false} position="top-center" />
                <PwaUpdatePrompt />
              </ErrorBoundary>
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  )
}
