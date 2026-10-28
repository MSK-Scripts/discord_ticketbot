import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Loads src/theme-init.js as a classic, render-blocking script at the top of
 * <head>, so the theme class is on <html> before the first paint.
 *
 * The CSP has no nonce and allows no inline script, so the script has to be a
 * file of its own on the dashboard's origin (script-src 'self'). Vite only
 * bundles module scripts, which run after the page is parsed, too late to
 * avoid a flash; so this plugin emits the file itself under a content hash.
 * The hash matters: the server caches everything but index.html as immutable,
 * so a changed script needs a new name. In dev the source file is served as is.
 */
function themeInitScript() {
  const source = fileURLToPath(new URL('./src/theme-init.js', import.meta.url));
  let base = '/';
  let isBuild = false;
  let fileName = null;
  return {
    name: 'ticketbot-theme-init',
    configResolved(config) {
      base = config.base;
      isBuild = config.command === 'build';
    },
    buildStart() {
      if (!isBuild) return;
      const code = readFileSync(source, 'utf8');
      const hash = createHash('sha256').update(code).digest('base64url').slice(0, 8);
      fileName = `assets/theme-init-${hash}.js`;
      this.emitFile({ type: 'asset', fileName, source: code });
    },
    transformIndexHtml(html) {
      const src = isBuild ? `${base}${fileName}` : `${base}src/theme-init.js`;
      // Right after the <title>: below the charset and viewport metas, above
      // the app's module script and stylesheet. A classic script, not
      // type="module", which would be deferred.
      const tag = `<script src="${src}"></script>`;
      if (!html.includes('</title>')) throw new Error('index.html needs a <title> for the theme script');
      return html.replace('</title>', `</title>\n    ${tag}`);
    },
  };
}

export default defineConfig({
  plugins: [themeInitScript(), react(), tailwindcss()],

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
    // No inline scripts/styles: the dashboard ships a strict CSP without
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
