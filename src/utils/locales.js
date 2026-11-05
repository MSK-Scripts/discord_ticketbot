/**
 * Locale files and the customer layer on top of them.
 *
 * The shipped translations in locales/<lang>.json are tracked in git and are
 * never written by the bot or the dashboard. A customer's own wording lives in
 * locales/custom/<lang>.json (gitignored) and holds only the leaves that differ
 * from the shipped file. At runtime the custom file is deep-merged over the
 * shipped one, so an update can change the shipped file without ever touching
 * the customer's texts, and `git pull` never meets a locally modified file.
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const LOCALES_DIR = path.resolve(__dirname, '../../locales');
const CUSTOM_DIRNAME = 'custom';
const LOCALE_CODE_RE = /^[a-z0-9_-]+$/i;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// A key named "__proto__" in parsed JSON is an own property, but assigning it
// to a normal object would replace that object's prototype. Locale files never
// need these names, so they are skipped on both merge and diff. The results are
// collected in a Map and turned into an object with Object.fromEntries, which
// defines own properties: no key read from a file is ever used in an
// assignment, so none can reach the prototype chain.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

/**
 * Deep-merges `custom` over `base` and returns a new object. Nested objects are
 * merged key by key; a custom leaf (string, number, array, null, …) replaces the
 * base value; keys that only exist in `custom` are kept. Neither input is mutated.
 * @param {object} base
 * @param {object} custom
 * @returns {object}
 */
function mergeLocale(base, custom) {
  const out = new Map(isPlainObject(base) ? Object.entries(base) : []);
  if (isPlainObject(custom)) {
    for (const [key, value] of Object.entries(custom)) {
      if (UNSAFE_KEYS.has(key)) continue;
      const current = out.get(key);
      out.set(key, isPlainObject(value) && isPlainObject(current) ? mergeLocale(current, value) : value);
    }
  }
  return Object.fromEntries(out);
}

/**
 * Returns only the leaves of `edited` that differ from `base`: the smallest
 * object that mergeLocale(base, result) turns back into `edited` (apart from
 * keys deleted in `edited`, which an overlay cannot express and which therefore
 * keep their shipped value). An empty object means "no difference".
 * @param {object} base
 * @param {object} edited
 * @returns {object}
 */
function diffLocale(base, edited) {
  const out = new Map();
  if (!isPlainObject(edited)) return {};
  const baseEntries = new Map(isPlainObject(base) ? Object.entries(base) : []);
  for (const [key, value] of Object.entries(edited)) {
    if (UNSAFE_KEYS.has(key)) continue;
    const has = baseEntries.has(key);
    const baseValue = baseEntries.get(key);
    if (isPlainObject(value) && isPlainObject(baseValue)) {
      const sub = diffLocale(baseValue, value);
      if (Object.keys(sub).length > 0) out.set(key, sub);
    } else if (!has || !deepEqual(baseValue, value)) {
      out.set(key, value);
    }
  }
  return Object.fromEntries(out);
}

/** Serialises a locale object the way the shipped files are written. */
const formatLocale = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

/** Absolute path of the custom file for a locale FILE name (e.g. "de.json"). */
const customPathFor = (fileName, dir = LOCALES_DIR) => path.join(dir, CUSTOM_DIRNAME, fileName);

/**
 * Reads the customer layer for a locale file. A missing file is the normal case
 * and returns null quietly; an unreadable or invalid one is reported through
 * `warn` and also returns null, so a broken custom file can never take the bot
 * down. Only a JSON object counts as valid.
 * @param {string} file absolute path
 * @param {(msg: string) => void} [warn]
 * @returns {object|null}
 */
function readCustomFile(file, warn = (m) => logger.warn(m)) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') warn(`[Locale] Could not read ${file}: ${err.message}. Using the shipped texts.`);
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    if (!isPlainObject(parsed)) throw new Error('not a JSON object');
    return parsed;
  } catch (err) {
    warn(`[Locale] Ignoring ${file}: ${err.message}. Using the shipped texts.`);
    return null;
  }
}

/**
 * Loads a locale by code: the shipped locales/<code>.json with
 * locales/custom/<code>.json merged on top. Throws when the SHIPPED file is
 * missing or invalid (callers fall back to another language, as before); a
 * missing or invalid custom file only logs a warning.
 * @param {string} code e.g. "de"
 * @param {{ dir?: string, warn?: (msg: string) => void }} [options]
 * @returns {object}
 */
function loadLocale(code, { dir = LOCALES_DIR, warn } = {}) {
  if (typeof code !== 'string' || !LOCALE_CODE_RE.test(code)) {
    throw new Error(`Invalid locale code: ${code}`);
  }
  const fileName = `${code}.json`;
  const shipped = requireFresh(path.join(dir, fileName));
  const custom = requireCustomFile(customPathFor(fileName, dir), warn);
  return custom ? mergeLocale(shipped, custom) : shipped;
}

// The bot loads its locales through require(), as it did before the customer
// layer existed. The cache entry is dropped first, so an edit saved in the
// dashboard is picked up on the next load instead of after a restart. The
// dashboard editor below reads with fs, since it needs the raw text.
function requireFresh(file) {
  const resolved = require.resolve(file);
  delete require.cache[resolved];
  return require(resolved);
}

function requireCustomFile(file, warn = (m) => logger.warn(m)) {
  let parsed;
  try {
    parsed = requireFresh(file);
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') warn(`[Locale] Ignoring ${file}: ${err.message}. Using the shipped texts.`);
    return null;
  }
  if (!isPlainObject(parsed)) {
    warn(`[Locale] Ignoring ${file}: not a JSON object. Using the shipped texts.`);
    return null;
  }
  return parsed;
}

// ── Dashboard editor helpers ─────────────────────────────────────────────────
// The dashboard resolves the file NAME against the real directory listing first
// (routes.js) and passes in the matched entry, so every path below is built from
// a readdir entry, never from request input.

/**
 * What the editor shows: the shipped file merged with the customer layer, and
 * whether a customer layer exists. Without a custom file the shipped text is
 * returned byte for byte.
 * @param {string} dir locales directory
 * @param {string} fileName matched directory entry, e.g. "de.json"
 * @returns {{ content: string, customized: boolean }}
 */
function readLocaleForEditor(dir, fileName) {
  const shippedText = fs.readFileSync(path.join(dir, fileName), 'utf-8');
  const customFile = customPathFor(fileName, dir);
  if (readIfExists(customFile) === null) return { content: shippedText, customized: false };
  const custom = readCustomFile(customFile);
  if (!custom) return { content: shippedText, customized: true };
  return { content: formatLocale(mergeLocale(JSON.parse(shippedText), custom)), customized: true };
}

/**
 * Stores an edited locale as a customer layer: only the leaves that differ from
 * the shipped file are written to custom/<fileName>. When nothing differs the
 * custom file is removed, so the locale is back to the shipped texts. The
 * previous custom file is kept as custom/<fileName>.bak.
 * @param {string} dir locales directory
 * @param {string} fileName matched directory entry
 * @param {object} edited parsed JSON object from the editor
 * @returns {{ customized: boolean }}
 */
function saveLocaleEdit(dir, fileName, edited) {
  const shipped = JSON.parse(fs.readFileSync(path.join(dir, fileName), 'utf-8'));
  const diff = diffLocale(shipped, edited);
  const customFile = customPathFor(fileName, dir);

  const previous = readIfExists(customFile);
  if (previous !== null) fs.writeFileSync(`${customFile}.bak`, previous, 'utf-8');

  if (Object.keys(diff).length === 0) {
    fs.rmSync(customFile, { force: true });
    return { customized: false };
  }
  fs.mkdirSync(path.dirname(customFile), { recursive: true });
  fs.writeFileSync(customFile, formatLocale(diff), 'utf-8');
  return { customized: true };
}

/**
 * Drops the customer layer of a locale (back to the shipped texts). The removed
 * file is kept as custom/<fileName>.bak.
 * @returns {{ removed: boolean }}
 */
function resetLocale(dir, fileName) {
  const customFile = customPathFor(fileName, dir);
  const previous = readIfExists(customFile);
  if (previous === null) return { removed: false };
  fs.writeFileSync(`${customFile}.bak`, previous, 'utf-8');
  fs.rmSync(customFile, { force: true });
  return { removed: true };
}

module.exports = {
  LOCALES_DIR,
  CUSTOM_DIRNAME,
  isPlainObject,
  deepEqual,
  mergeLocale,
  diffLocale,
  formatLocale,
  customPathFor,
  readCustomFile,
  loadLocale,
  readLocaleForEditor,
  saveLocaleEdit,
  resetLocale,
};
