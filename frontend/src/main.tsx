import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'

import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouter } from '@/app/router/AppRouter'
import { initInstallPrompt } from '@/app/hooks/useInstallApp'
import '@/app/styles/global.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found')
}

// Capture the one-time install event before any screen renders.
initInstallPrompt()

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
)
