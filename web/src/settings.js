// Applies the dashboard's appearance settings (accent colour + favicon) at
// runtime. The server serves the values publicly at /dashboard-settings.json so
// this can run before login and before React mounts — that is why main.jsx calls
// applyDashboardSettings() ahead of render, so there is no flash of the default
// theme.
//
// The accent is applied by overriding the base CSS custom properties on <html>.
// An inline style on the element beats any stylesheet rule, so this reliably wins
// over the defaults in index.css without needing !important or a rebuild.

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// The tokens that carry the green accent in index.css. Overriding these re-themes
// every shadcn component, the focus rings and the sidebar in one go.
const ACCENT_VARS = ['--primary', '--ring', '--sidebar-primary', '--sidebar-ring'];

/** "#5eb131" | "#abc" → { r, g, b }, or null when it is not a hex colour. */
export function hexToRgb(hex) {
  if (typeof hex !== 'string' || !HEX_RE.test(hex.trim())) return null;
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Black or white text for best contrast on the given accent (YIQ brightness).
 *  Threshold 128 is the classic split; it keeps dark text on the MSK green
 *  (brightness ~138), matching the built-in --primary-foreground. */
export function readableForeground({ r, g, b }) {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 128 ? '#08110b' : '#ffffff';
}

/**
 * Apply (or clear, when accent is falsy/invalid) the accent colour on <html>.
 * Exported on its own so the settings view can preview a colour live before saving.
 */
export function applyAccent(accent) {
  const root = document.documentElement;
  const rgb = hexToRgb(accent);

  if (!rgb) {
    // Reset: drop the overrides so the stylesheet defaults take over again.
    for (const v of [...ACCENT_VARS, '--primary-foreground', '--sidebar-primary-foreground',
      '--sidebar-accent', '--sidebar-accent-foreground']) {
      root.style.removeProperty(v);
    }
    return;
  }

  const hex = accent.trim().toLowerCase();
  const fg = readableForeground(rgb);
  for (const v of ACCENT_VARS) root.style.setProperty(v, hex);
  root.style.setProperty('--primary-foreground', fg);
  root.style.setProperty('--sidebar-primary-foreground', fg);
  // The active nav item: accent-coloured text on a faint accent-tinted surface.
  root.style.setProperty('--sidebar-accent', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`);
  root.style.setProperty('--sidebar-accent-foreground', hex);
}

/** Point the <link rel="icon"> at the current favicon, busting the cache on change. */
export function applyFavicon(version) {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  // A version means a custom favicon is set — add it as a cache-buster so a fresh
  // upload shows immediately. No version → leave the default /favicon.ico.
  link.href = version ? `/favicon.ico?v=${version}` : '/favicon.ico';
}

/** Apply a { accent, favicon } payload from /dashboard-settings.json. */
export function applyDashboardSettings(settings) {
  if (!settings || typeof settings !== 'object') return;
  applyAccent(settings.accent);
  applyFavicon(settings.favicon);
}

/** Fetch the public settings and apply them. Best-effort: failure keeps defaults. */
export async function loadAndApplyDashboardSettings() {
  try {
    const res = await fetch('/dashboard-settings.json', { credentials: 'same-origin' });
    if (res.ok) applyDashboardSettings(await res.json());
  } catch {
    /* offline or not built yet — the default theme is fine */
  }
}
