/**
 * Customer locale layer (src/utils/locales.js).
 *
 * The shipped locales/<lang>.json are tracked in git and must never be written
 * again; customer texts live in locales/custom/<lang>.json as the difference to
 * the shipped file. These tests guard that data path: a customer text must
 * survive a save and win at runtime, and the shipped file must stay untouched.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  mergeLocale, diffLocale, loadLocale, readLocaleForEditor, saveLocaleEdit, resetLocale, customPathFor,
} = require('../src/utils/locales');

const SHIPPED = {
  buttons: { open: 'Open', close: 'Close' },
  messages: { created: 'Created {channel}', nested: { a: 'A', b: 'B' } },
  list: ['one', 'two'],
  count: 3,
};

function tempLocales(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-locales-'));
  for (const [name, value] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2), 'utf-8');
  }
  return dir;
}

// ── mergeLocale ──────────────────────────────────────────────────────────────

test('merge: a nested custom leaf wins, its siblings keep the shipped value', () => {
  const merged = mergeLocale(SHIPPED, { messages: { nested: { b: 'Eigenes B' } } });
  assert.equal(merged.messages.nested.b, 'Eigenes B');
  assert.equal(merged.messages.nested.a, 'A');
  assert.equal(merged.messages.created, 'Created {channel}');
  assert.deepEqual(merged.buttons, SHIPPED.buttons);
});

test('merge: keys that only exist in the custom file are kept', () => {
  const merged = mergeLocale(SHIPPED, { extra: { hello: 'Hallo' }, buttons: { reopen: 'Wieder öffnen' } });
  assert.deepEqual(merged.extra, { hello: 'Hallo' });
  assert.equal(merged.buttons.reopen, 'Wieder öffnen');
  assert.equal(merged.buttons.open, 'Open');
});

test('merge: arrays and primitives replace instead of merging', () => {
  const merged = mergeLocale(SHIPPED, { list: ['eins'], count: 7, buttons: 'flat' });
  assert.deepEqual(merged.list, ['eins']);
  assert.equal(merged.count, 7);
  assert.equal(merged.buttons, 'flat');
});

test('merge: inputs are not mutated and a non-object custom value is ignored', () => {
  const before = JSON.stringify(SHIPPED);
  mergeLocale(SHIPPED, { messages: { nested: { a: 'x' } } });
  assert.equal(JSON.stringify(SHIPPED), before);
  assert.deepEqual(mergeLocale(SHIPPED, ['not', 'an', 'object']), SHIPPED);
  assert.deepEqual(mergeLocale(SHIPPED, null), SHIPPED);
});

test('merge: a "__proto__" key cannot change the prototype', () => {
  const merged = mergeLocale(SHIPPED, JSON.parse('{"__proto__": {"polluted": "yes"}}'));
  assert.equal(merged.polluted, undefined);
  assert.equal({}.polluted, undefined);
});

// ── diffLocale ───────────────────────────────────────────────────────────────

test('diff: only the changed leaves are returned, with their path', () => {
  const edited = structuredClone(SHIPPED);
  edited.messages.nested.b = 'Eigenes B';
  edited.buttons.close = 'Schließen';
  assert.deepEqual(diffLocale(SHIPPED, edited), {
    messages: { nested: { b: 'Eigenes B' } },
    buttons: { close: 'Schließen' },
  });
});

test('diff: an unchanged file yields an empty object', () => {
  assert.deepEqual(diffLocale(SHIPPED, structuredClone(SHIPPED)), {});
});

test('diff: arrays compare by content, a changed array is returned whole', () => {
  assert.deepEqual(diffLocale(SHIPPED, { ...structuredClone(SHIPPED), list: ['one', 'two'] }), {});
  assert.deepEqual(diffLocale(SHIPPED, { ...structuredClone(SHIPPED), list: ['one', 'drei'] }), { list: ['one', 'drei'] });
});

test('diff: new keys and changed types are returned', () => {
  const edited = { ...structuredClone(SHIPPED), extra: { x: 'y' }, count: '3' };
  assert.deepEqual(diffLocale(SHIPPED, edited), { extra: { x: 'y' }, count: '3' });
});

test('diff + merge round trip gives back the edited file', () => {
  const edited = structuredClone(SHIPPED);
  edited.messages.nested.a = 'Ä';
  edited.list = [];
  edited.newBlock = { deep: { er: 'ß' } };
  assert.deepEqual(mergeLocale(SHIPPED, diffLocale(SHIPPED, edited)), edited);
});

// ── loadLocale (runtime) ─────────────────────────────────────────────────────

test('load: without a custom file the shipped file is returned', () => {
  const dir = tempLocales({ 'de.json': SHIPPED });
  assert.deepEqual(loadLocale('de', { dir }), SHIPPED);
});

test('load: the custom file is merged over the shipped file', () => {
  const dir = tempLocales({ 'de.json': SHIPPED, 'custom/de.json': { buttons: { open: 'Ticket öffnen' } } });
  const loc = loadLocale('de', { dir });
  assert.equal(loc.buttons.open, 'Ticket öffnen');
  assert.equal(loc.buttons.close, 'Close');
});

test('load: an invalid custom file only warns and the shipped texts are used', () => {
  for (const broken of ['{ not json', '["an", "array"]', '"a string"']) {
    const dir = tempLocales({ 'de.json': SHIPPED, 'custom/de.json': broken });
    const warnings = [];
    const loc = loadLocale('de', { dir, warn: (m) => warnings.push(m) });
    assert.deepEqual(loc, SHIPPED, broken);
    assert.equal(warnings.length, 1, broken);
  }
});

test('load: a missing shipped file throws (the caller falls back to English)', () => {
  const dir = tempLocales({ 'en.json': SHIPPED });
  assert.throws(() => loadLocale('xx', { dir }));
  assert.throws(() => loadLocale('../en', { dir }), /Invalid locale code/);
});

// ── Dashboard editor helpers (GET / PUT / DELETE /locales/:name) ─────────────

test('editor: GET without a custom file returns the shipped text byte for byte', () => {
  const text = '{\r\n  "buttons": { "open": "Öffnen" }\r\n}\r\n';
  const dir = tempLocales({ 'de.json': text });
  assert.deepEqual(readLocaleForEditor(dir, 'de.json'), { content: text, customized: false });
});

test('editor: PUT writes only the difference and never touches the shipped file', () => {
  const dir = tempLocales({ 'de.json': SHIPPED });
  const shippedBefore = fs.readFileSync(path.join(dir, 'de.json'));

  const edited = structuredClone(SHIPPED);
  edited.messages.created = 'Ticket {channel} erstellt';
  assert.deepEqual(saveLocaleEdit(dir, 'de.json', edited), { customized: true });

  assert.deepEqual(fs.readFileSync(path.join(dir, 'de.json')), shippedBefore);
  const custom = JSON.parse(fs.readFileSync(customPathFor('de.json', dir), 'utf-8'));
  assert.deepEqual(custom, { messages: { created: 'Ticket {channel} erstellt' } });

  // GET now shows the full, merged file.
  const view = readLocaleForEditor(dir, 'de.json');
  assert.equal(view.customized, true);
  assert.deepEqual(JSON.parse(view.content), edited);
});

test('editor: PUT of the shipped content removes the custom file and keeps a .bak', () => {
  const dir = tempLocales({ 'de.json': SHIPPED, 'custom/de.json': { count: 9 } });
  assert.deepEqual(saveLocaleEdit(dir, 'de.json', structuredClone(SHIPPED)), { customized: false });
  assert.equal(fs.existsSync(customPathFor('de.json', dir)), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(`${customPathFor('de.json', dir)}.bak`, 'utf-8')), { count: 9 });
});

test('editor: DELETE drops the custom layer, a second DELETE is a no-op', () => {
  const dir = tempLocales({ 'de.json': SHIPPED, 'custom/de.json': { count: 9 } });
  assert.deepEqual(resetLocale(dir, 'de.json'), { removed: true });
  assert.deepEqual(readLocaleForEditor(dir, 'de.json').customized, false);
  assert.deepEqual(resetLocale(dir, 'de.json'), { removed: false });
});
