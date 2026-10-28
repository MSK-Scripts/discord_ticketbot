/**
 * The customer accent colour in both themes (web/src/accent.js).
 *
 * A server owner can save any hex colour as the dashboard's accent. Whatever
 * they pick, every place the accent shows up must still reach WCAG 2.2 AA in
 * the light and in the dark theme: the label on the accent fill, the accent as
 * text and border on every surface, the focus ring, and the text on the soft
 * accent surface. Where the colour itself cannot, a darker or lighter variant
 * takes over for that role. These are rules, so they are tested over a wide
 * spread of colours, including the awkward ones (yellow, white, black, mid grey,
 * pure red, navy).
 *
 * The contrast maths is repeated here instead of imported, so a mistake in
 * accent.js cannot hide itself.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const accentModule = () => import(pathToFileURL(path.join(__dirname, '../web/src/accent.js')).href);
const CSS = fs.readFileSync(path.join(__dirname, '../web/src/index.css'), 'utf8');

const rgb = (hex) => hex.replace('#', '').match(/../g).map(x => parseInt(x, 16));
const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const [r, g, b] = rgb(hex); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// Colours a server owner might plausibly pick, plus the extremes.
const NAMED = [
  '#27762e', '#6dbb3d', '#5eb131', '#5865f2', '#ff0000', '#e91e63', '#ffd400', '#ffeb3b',
  '#00e676', '#00bcd4', '#ff9800', '#9c27b0', '#102a54', '#001f3f', '#808080', '#777777',
  '#ffffff', '#000000', '#f6f6f4', '#18191b', '#abc', '#0f0', '#f0f',
];
// Plus a coarse grid over the whole RGB cube, so no region is left out.
const GRID = [];
for (const r of [0, 64, 128, 192, 255]) {
  for (const g of [0, 64, 128, 192, 255]) {
    for (const b of [0, 96, 192, 255]) {
      GRID.push(`#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`);
    }
  }
}
const ACCENTS = [...NAMED, ...GRID];

test('every accent reaches AA in every role, in both themes', async () => {
  const { deriveAccent, SURFACES } = await accentModule();
  const failures = [];
  for (const theme of ['light', 'dark']) {
    const s = SURFACES[theme];
    for (const accent of ACCENTS) {
      const a = deriveAccent(accent, theme);
      const check = (label, fg, bg, need) => {
        const r = ratio(fg, bg);
        if (r < need) failures.push(`${theme} ${accent}: ${label} ${fg} on ${bg} = ${r.toFixed(2)}`);
      };
      check('label on fill', a.primaryForeground, a.primary, 4.5);
      check('label on hovered fill', a.primaryForeground, a.primaryHover, 4.5);
      for (const [name, surface] of [['ground', s.background], ['card', s.card], ['tile', s.muted], ['soft', a.accentSoft]]) {
        check(`accent text on ${name}`, a.primaryText, surface, 4.5);
        // The focus ring is the text variant; 3:1 is its own bar.
        check(`focus ring on ${name}`, a.primaryText, surface, 3);
      }
      check('text on soft surface', s.foreground, a.accentSoft, 4.5);
      check('muted text on soft surface', s.mutedForeground, a.accentSoft, 4.5);
    }
  }
  assert.deepEqual(failures, []);
});

test('a variant stays as close to the chosen colour as AA allows', async () => {
  const { deriveAccent, SURFACES } = await accentModule();
  const tooFar = [];
  for (const theme of ['light', 'dark']) {
    const s = SURFACES[theme];
    for (const accent of ACCENTS) {
      const a = deriveAccent(accent, theme);
      if (!a.adjusted.text) continue;
      // Lightness moves in 1 % steps toward the target of 4.6:1, so a variant
      // that lands far above it jumped further from the customer's colour
      // than needed (straight to black or white, say).
      const worst = Math.min(...[s.background, s.card, s.muted, a.accentSoft].map(x => ratio(a.primaryText, x)));
      if (worst > 5.3) tooFar.push(`${theme} ${accent} -> ${a.primaryText} (${worst.toFixed(2)})`);
    }
  }
  assert.deepEqual(tooFar, []);
});

test('a colour that already passes is used as it is', async () => {
  const { deriveAccent } = await accentModule();
  const light = deriveAccent('#27762E', 'light');
  assert.equal(light.primary, '#27762e');
  assert.equal(light.primaryText, '#27762e');
  assert.equal(light.primaryForeground, '#ffffff');
  assert.deepEqual(light.adjusted, { fill: false, text: false });

  const dark = deriveAccent('#6dbb3d', 'dark');
  assert.equal(dark.primary, '#6dbb3d');
  assert.equal(dark.primaryText, '#6dbb3d');
  assert.equal(dark.primaryForeground, '#0e150e');
});

test('the label is chosen by WCAG contrast, not by YIQ brightness', async () => {
  const { readableForeground } = await accentModule();
  // Pure red: YIQ brightness 76 says white, but white reaches only 4.0:1 on it
  // and the dark label 5.0:1.
  assert.equal(readableForeground('#ff0000'), '#0e150e');
  assert.ok(ratio('#ffffff', '#ff0000') < 4.5);
  // Clear cases stay clear.
  assert.equal(readableForeground('#102a54'), '#ffffff');
  assert.equal(readableForeground('#ffd400'), '#0e150e');
});

test('a bright accent keeps its fill and gets a darker text variant in the light theme', async () => {
  const { deriveAccent } = await accentModule();
  const a = deriveAccent('#ffd400', 'light');
  assert.equal(a.primary, '#ffd400', 'the yellow button stays yellow');
  assert.equal(a.primaryForeground, '#0e150e');
  assert.ok(a.adjusted.text && !a.adjusted.fill);
  assert.ok(lum(a.primaryText) < lum('#ffd400'), 'text variant is darker');
  // Same hue family: mixed toward black, so red stays above blue.
  const [r, , b] = rgb(a.primaryText);
  assert.ok(r > b);
});

test('a dark accent gets a lighter text variant in the dark theme', async () => {
  const { deriveAccent } = await accentModule();
  const a = deriveAccent('#102a54', 'dark');
  assert.equal(a.primary, '#102a54', 'the navy button stays navy');
  assert.equal(a.primaryForeground, '#ffffff');
  assert.ok(a.adjusted.text);
  assert.ok(lum(a.primaryText) > lum('#102a54'), 'text variant is lighter');
  const [r, , b] = rgb(a.primaryText);
  assert.ok(b > r, 'still blue');
});

test('a fill no label can read moves away from the label', async () => {
  const { deriveAccent } = await accentModule();
  // Mid grey: white 3.95:1, the near-black label 4.4:1. Neither passes.
  const a = deriveAccent('#777777', 'light');
  assert.ok(a.adjusted.fill);
  assert.ok(ratio(a.primaryForeground, a.primary) >= 4.5);
});

test('anything that is not a hex colour gives no accent', async () => {
  const { deriveAccent, accentProperties } = await accentModule();
  for (const bad of [null, undefined, '', 'red', '5eb131', '#12345', '#gggggg', 42]) {
    assert.equal(deriveAccent(bad, 'light'), null);
    assert.equal(accentProperties(bad), null);
  }
});

test('the measured surfaces are the theme tokens of index.css', async () => {
  const { SURFACES } = await accentModule();
  const token = (selector, name) => {
    const start = CSS.search(new RegExp(`^${selector.replace('.', '\\.')} \\{`, 'm'));
    const body = CSS.slice(start, CSS.indexOf('\n}', start));
    return body.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1].toLowerCase();
  };
  const NAMES = { background: 'background', card: 'card', muted: 'muted', foreground: 'foreground', mutedForeground: 'muted-foreground' };
  for (const [theme, selector] of [['light', ':root'], ['dark', '.dark']]) {
    for (const [key, name] of Object.entries(NAMES)) {
      assert.equal(SURFACES[theme][key], token(selector, name), `${theme} ${name}`);
    }
  }
  assert.equal(token('.dark', 'primary-foreground'), '#0e150e', 'the dark label is the shop\'s');
});

test('every property the accent writes is read by index.css, per theme', async () => {
  const { accentProperties, ACCENT_PROPERTIES } = await accentModule();
  const props = accentProperties('#5865f2');
  assert.deepEqual(Object.keys(props).sort(), [...ACCENT_PROPERTIES].sort());
  for (const name of ACCENT_PROPERTIES) {
    assert.ok(CSS.includes(`var(${name})`), `index.css never reads ${name}`);
  }
  // The ring follows the text variant, not the raw fill.
  assert.match(CSS, /:root\[data-accent\] \{[^}]*--ring: var\(--accent-light-primary-text\)/);
  assert.match(CSS, /\.dark\[data-accent\] \{[^}]*--ring: var\(--accent-dark-primary-text\)/);
});
