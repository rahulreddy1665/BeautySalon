import type { WebStorage } from 'redux-persist'

/**
 * Custom localStorage adapter.
 * redux-persist's default CJS export does not interop cleanly with Vite ESM
 */
function createLocalStorage(): WebStorage {
  return {
    getItem: (key) => {
      return Promise.resolve(window.localStorage.getItem(key))
    },
    setItem: (key, value) => {
      window.localStorage.setItem(key, value)
      return Promise.resolve()
    },
    removeItem: (key) => {
      window.localStorage.removeItem(key)
      return Promise.resolve()
    },
  }
}

export const persistStorage = createLocalStorage()
