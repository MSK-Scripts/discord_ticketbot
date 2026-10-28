/**
 * Contrast of the dashboard's design tokens against WCAG 2.2 AA, in both themes.
 *
 * Reads the values straight from web/src/index.css, so the test checks the real
 * tokens and not a copy that drifts apart. Every pair below is a combination
 * that is actually rendered: text (4.5:1) or a control border, focus ring or
 * sign (3:1) on the surface it sits on. The coverage test fails when a colour
 * token has no pair at all, so a new token cannot ship untested; only the
 * hairline and the decorative stripe are exempt.
 *
 * The contrast maths is written out here on purpose instead of importing
 * web/src/accent.js: a mistake there must not be able to hide itself.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '../web/src/index.css'), 'utf8');

/** The declarations of the first rule whose selector is exactly `selector`. */
function block(selector) {
  const start = CSS.search(new RegExp(`^${selector.replace(/[.[\]]/g, '\\$&')} \\{`, 'm'));
  assert.ok(start > -1, `rule ${selector} not found in index.css`);
  return CSS.slice(start, CSS.indexOf('\n}', start));
}

/** --name: #rrggbb pairs of a block, plain values only. */
function hexTokens(selector) {
  const out = {};
  for (const m of block(selector).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
}

const channels = (hex) => hex.replace('#', '').match(/../g).map(x => parseInt(x, 16));
const linear = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function luminance(hex) {
  const [r, g, b] = channels(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** sRGB mix, `color-mix(in srgb, a p%, b)`. */
function mix(a, b, p) {
  const A = channels(a), B = channels(b);
  return '#' + A.map((v, i) => Math.round(v * p + B[i] * (1 - p)).toString(16).padStart(2, '0')).join('');
}

// A ref is a token name, a literal #rrggbb, or { mix: [ref, ref, p] }.
const tint = (color, over, p) => ({ mix: [color, over, p] });
function resolveRef(t, ref) {
  if (typeof ref !== 'string') {
    const [a, b, p] = ref.mix;
    const [x, y] = [resolveRef(t, a), resolveRef(t, b)];
    return x && y ? mix(x, y, p) : undefined;
  }
  return ref.startsWith('#') ? ref : t[ref];
}
const names = (ref) => (typeof ref !== 'string'
  ? [...names(ref.mix[0]), ...names(ref.mix[1])]
  : ref.startsWith('#') ? [] : [ref]);

const STATUS = ['success', 'warning', 'danger', 'info'];
const LOGS = ['log-text', 'log-dim', 'log-error', 'log-warn', 'log-ok', 'log-info', 'log-blue', 'log-magenta'];
const CODE = ['code-comment', 'code-key', 'code-string', 'code-number', 'code-keyword', 'code-punc'];

const PAIRS = [
  // Ground, tile, card and the soft accent surface.
  ['Text on the ground', 'foreground', 'background', 4.5],
  ['Text on the tile', 'foreground', 'muted', 4.5],
  ['Text on a card', 'card-foreground', 'card', 4.5],
  ['Text on the soft accent surface', 'foreground', 'accent-soft', 4.5],
  ['Muted text on the ground', 'muted-foreground', 'background', 4.5],
  ['Muted text on the tile', 'muted-foreground', 'muted', 4.5],
  ['Muted text on a card', 'muted-foreground', 'card', 4.5],
  ['Muted text on the soft accent surface', 'muted-foreground', 'accent-soft', 4.5],
  // Hovered table rows mix the tile into the card.
  ['Muted text on a hovered row', 'muted-foreground', tint('muted', 'card', 0.6), 4.5],

  // The accent as a fill with its label, at rest and on hover.
  ['Label on the primary fill', 'primary-foreground', 'primary', 4.5],
  ['Label on the hovered primary fill', 'primary-foreground', 'primary-hover', 4.5],
  // The accent as text and sign: links, active menu item, check marks.
  ['Accent text on the ground', 'primary-text', 'background', 4.5],
  ['Accent text on the tile', 'primary-text', 'muted', 4.5],
  ['Accent text on a card', 'primary-text', 'card', 4.5],
  ['Accent text on the soft accent surface', 'primary-text', 'accent-soft', 4.5],

  ['Label on the secondary button', 'secondary-foreground', 'secondary', 4.5],
  ['Label on the hovered secondary button', 'secondary-foreground', 'muted', 4.5],

  // Controls (WCAG 1.4.11): field borders, the switch track and the focus ring.
  ['Control border on a card', 'input', 'card', 3],
  ['Control border on the ground', 'input', 'background', 3],
  ['Focus ring on the ground', 'ring', 'background', 3],
  ['Focus ring on a card', 'ring', 'card', 3],
  ['Focus ring on the tile', 'ring', 'muted', 3],

  // Status colours: word, sign and bar on the ground, a card, the tile (Notice)
  // and their own 10 % tint (StatusBadge uses 8 %, the stricter case is 10 %).
  ...STATUS.flatMap(s => [
    [`Status ${s} on the ground`, s, 'background', 4.5],
    [`Status ${s} on a card`, s, 'card', 4.5],
    [`Status ${s} on the tile`, s, 'muted', 4.5],
    [`Status ${s} on its tint over a card`, s, tint(s, 'card', 0.1), 4.5],
    [`Status ${s} on its tint over the ground`, s, tint(s, 'background', 0.1), 4.5],
  ]),
  ['Label on the destructive button', 'danger-foreground', 'danger', 4.5],

  // The file editor sits on a card.
  ...CODE.map(c => [`Editor ${c} on a card`, c, 'card', 4.5]),

  // The bot console is dark in both themes.
  ...LOGS.map(l => [`Console ${l}`, l, 'console', 4.5]),
];

/** Tokens that never carry or sit under text: the hairline and the stripe. */
const EXEMPT = ['border', 'brand'];

const light = hexTokens(':root');
const dark = { ...light, ...hexTokens('.dark') };

for (const [theme, t] of [['light', light], ['dark', dark]]) {
  for (const [label, fg, bg, need] of PAIRS) {
    test(`${theme} theme: ${label} reaches ${need}:1`, () => {
      const a = resolveRef(t, fg);
      const b = resolveRef(t, bg);
      assert.ok(a, `token ${JSON.stringify(fg)} missing`);
      assert.ok(b, `token ${JSON.stringify(bg)} missing`);
      const ratio = contrast(a, b);
      assert.ok(ratio >= need, `${a} on ${b} is ${ratio.toFixed(2)}:1, needs ${need}:1`);
    });
  }
}

test('every colour token of index.css is in at least one pair', () => {
  const covered = new Set(PAIRS.flatMap(([, fg, bg]) => [...names(fg), ...names(bg)]));
  const missing = Object.keys(light).filter(n => !covered.has(n) && !EXEMPT.includes(n));
  assert.deepEqual(missing, []);
});

test('every token a pair names exists in both themes', () => {
  const named = new Set(PAIRS.flatMap(([, fg, bg]) => [...names(fg), ...names(bg)]));
  assert.deepEqual([...named].filter(n => !(n in light)), []);
  assert.deepEqual([...named].filter(n => !(n in dark)), []);
});

test('the dark block only overrides tokens the light block defines', () => {
  const extra = Object.keys(hexTokens('.dark')).filter(n => !(n in light));
  assert.deepEqual(extra, []);
});

test('the accent preview scopes repeat the tokens of their theme', () => {
  for (const [scope, t] of [['.accent-preview-light', light], ['.accent-preview-dark', dark]]) {
    const body = block(scope);
    let seen = 0;
    // Plain values and the fallbacks of var(--accent-…, #hex) alike.
    for (const m of body.matchAll(/--([a-z-]+):\s*(?:var\(--[a-z-]+,\s*)?(#[0-9a-fA-F]{6})/g)) {
      const [, name, hex] = m;
      if (name === 'ring') {
        assert.equal(hex.toLowerCase(), t['primary-text'], `${scope} --ring`);
      } else {
        assert.equal(hex.toLowerCase(), t[name], `${scope} --${name}`);
      }
      seen++;
    }
    assert.ok(seen >= 9, `${scope}: only ${seen} values found`);
  }
});

test('the calculation knows the known extremes', () => {
  assert.ok(Math.abs(contrast('#000000', '#ffffff') - 21) < 1e-9);
  assert.ok(Math.abs(contrast('#ffffff', '#ffffff') - 1) < 1e-9);
  assert.equal(contrast('#27762e', '#ffffff'), contrast('#ffffff', '#27762e'));
});
