import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'BeautySalon',
        short_name: 'BeautySalon',
        description: 'Salon management — billing, appointments, and reports',
        theme_color: '#FFFFFF',
        background_color: '#F6F6F7',
        display: 'standalone',
        // Stable identity so the installed app survives start_url changes.
        id: '/',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity'],
        // Desktop: reopening the app focuses the open window instead of a second copy.
        launch_handler: { client_mode: 'focus-existing' },
        // Right-click the taskbar / Dock icon (desktop) or long-press (Android).
        shortcuts: [
          {
            name: 'New bill',
            short_name: 'New bill',
            url: '/billing/new',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'New appointment',
            short_name: 'Appointment',
            url: '/appointments/new',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Billing history',
            short_name: 'Bills',
            url: '/billing',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App-shell caching only — never cache API responses.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/assets\//],
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        runtimeCaching: [],
        // Structure reserved for a future push handler (not implemented).
        // importScripts: ['sw-push.js'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
