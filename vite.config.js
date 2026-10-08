import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      // Prompt 1 caches the placeholder. Installable app assets arrive in prompt 4.
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'] },
    }),
  ],
  test: { include: ['tests/unit/**/*.test.js'], environment: 'node' },
});
