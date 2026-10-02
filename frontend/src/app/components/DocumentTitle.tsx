import { useEffect } from 'react'

import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { APP_CONFIG } from '@/app/config/app'

/** Keeps document.title in sync with salon name from settings. */
export function DocumentTitle() {
  const { data } = useSalonSettingsQuery()
  const name = data?.business?.salonName?.trim() || APP_CONFIG.fallbackSalonName

  useEffect(() => {
    document.title = name
  }, [name])

  return null
}
