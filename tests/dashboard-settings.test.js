/**
 * Dashboard appearance settings: accent validation and favicon storage.
 *
 * These decide what the dashboard looks like and accept an uploaded file, so the
 * validation (hex colour, magic-byte type detection, size) is what keeps a bad or
 * hostile value out. Runs against a throwaway data dir via DASHBOARD_DATA_DIR.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Point the module at a temp dir BEFORE requiring it (paths are read at load).
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-settings-'));
process.env.DASHBOARD_DATA_DIR = TMP;

const s = require('../src/dashboard/settings');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const ICO = Buffer.from([0x00, 0x00, 0x01, 0x00, 4, 5, 6]);

test('accent validation accepts #rgb and #rrggbb only', () => {
  assert.ok(s.isValidAccent('#5eb131'));
  assert.ok(s.isValidAccent('#abc'));
  assert.ok(!s.isValidAccent('5eb131'));      // no hash
  assert.ok(!s.isValidAccent('#12345'));      // wrong length
  assert.ok(!s.isValidAccent('#gggggg'));     // not hex
  assert.ok(!s.isValidAccent('red'));
  assert.ok(!s.isValidAccent(null));
});

test('defaults are all null when nothing is stored', () => {
  const d = s.loadSettings();
  assert.deepEqual(d, { accent: null, faviconExt: null, faviconVersion: null });
});

test('setAccent stores a normalised colour and can clear it', () => {
  assert.deepEqual(s.setAccent('#5EB131'), { ok: true });
  assert.equal(s.loadSettings().accent, '#5eb131'); // lower-cased

  const bad = s.setAccent('nope');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /hex/);
  assert.equal(s.loadSettings().accent, '#5eb131', 'a rejected value must not overwrite the good one');

  assert.deepEqual(s.setAccent(null), { ok: true });
  assert.equal(s.loadSettings().accent, null);
});

test('favicon type is detected from magic bytes, not a name', () => {
  assert.equal(s.detectFaviconType(PNG), 'png');
  assert.equal(s.detectFaviconType(ICO), 'ico');
  assert.equal(s.detectFaviconType(Buffer.from('GIF89a')), null);
  assert.equal(s.detectFaviconType(Buffer.alloc(0)), null);
  assert.equal(s.detectFaviconType('not a buffer'), null);
});

test('setFavicon stores the file and records ext + version', () => {
  const r = s.setFavicon(PNG);
  assert.equal(r.ok, true);
  assert.equal(r.ext, 'png');
  assert.ok(Number.isFinite(r.version));

  const loaded = s.loadSettings();
  assert.equal(loaded.faviconExt, 'png');
  assert.equal(loaded.faviconVersion, r.version);

  const served = s.getFaviconFile();
  assert.ok(served && served.mime === 'image/png');
  assert.ok(fs.existsSync(served.file));
});

test('uploading a different type replaces the previous file', () => {
  s.setFavicon(PNG);
  s.setFavicon(ICO);
  const loaded = s.loadSettings();
  assert.equal(loaded.faviconExt, 'ico');
  assert.ok(!fs.existsSync(`${s.FAVICON_BASE}.png`), 'old png must be gone');
  assert.ok(fs.existsSync(`${s.FAVICON_BASE}.ico`));
});

test('a non-image upload is rejected', () => {
  const r = s.setFavicon(Buffer.from('<svg>hi</svg>'));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('an oversized upload is rejected', () => {
  const big = Buffer.concat([PNG, Buffer.alloc(s.MAX_FAVICON_BYTES)]);
  const r = s.setFavicon(big);
  assert.equal(r.ok, false);
  assert.equal(r.status, 413);
});

test('clearFavicon removes the file and reverts to default', () => {
  s.setFavicon(PNG);
  s.clearFavicon();
  const loaded = s.loadSettings();
  assert.equal(loaded.faviconExt, null);
  assert.equal(loaded.faviconVersion, null);
  assert.equal(s.getFaviconFile(), null);
});

test('publicSettings exposes only accent + favicon version', () => {
  s.setAccent('#abcdef');
  s.setFavicon(PNG);
  const pub = s.publicSettings();
  assert.deepEqual(Object.keys(pub).sort(), ['accent', 'favicon']);
  assert.equal(pub.accent, '#abcdef');
  assert.ok(Number.isFinite(pub.favicon));
  s.clearFavicon();
  s.setAccent(null);
});

test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });
