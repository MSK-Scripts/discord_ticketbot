import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    // Built into web/dist, which IS committed: the dashboard server serves it as
    // static files, so a self-hoster never has to run npm/vite on their server.
    outDir: 'dist',
    emptyOutDir: true,
    // No inline scripts/styles — the dashboard ships a strict CSP without
    // 'unsafe-inline' in script-src, so anything inlined would be blocked.
    assetsInlineLimit: 0,
  },

  server: {
    port: 5173,
    // During `npm run dev`, forward API + auth calls to the running dashboard so
    // cookies and OAuth work exactly like in production.
    proxy: {
      '/api': { target: 'http://127.0.0.1:3010', changeOrigin: false },
      '/auth': { target: 'http://127.0.0.1:3010', changeOrigin: false },
    },
  },
});
