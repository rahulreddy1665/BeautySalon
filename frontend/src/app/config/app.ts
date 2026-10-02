/** App-wide constants (not secrets). Salon name comes from settings API. */
export const APP_CONFIG = {
  persistKey: 'beauty-salon',
  fallbackSalonName: 'BeautySalon',
} as const

/** @deprecated Prefer settings.business.salonName via useSalonSettingsQuery */
export const SALON_NAME = APP_CONFIG.fallbackSalonName
