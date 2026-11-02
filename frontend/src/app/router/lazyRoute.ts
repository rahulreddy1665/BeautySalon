import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'chunk-reload-attempted'

/**
 * `React.lazy` for named exports, with a one-time reload when a chunk fails to load.
 *
 * Why the reload: after a deploy, chunk filenames change (content hashes). A tab
 * opened before the deploy still references the old files, which now 404. One
 * full reload picks up the new index.html and chunk names. The session flag
 * prevents a reload loop if the failure is real (e.g. offline).
 */
export function lazyRoute<TModule, TKey extends keyof TModule>(
  load: () => Promise<TModule>,
  exportName: TKey,
) {
  return lazy(async () => {
    try {
      const module = await load()
      try {
        sessionStorage.removeItem(RELOAD_FLAG)
      } catch {
        // storage unavailable — nothing to clear
      }
      return { default: module[exportName] as ComponentType }
    } catch (error) {
      let alreadyReloaded = true
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === '1'
        if (!alreadyReloaded) sessionStorage.setItem(RELOAD_FLAG, '1')
      } catch {
        // storage unavailable — don't risk a reload loop
      }
      if (!alreadyReloaded) {
        window.location.reload()
        // Keep Suspense showing its fallback while the page reloads.
        return new Promise<never>(() => {})
      }
      throw error
    }
  })
}
