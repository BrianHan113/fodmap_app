import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/fodmap_app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg'],
      manifest: {
        name: 'FODMAP Helper',
        short_name: 'FODMAP',
        description: 'Low-FODMAP food guide, diary and reintroduction tracker',
        theme_color: '#2f855a',
        background_color: '#f7faf7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'] },
    }),
  ],
  // The bundled food, GL and nutrition tables make the main chunk ~160 kB gzipped; it's cached offline by the service worker.
  build: { chunkSizeWarningLimit: 800 },
  test: { environment: 'node' },
} as any);
