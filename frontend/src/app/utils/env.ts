/**
 * Typed access to Vite env vars.
 * Always read env through this module — never scatter `import.meta.env` calls.
 */
function requireEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key]
  if (!value) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

export const env = {
  apiBaseUrl: requireEnv('VITE_API_BASE_URL'),
  isDev: import.meta.env.DEV,
} as const
