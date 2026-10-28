/**
 * The theme choice of the dashboard: light, dark or the system setting.
 *
 * Two pieces carry the same rules: web/src/theme-core.js for the React tree and
 * web/src/theme-init.js, the plain script that sets the class before the first
 * paint (it cannot import anything). Both run here against one table of cases,
 * so they cannot drift apart: a first visit follows the system, a stored choice
 * wins, and anything unreadable falls back to the system.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const core = () => import(pathToFileURL(path.join(__dirname, '../web/src/theme-core.js')).href);
const INIT = fs.readFileSync(path.join(__dirname, '../web/src/theme-init.js'), 'utf8');

/** A localStorage stand-in; `throws` simulates private mode or blocked storage. */
function fakeStorage(initial = {}, { throws = false } = {}) {
  const data = { ...initial };
  return {
    getItem(k) { if (throws) throw new Error('blocked'); return k in data ? data[k] : null; },
    setItem(k, v) { if (throws) throw new Error('blocked'); data[k] = String(v); },
    data,
  };
}

/** Run theme-init.js in a sandbox and report whether it set the dark class. */
function runInit({ stored, systemDark, storageThrows = false, noMatchMedia = false }) {
  const classes = new Set();
  const sandbox = {
    window: {
      localStorage: fakeStorage(stored === undefined ? {} : { 'tb.theme': stored }, { throws: storageThrows }),
      matchMedia: noMatchMedia ? undefined : (q) => ({ matches: q === '(prefers-color-scheme: dark)' && systemDark }),
    },
    document: {
      documentElement: {
        classList: {
          toggle(name, force) { if (force) classes.add(name); else classes.delete(name); return force; },
        },
      },
    },
  };
  vm.runInNewContext(INIT, sandbox);
  return classes.has('dark') ? 'dark' : 'light';
}

// [description, stored value (undefined = nothing stored), system prefers dark, expected]
const CASES = [
  ['first visit, light system', undefined, false, 'light'],
  ['first visit, dark system', undefined, true, 'dark'],
  ['"system" stored follows a light system', 'system', false, 'light'],
  ['"system" stored follows a dark system', 'system', true, 'dark'],
  ['light chosen on a dark system', 'light', true, 'light'],
  ['dark chosen on a light system', 'dark', false, 'dark'],
  ['an unknown stored value counts as system (dark)', 'purple', true, 'dark'],
  ['an unknown stored value counts as system (light)', 'DARK', false, 'light'],
  ['an empty stored value counts as system', '', true, 'dark'],
];

for (const [label, stored, systemDark, expected] of CASES) {
  test(`theme-core: ${label}`, async () => {
    const { readChoice, resolveTheme } = await core();
    const choice = readChoice(fakeStorage(stored === undefined ? {} : { 'tb.theme': stored }));
    assert.equal(resolveTheme(choice, systemDark), expected);
  });

  test(`theme-init (before the first paint): ${label}`, () => {
    assert.equal(runInit({ stored, systemDark }), expected);
  });
}

test('blocked storage falls back to the system in both pieces', async () => {
  const { readChoice, resolveTheme } = await core();
  assert.equal(resolveTheme(readChoice(fakeStorage({}, { throws: true })), true), 'dark');
  assert.equal(runInit({ stored: 'light', systemDark: true, storageThrows: true }), 'dark');
});

test('without matchMedia the pre-paint script picks light instead of failing', () => {
  assert.equal(runInit({ stored: undefined, systemDark: true, noMatchMedia: true }), 'light');
  assert.equal(runInit({ stored: 'dark', systemDark: false, noMatchMedia: true }), 'dark');
});

test('a choice is remembered under the key the pre-paint script reads', async () => {
  const { writeChoice, readChoice, THEME_KEY } = await core();
  const storage = fakeStorage();
  writeChoice(storage, 'dark');
  assert.equal(storage.data[THEME_KEY], 'dark');
  assert.equal(readChoice(storage), 'dark');
  assert.match(INIT, new RegExp(`getItem\\('${THEME_KEY.replace('.', '\\.')}'\\)`));
  // An invalid choice is stored as "system", never as itself.
  writeChoice(storage, '<script>');
  assert.equal(storage.data[THEME_KEY], 'system');
});

test('applyTheme toggles exactly the dark class', async () => {
  const { applyTheme } = await core();
  const classes = new Set(['keep']);
  const root = { classList: { toggle: (n, f) => (f ? classes.add(n) : classes.delete(n)) } };
  applyTheme(root, 'dark');
  assert.deepEqual([...classes].sort(), ['dark', 'keep']);
  applyTheme(root, 'light');
  assert.deepEqual([...classes], ['keep']);
});

test('the pre-paint script is loaded as a classic script before the app', () => {
  const config = fs.readFileSync(path.join(__dirname, '../web/vite.config.js'), 'utf8');
  // A plain <script src> placed after the <title>, not type="module" (that
  // would be deferred until after the first paint) and not inline (the CSP
  // has no nonce and no 'unsafe-inline').
  assert.match(config, /const tag = `<script src="\$\{src\}"><\/script>`;/);
  assert.match(config, /html\.replace\('<\/title>'/);
  const html = fs.readFileSync(path.join(__dirname, '../web/index.html'), 'utf8');
  assert.ok(html.indexOf('</title>') < html.indexOf('<script type="module"'), 'the app module comes after the title');
});
