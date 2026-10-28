/**
 * cn() must keep a text colour next to one of our own font sizes.
 *
 * tailwind-merge takes any `text-*` it does not know for a colour. Without the
 * font sizes of index.css registered, `text-control` replaced
 * `text-danger-foreground` and the buttons lost their label colour. The list
 * in web/src/lib/utils.js is checked against index.css, so a new size cannot
 * slip past it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const utils = () => import(pathToFileURL(path.join(__dirname, '../web/src/lib/utils.js')).href);
const css = fs.readFileSync(path.join(__dirname, '../web/src/index.css'), 'utf8');

const cssSizes = [...new Set(
  [...css.matchAll(/--text-([a-z0-9]+):/g)].map((m) => m[1]),
)].sort();

test('every font size token of index.css is registered with tailwind-merge', async () => {
  const { FONT_SIZES } = await utils();
  assert.ok(cssSizes.length > 0, 'no --text-* tokens found in index.css');
  assert.deepEqual([...FONT_SIZES].sort(), cssSizes);
});

test('a text colour survives next to each of our font sizes', async () => {
  const { cn } = await utils();
  for (const size of cssSizes) {
    for (const colour of ['text-danger-foreground', 'text-primary-foreground', 'text-foreground']) {
      const merged = cn(colour, `text-${size}`).split(' ');
      assert.ok(merged.includes(colour), `${colour} dropped next to text-${size}`);
      assert.ok(merged.includes(`text-${size}`), `text-${size} dropped next to ${colour}`);
    }
  }
});

test('two of our font sizes still replace each other', async () => {
  const { cn } = await utils();
  assert.equal(cn('text-small', 'text-control'), 'text-control');
});
