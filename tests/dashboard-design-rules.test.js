/**
 * Design rules of the dashboard that a contrast test cannot see.
 *
 * tests/dashboard-contrast.test.js only checks the tokens in index.css. A colour
 * written straight into a component (a Tailwind palette class, a hex value in
 * brackets, white or black with an opacity) never reaches it, and is usually
 * also the colour that breaks in one of the two themes. So the components may
 * only name tokens. The same scan keeps the redesign's exclusion list out:
 * Lucide icons, the old web fonts, Inter and JetBrains Mono.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '../web/src');

function files(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files(full, out);
    else if (/\.(jsx?|css)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const SOURCES = files(SRC).map(file => ({
  file: path.relative(SRC, file).replace(/\\/g, '/'),
  text: fs.readFileSync(file, 'utf8'),
}));
const CODE = SOURCES.filter(s => /\.jsx?$/.test(s.file));

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';
const UTILITY = 'bg|text|border|ring|outline|fill|stroke|from|to|via|caret|decoration|divide|placeholder|shadow|accent';

function offenders(regex, sources = CODE) {
  const hits = [];
  for (const { file, text } of sources) {
    text.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(regex)) hits.push(`${file}:${i + 1} ${m[0]}`);
    });
  }
  return hits;
}

test('components use colour tokens, not Tailwind palette colours', () => {
  const re = new RegExp(`\\b(?:${UTILITY})-(?:${PALETTE})(?:-\\d{2,3})?(?:\\/\\d+)?\\b`, 'g');
  assert.deepEqual(offenders(re), []);
});

test('components use colour tokens, not hex values in brackets', () => {
  assert.deepEqual(offenders(/\b(?:bg|text|border|ring|outline|fill|stroke|caret|shadow)-\[#[0-9a-fA-F]{3,8}\]/g), []);
});

test('icons come from the one Phosphor module, never from Lucide', () => {
  assert.deepEqual(offenders(/from ['"]lucide-react['"]/g), []);
  const direct = CODE.filter(s => s.file !== 'components/icons.jsx' && /from ['"]@phosphor-icons\/react/.test(s.text));
  assert.deepEqual(direct.map(s => s.file), []);
});

test('no font from the exclusion list or the old dashboard is loaded', () => {
  const re = /DM Sans|Space Mono|\bSyne\b|\bInter\b|JetBrains Mono|@fontsource\/(?:dm-sans|syne|space-mono)/g;
  assert.deepEqual(offenders(re, SOURCES), []);
});

test('the dashboard package no longer depends on Lucide, Radix Dialog or DropdownMenu', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../web/package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']) {
    assert.ok(!(name in deps), `${name} is still a dependency`);
  }
});
