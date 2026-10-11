import { useEffect, useState } from 'react'

/** Default delay for search inputs: long enough to skip mid-word keystrokes, short enough to feel live. */
export const SEARCH_DEBOUNCE_MS = 250

/** Returns `value` once it has stopped changing for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
