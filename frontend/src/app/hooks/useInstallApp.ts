import { useSyncExternalStore } from 'react'

/** Chrome / Edge (desktop + Android) install event. Not in the TS DOM lib yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState = {
  /** Browser offered a native install prompt (Chrome / Edge). */
  canPrompt: boolean
  /** Already running as an installed app. */
  installed: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
let state: InstallState = { canPrompt: false, installed: false }
const listeners = new Set<() => void>()

function setState(next: Partial<InstallState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari home-screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * Call once at startup. The browser fires `beforeinstallprompt` once, early
 * (often on the login screen), so it must be captured before any menu mounts.
 */
export function initInstallPrompt() {
  if (typeof window === 'undefined') return
  state = { canPrompt: false, installed: isStandalone() }
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's mini-infobar from showing; we offer our own button.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    setState({ canPrompt: true })
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    setState({ canPrompt: false, installed: true })
  })
  window
    .matchMedia('(display-mode: standalone)')
    .addEventListener('change', (e) => setState({ installed: e.matches }))
}

export type InstallBrowser = 'edge' | 'chrome' | 'safari-mac' | 'safari-ios' | 'firefox' | 'other'

function detectBrowser(): InstallBrowser {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'edge'
  if (/Firefox\//.test(ua)) return 'firefox'
  if (/Chrome\/|Chromium\//.test(ua)) return 'chrome'
  if (/iPhone|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'safari-ios'
  }
  if (/Macintosh/.test(ua) && /Safari\//.test(ua)) return 'safari-mac'
  return 'other'
}

export function useInstallApp() {
  const snapshot = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
    () => state,
  )

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable'
    const event = deferred
    await event.prompt()
    const { outcome } = await event.userChoice
    // A prompt event can be used only once.
    deferred = null
    setState({ canPrompt: false })
    return outcome
  }

  return {
    installed: snapshot.installed,
    /** Browser's own install dialog is ready (Chrome / Edge, once eligible). */
    canPrompt: snapshot.canPrompt,
    /**
     * Always offer install unless already installed. When the native prompt
     * isn't available (Safari, or Chrome before it deems the site eligible),
     * the UI shows browser-specific steps instead.
     */
    available: !snapshot.installed,
    browser: detectBrowser(),
    install,
  }
}
