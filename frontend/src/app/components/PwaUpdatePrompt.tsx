import { useRegisterSW } from 'virtual:pwa-register/react'

import { Button } from '@/app/components/ui/button'
import { useState } from 'react'

/**
 * Shows when a new service worker is waiting.
 * registerType: 'prompt' — user must refresh to get the new app shell.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Keep a push-handler extension point for later.
      void registration
    },
  })

  const [dismissed, setDismissed] = useState(false)
  const visible = needRefresh && !dismissed

  if (!visible) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)] z-50 mx-auto max-w-md rounded-md border border-border bg-card p-3 shadow-md lg:bottom-4">
      <p className="text-sm font-medium">New version available</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Refresh to load the latest app shell. Your session stays signed in.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          className="min-touch"
          onClick={() => void updateServiceWorker(true)}
        >
          Refresh
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-touch"
          onClick={() => {
            setDismissed(true)
            setNeedRefresh(false)
          }}
        >
          Later
        </Button>
      </div>
    </div>
  )
}
