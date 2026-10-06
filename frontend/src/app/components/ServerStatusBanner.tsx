import { useEffect, useState } from 'react'

import { COMMON } from '@/app/constants'
import { subscribeServerStatus } from '@/app/service/apiClient'

export function ServerStatusBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => subscribeServerStatus(setOffline), [])

  if (!offline) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[60] bg-destructive px-3 py-2 text-center text-xs text-destructive-foreground">
      {COMMON.errors.serverUnreachable}
    </div>
  )
}
