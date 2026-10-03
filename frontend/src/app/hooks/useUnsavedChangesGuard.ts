import { useEffect } from 'react'

import { SETTINGS } from '@/app/constants'

/** Warn on tab close / refresh when the form is dirty. */
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = SETTINGS.leaveUnsaved
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
}

export function confirmLeaveIfDirty(dirty: boolean): boolean {
  if (!dirty) return true
  return window.confirm(SETTINGS.leaveUnsaved)
}
