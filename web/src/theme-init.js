/*
 * Sets the theme on <html> before the first paint, so a dark choice never
 * flashes light (and the other way round).
 *
 * A classic, render-blocking script in <head>, loaded from the dashboard's
 * own origin: the CSP allows script-src 'self' and no inline script, so it
 * cannot be inlined. vite.config.js emits it under a content hash and adds
 * the <script> tag. It carries the rules of src/theme-core.js in plain ES5 without
 * imports; tests/dashboard-theme.test.js runs both against the same cases.
 */
(function () {
  var choice = 'system';
  try {
    var stored = window.localStorage.getItem('tb.theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') choice = stored;
  } catch (e) {
    /* private mode or blocked storage: follow the system */
  }
  var dark = choice === 'dark';
  if (choice === 'system') {
    try {
      dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
      dark = false;
    }
  }
  document.documentElement.classList.toggle('dark', dark);
})();
