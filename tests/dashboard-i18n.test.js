/**
 * Dashboard translation tests.
 *
 * Two things are checked, and both have already caught a real bug:
 *   1. Key resolution, including keys that CONTAIN DOTS (permission ids are
 *      `tickets.view`, so `permissions.tickets.view` must not be walked as three
 *      levels). Getting this wrong degrades silently — every label just falls back
 *      to English — which is exactly the kind of failure a test has to catch.
 *   2. Every language file carries the same keys as English. A missing key falls
 *      back to English at runtime, so without this a half-translated file looks
 *      fine in review and ships with English strings scattered through it.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LOCALES_DIR = path.join(__dirname, '../web/src/locales');
const coreUrl = require('node:url')
  .pathToFileURL(path.join(__dirname, '../web/src/i18n-core.js')).href;

// The core module is ESM (it ships to the browser); these tests are CommonJS.
const core = () => import(coreUrl);

const readLocale = (file) =>
  JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));

const localeFiles = () =>
  fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json')).sort();

/** Every dotted key path in a bundle, treating `$meta` as bookkeeping, not text. */
function keyPaths(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (prefix === '' && k === '$meta') continue;
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.push(full);
    else if (v && typeof v === 'object') out.push(...keyPaths(v, full));
  }
  return out.sort();
}

test('a key containing dots resolves (permission ids)', async () => {
  const { lookup } = await core();
  const bundle = { permissions: { 'tickets.view': 'View tickets' } };

  // The regression: splitting on every dot walks to permissions.tickets → nothing.
  assert.equal(lookup(bundle, 'permissions.tickets.view'), 'View tickets');
});

test('normal nested keys still resolve', async () => {
  const { lookup } = await core();
  const bundle = { stats: { title: 'Statistics', deep: { one: 'x' } } };
  assert.equal(lookup(bundle, 'stats.title'), 'Statistics');
  assert.equal(lookup(bundle, 'stats.deep.one'), 'x');
});

test('lookup returns undefined instead of an object or a bad path', async () => {
  const { lookup } = await core();
  const bundle = { stats: { title: 'Statistics' } };
  assert.equal(lookup(bundle, 'stats'), undefined);        // an object is not a label
  assert.equal(lookup(bundle, 'stats.missing'), undefined);
  assert.equal(lookup(bundle, 'nope.at.all'), undefined);
  assert.equal(lookup(null, 'stats.title'), undefined);
});

test('placeholders are interpolated, unknown ones stay visible', async () => {
  const { interpolate } = await core();
  assert.equal(interpolate('Page {page} of {pages}', { page: 2, pages: 5 }), 'Page 2 of 5');
  assert.equal(interpolate('{count} total', { count: 0 }), '0 total');
  // A wrong variable name must be obvious, not silently blank.
  assert.equal(interpolate('Hello {name}', { other: 'x' }), 'Hello {name}');
  assert.equal(interpolate('no vars', null), 'no vars');
});

test('resolve falls back to English, then to the key itself', async () => {
  const { resolve } = await core();
  const bundles = {
    en: { a: 'English A', b: 'English B' },
    de: { a: 'Deutsch A' },
  };
  assert.equal(resolve(bundles, 'de', 'en', 'a'), 'Deutsch A');
  assert.equal(resolve(bundles, 'de', 'en', 'b'), 'English B', 'missing key falls back to English');
  assert.equal(resolve(bundles, 'de', 'en', 'c.d'), 'c.d', 'unknown key shows itself');
  assert.equal(resolve(bundles, 'xx', 'en', 'a'), 'English A', 'unknown language falls back');
});

test('English exists and is a complete bundle', () => {
  const files = localeFiles();
  assert.ok(files.includes('en.json'), 'en.json is the fallback and must exist');
  assert.ok(keyPaths(readLocale('en.json')).length > 100, 'English should carry the full UI');
});

test('every language file has exactly the English key set', () => {
  const expected = keyPaths(readLocale('en.json'));

  for (const file of localeFiles().filter(f => f !== 'en.json')) {
    const actual = keyPaths(readLocale(file));
    const missing = expected.filter(k => !actual.includes(k));
    const extra = actual.filter(k => !expected.includes(k));

    assert.deepEqual(missing, [], `${file} is missing keys: ${missing.join(', ')}`);
    assert.deepEqual(extra, [], `${file} has keys English does not: ${extra.join(', ')}`);
  }
});

test('every language file declares a display name for the switcher', () => {
  for (const file of localeFiles()) {
    const meta = readLocale(file).$meta;
    assert.ok(meta && typeof meta.name === 'string' && meta.name.length > 0,
      `${file} needs $meta.name — it is what the language dropdown shows`);
  }
});

test('placeholders match English in every language', () => {
  // A translation that drops {count} silently loses information; one that invents
  // {counter} renders the literal braces to the user.
  const en = readLocale('en.json');
  const placeholders = (s) => (s.match(/\{(\w+)\}/g) ?? []).sort();
  const flat = (obj, prefix = '', out = {}) => {
    for (const [k, v] of Object.entries(obj)) {
      if (prefix === '' && k === '$meta') continue;
      const full = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') out[full] = v;
      else if (v && typeof v === 'object') flat(v, full, out);
    }
    return out;
  };
  const enFlat = flat(en);

  for (const file of localeFiles().filter(f => f !== 'en.json')) {
    const other = flat(readLocale(file));
    for (const [key, value] of Object.entries(other)) {
      if (enFlat[key] === undefined) continue; // covered by the key-set test
      assert.deepEqual(placeholders(value), placeholders(enFlat[key]),
        `${file} → ${key}: placeholders differ from English`);
    }
  }
});
