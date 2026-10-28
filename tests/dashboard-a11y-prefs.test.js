/**
 * The dashboard follows the visitor's system settings for motion, contrast and
 * the Windows contrast themes (WCAG 2.2 AA, as msk-scripts.de does). The rules
 * live in web/src/index.css; this keeps them from being dropped in a restyle.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../web/src/index.css'), 'utf8');

function media(query) {
  const start = css.indexOf(`@media (${query})`);
  assert.ok(start > -1, `no @media (${query}) in index.css`);
  return css.slice(start, css.indexOf('\n}', start));
}

test('reduced motion stops transitions and animations', () => {
  const rules = media('prefers-reduced-motion: reduce');
  assert.match(rules, /transition-duration:\s*0\.01ms/);
  assert.match(rules, /animation-duration:\s*0\.01ms/);
});

test('more contrast raises secondary text and lines to full strength in every scope', () => {
  const rules = media('prefers-contrast: more');
  assert.match(rules, /--muted-foreground:\s*var\(--foreground\)/);
  assert.match(rules, /--border:\s*var\(--input\)/);
  // The dark theme is a class on <html>, so it must be listed, or its own
  // token block would win and the setting would do nothing there.
  assert.match(rules, /\.dark/);
});

test('forced colours give controls a system border and focus the system highlight', () => {
  const rules = media('forced-colors: active');
  assert.match(rules, /border:\s*1px solid ButtonText/);
  assert.match(rules, /outline-color:\s*Highlight/);
});

test('focus is a visible outline in the ring colour', () => {
  assert.match(css, /:focus-visible\s*\{\s*outline:\s*3px solid var\(--ring\)/);
});
