/**
 * Update routine (src/utils/updater.js), run against real temporary git
 * repositories: an "upstream" with a release commit and a customer clone.
 *
 * This guards a data path. A customer's locale texts and logo must survive the
 * update, and the update must no longer fail because of them or because npm
 * rewrote package-lock.json.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { runUpdate, parsePorcelain, STASH_DIRNAME } = require('../src/utils/updater');
const { loadLocale } = require('../src/utils/locales');

const HOOKS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-nohooks-'));

function git(cwd, ...args) {
  return execFileSync('git', [
    '-c', 'commit.gpgsign=false', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
    '-c', `core.hooksPath=${HOOKS_DIR}`, '-c', 'core.autocrlf=false', ...args,
  ], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const write = (root, rel, content) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
};
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf-8');
const json = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

const DE_V1 = { buttons: { open: 'Ticket öffnen', close: 'Schließen' }, messages: { created: 'Erstellt' } };
const DE_V2 = { buttons: { open: 'Ticket öffnen', close: 'Schließen' }, messages: { created: 'Erstellt', added: 'Neu in v2' } };
const OLD_GITIGNORE = '/node_modules\n';
const NEW_GITIGNORE = [
  '/node_modules', '/assets/*', '!/assets/README.md', '!/assets/default/',
  '/locales/custom/', '/locales/*.bak', '/locales/*.pre-custom-layer', '/.update-stash/', '',
].join('\n');
const MSK_LOGO = 'MSK-LOGO-BYTES';
const CUSTOMER_LOGO = 'CUSTOMER-LOGO-BYTES';

/**
 * Upstream v1 (as the customer installed it) and a clone of it. `release()`
 * then commits v2 upstream: a changed de.json, a changed lockfile, the new
 * gitignore and, unless keepLogo, the logo moved to assets/default/.
 */
function setup() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-update-'));
  const up = path.join(base, 'upstream');
  const clone = path.join(base, 'clone');
  fs.mkdirSync(up);
  git(up, 'init', '-q', '-b', 'main');
  write(up, '.gitignore', OLD_GITIGNORE);
  write(up, 'package-lock.json', json({ lockfileVersion: 3, v: 1 }));
  write(up, 'locales/de.json', json(DE_V1));
  write(up, 'locales/en.json', json({ buttons: { open: 'Open ticket' } }));
  write(up, 'assets/README.md', 'assets\n');
  write(up, 'assets/logo.png', MSK_LOGO);
  git(up, 'add', '-A');
  git(up, 'commit', '-q', '-m', 'v1');
  git(base, 'clone', '-q', up, clone);
  // The updater runs git with the machine's own config; pin line endings in the
  // clone so a global core.autocrlf does not show every file as modified.
  git(clone, 'config', 'core.autocrlf', 'false');

  const release = ({ keepLogo = false } = {}) => {
    write(up, '.gitignore', NEW_GITIGNORE);
    write(up, 'package-lock.json', json({ lockfileVersion: 3, v: 2 }));
    write(up, 'locales/de.json', json(DE_V2));
    write(up, 'assets/default/logo.png', MSK_LOGO);
    if (!keepLogo) git(up, 'rm', '-q', 'assets/logo.png');
    git(up, 'add', '-A');
    git(up, 'commit', '-q', '-m', 'v2');
  };
  return { up, clone, release };
}

const update = (root) => {
  const lines = [];
  return runUpdate({ root, install: false, log: (l) => lines.push(l) }).then((r) => ({ ...r, lines }));
};
const head = (root) => git(root, 'rev-parse', 'HEAD').trim();
const status = (root) => git(root, 'status', '--porcelain').trim();

test('porcelain parsing keeps tracked changes and skips untracked and rename sources', () => {
  const text = ' M locales/de.json\0?? assets/banner.png\0R  new.txt\0old.txt\0D  assets/logo.png\0';
  assert.deepEqual(parsePorcelain(text), [
    { x: ' ', y: 'M', file: 'locales/de.json' },
    { x: 'R', y: ' ', file: 'new.txt' },
    { x: 'D', y: ' ', file: 'assets/logo.png' },
  ]);
});

test('unchanged clone: plain fast-forward, nothing migrated', async () => {
  const { up, clone, release } = setup();
  release();
  const r = await update(clone);
  assert.equal(r.ok, true, r.detail);
  assert.deepEqual(r.migrated, { locales: [], assets: [] });
  assert.equal(head(clone), head(up));
  assert.equal(status(clone), '');
  assert.equal(fs.existsSync(path.join(clone, 'locales/custom')), false);
  assert.equal(read(clone, 'assets/default/logo.png'), MSK_LOGO);
});

test('edited locale: edits move to locales/custom, shipped file updates, nothing is lost', async () => {
  const { up, clone, release } = setup();
  const edited = structuredClone(DE_V1);
  edited.buttons.open = 'Support anfragen';
  edited.extra = { mine: 'Nur bei mir' };
  const editedText = json(edited);
  write(clone, 'locales/de.json', editedText);
  // npm 11 rewrote the lockfile too, the other classic reason for a failed pull.
  write(clone, 'package-lock.json', json({ lockfileVersion: 3, v: 1, rewritten: true }));
  release();

  const r = await update(clone);
  assert.equal(r.ok, true, r.detail);
  assert.deepEqual(r.migrated.locales, ['locales/de.json']);
  assert.equal(head(clone), head(up));
  assert.equal(status(clone), '', 'working tree must be clean after the update');

  // Only the customer's leaves are in the layer ...
  assert.deepEqual(JSON.parse(read(clone, 'locales/custom/de.json')), {
    buttons: { open: 'Support anfragen' },
    extra: { mine: 'Nur bei mir' },
  });
  // ... the shipped file is the new release ...
  assert.deepEqual(JSON.parse(read(clone, 'locales/de.json')), DE_V2);
  // ... and at runtime the customer's texts win while the new key arrives.
  const loc = loadLocale('de', { dir: path.join(clone, 'locales') });
  assert.equal(loc.buttons.open, 'Support anfragen');
  assert.equal(loc.messages.added, 'Neu in v2');
  assert.equal(loc.extra.mine, 'Nur bei mir');
  // The edited file is kept as it was.
  assert.equal(read(clone, 'locales/de.json.pre-custom-layer'), editedText);
});

test('edited locale and an existing custom file: both survive, the edited value wins', async () => {
  const { clone, release } = setup();
  write(clone, 'locales/custom/de.json', json({ buttons: { open: 'Alt', close: 'Zu' } }));
  const edited = structuredClone(DE_V1);
  edited.buttons.open = 'Neu';
  write(clone, 'locales/de.json', json(edited));
  release();

  const r = await update(clone);
  assert.equal(r.ok, true, r.detail);
  assert.deepEqual(JSON.parse(read(clone, 'locales/custom/de.json')), { buttons: { open: 'Neu', close: 'Zu' } });
});

test('edited locale that is not valid JSON: kept as backup, file reset, update goes on', async () => {
  const { up, clone, release } = setup();
  write(clone, 'locales/de.json', '{ "broken": ');
  release();
  const r = await update(clone);
  assert.equal(r.ok, true, r.detail);
  assert.equal(head(clone), head(up));
  assert.equal(read(clone, 'locales/de.json.pre-custom-layer'), '{ "broken": ');
  assert.ok(r.lines.some(l => l.includes('re-apply')));
});

test('replaced logo: set aside, pulled past the move, put back as an ignored file', async () => {
  const { up, clone, release } = setup();
  write(clone, 'assets/logo.png', CUSTOMER_LOGO);
  release();

  const r = await update(clone);
  assert.equal(r.ok, true, r.detail);
  assert.deepEqual(r.migrated.assets, ['assets/logo.png']);
  assert.equal(head(clone), head(up));
  assert.equal(read(clone, 'assets/logo.png'), CUSTOMER_LOGO);
  assert.equal(read(clone, 'assets/default/logo.png'), MSK_LOGO);
  assert.equal(status(clone), '');
  assert.equal(fs.existsSync(path.join(clone, STASH_DIRNAME)), false);
});

test('replaced logo while the release still tracks assets/logo.png: kept, update works', async () => {
  const { up, clone, release } = setup();
  write(clone, 'assets/logo.png', CUSTOMER_LOGO);
  release({ keepLogo: true });
  const r = await update(clone);
  assert.equal(r.ok, true, r.detail);
  assert.equal(head(clone), head(up));
  assert.equal(read(clone, 'assets/logo.png'), CUSTOMER_LOGO);
});

test('failed pull: the customer logo is put back and the error is reported', async () => {
  const { clone, release } = setup();
  write(clone, 'assets/logo.png', CUSTOMER_LOGO);
  release();
  git(clone, 'remote', 'set-url', 'origin', path.join(os.tmpdir(), 'tb-does-not-exist', 'repo'));

  const r = await update(clone);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'git pull failed');
  assert.equal(read(clone, 'assets/logo.png'), CUSTOMER_LOGO);
  assert.equal(fs.existsSync(path.join(clone, STASH_DIRNAME)), false);
});

test('a stash left by an interrupted run is restored before anything else', async () => {
  const { clone, release } = setup();
  write(clone, `${STASH_DIRNAME}/assets/logo.png`, CUSTOMER_LOGO); // working tree holds the MSK logo
  release();
  const r = await update(clone);
  assert.equal(r.ok, true, r.detail);
  assert.equal(read(clone, 'assets/logo.png'), CUSTOMER_LOGO);
});

test('not a git checkout: clear error, nothing touched', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-nogit-'));
  const r = await update(dir);
  assert.equal(r.ok, false);
  assert.match(r.error, /Not a git checkout/);
});
