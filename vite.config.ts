import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // Vite 8/Rolldown ile ardışık build'lerde eski hash'li chunk'ların kalıp
    // PWA precache listesine yeniden girmesini kesin olarak engelle.
    emptyOutDir: true,
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Travyon — Seyahat Planlayıcı',
        short_name: 'Travyon',
        description: 'Yapay zeka destekli kişiselleştirilmiş seyahat planlama',
        theme_color: '#f8981d',
        background_color: '#f5f0e8',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'tr',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // 5 MB limitine çıkar (Three.js gibi büyük kütüphaneler için)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Precache: tüm statik dosyalar
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
        // Büyük video dosyalarını precache'den çıkar
        globIgnores: ['**/videos/**'],
        runtimeCaching: [
          // Google Fonts — 1 yıl cache
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Unsplash & Pexels görseller — 30 gün cache
          {
            urlPattern: /^https:\/\/(images\.unsplash|videos\.pexels)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
