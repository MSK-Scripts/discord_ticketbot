// Applies the dashboard's appearance settings (accent colour + favicon) at
// runtime. The server serves the values publicly at /dashboard-settings.json so
// this can run before login and before React mounts: main.jsx calls
// applyDashboardSettings() ahead of render, so there is no flash of the
// default accent.
//
// The accent is fitted to both themes by accent.js and written as
// --accent-light-* and --accent-dark-* custom properties on <html>, plus the
// data-accent attribute that switches index.css over to them. Both themes are
// ready at once, so the theme switch needs no script of its own. The values
// are set through the CSSOM (style.setProperty), which the CSP does not
// restrict, not as a style attribute in markup.

import { ACCENT_PROPERTIES, accentProperties, hexToRgb, readableForeground } from './accent.js';

export { hexToRgb, readableForeground };

/**
 * Apply (or clear, when accent is falsy/invalid) the accent colour on <html>.
 * Exported on its own so the settings view can preview a colour live before saving.
 */
export function applyAccent(accent) {
  const root = document.documentElement;
  const props = accentProperties(accent);

  if (!props) {
    // Reset: drop the overrides so the MSK green of the stylesheet applies again.
    for (const name of ACCENT_PROPERTIES) root.style.removeProperty(name);
    root.removeAttribute('data-accent');
    return;
  }

  for (const [name, value] of Object.entries(props)) root.style.setProperty(name, value);
  root.setAttribute('data-accent', '');
}

/** Point the <link rel="icon"> at the current favicon, busting the cache on change. */
export function applyFavicon(version) {
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  // A version means a custom favicon is set; add it as a cache-buster so a fresh
  // upload shows immediately. No version leaves the default /favicon.ico.
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
    /* offline or not built yet: the default theme is fine */
  }
}
