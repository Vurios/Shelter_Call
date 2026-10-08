import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  // Keep hashed Vite chunks separate from unhashed public art. Workbox must
  // revision art/fonts, and manifest icons must not get conflicting cache keys.
  build: { assetsDir: 'bundles' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SHELTER CALL',
        short_name: 'Shelter Call',
        description: 'A warm lunar outpost. A real Sun story.',
        theme_color: '#101d2a',
        background_color: '#101d2a',
        display: 'standalone',
        icons: [
          {
            src: 'assets/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'assets/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'assets/icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Assets and lazy chunks are available offline after the first cache completes.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,glb,ttf,png,txt}'],
      },
    }),
  ],
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.js'],
      exclude: ['src/core/mock-run.js'],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
