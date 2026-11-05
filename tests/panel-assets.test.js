/**
 * Panel images: the customer's own file in assets/ wins, the shipped default in
 * assets/default/ is the fallback (src/utils/panel.js).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolvePanelAsset } = require('../src/utils/panel');

function tempAssets(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-assets-'));
  for (const rel of files) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), rel);
  }
  return dir;
}

test('the customer file in assets/ wins over the shipped default', () => {
  const dir = tempAssets(['logo.png', 'default/logo.png']);
  assert.equal(resolvePanelAsset('logo.png', dir), path.join(dir, 'logo.png'));
});

test('without a customer file the default in assets/default/ is used', () => {
  const dir = tempAssets(['default/logo.png']);
  assert.equal(resolvePanelAsset('logo.png', dir), path.join(dir, 'default', 'logo.png'));
});

test('a missing file resolves to null, a directory does not count', () => {
  const dir = tempAssets(['default/logo.png']);
  fs.mkdirSync(path.join(dir, 'banner.png'));
  assert.equal(resolvePanelAsset('banner.png', dir), null);
  assert.equal(resolvePanelAsset('', dir), null);
  assert.equal(resolvePanelAsset(undefined, dir), null);
});

test('the repository ships the default logo for panel.logo.file "logo.png"', () => {
  assert.ok(fs.statSync(path.resolve(__dirname, '../assets/default/logo.png')).isFile());
  assert.ok(resolvePanelAsset('logo.png'));
});

test('resolvePanelAsset: a path outside assets/ is never resolved', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-assets-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, '.env'), 'TOKEN=secret');
  fs.writeFileSync(path.join(dir, 'assets', 'logo.png'), 'x');
  const assets = path.join(dir, 'assets');
  for (const bad of ['../.env', '..\.env', '/etc/passwd', path.join(dir, '.env'), '..', '.', 'default/../../.env']) {
    assert.equal(resolvePanelAsset(bad, assets), null, bad);
  }
  assert.equal(resolvePanelAsset('logo.png', assets), path.join(assets, 'logo.png'));
});
