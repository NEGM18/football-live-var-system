import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Camera access requires a secure context. In dev, serve over HTTPS with a
  // self-signed cert (via basicSsl below) so the app can be opened directly
  // from a phone on the same WiFi network (accept the browser's certificate
  // warning once).
  server: {
    host: true,
  },
  plugins: [
    react(),
    ...(command === 'serve' ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Live VAR Assistant',
        short_name: 'Live VAR',
        description:
          "On-device live VAR assistant for football: real-time player detection and an approximate offside-line overlay, running entirely in your phone's browser.",
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the TF.js / coco-ssd model weights fetched from the TF Hub CDN so the
        // detector still works offline after the first successful load.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/tfjs-models\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tfjs-model-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}))
