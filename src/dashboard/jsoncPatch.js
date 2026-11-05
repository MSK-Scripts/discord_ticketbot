/**
 * Replace one string value inside a JSONC document without touching anything
 * else: comments, key order, indentation and every other value stay
 * byte-for-byte the same.
 *
 * The config editor in the browser does the same with jsonc-parser; the server
 * side has no such dependency and needs exactly one operation, so this walks the
 * document itself. It runs on the output of stripJsonComments, which blanks
 * comments out with spaces and keeps every offset, so a position found in the
 * stripped text is the same position in the original.
 */

const { stripJsonComments } = require('../config');

/**
 * Offsets [start, end) of the string literal at `target` in a comment-free
 * JSON text, or null when the path does not exist or is not a string. With
 * duplicate keys the last one wins, as in JSON.parse.
 * @param {string} json
 * @param {string[]} target
 * @returns {{start: number, end: number}|null}
 */
function locateString(json, target) {
  let i = 0;
  let found = null;

  const ws = () => { while (i < json.length && /\s/.test(json[i])) i++; };

  const readString = () => {
    const start = i;
    i++; // opening quote
    while (i < json.length) {
      if (json[i] === '\\') { i += 2; continue; }
      if (json[i] === '"') { i++; return { start, end: i }; }
      i++;
    }
    throw new Error('Unterminated string.');
  };

  const isPrefix = (path) => path.length <= target.length && path.every((k, idx) => k === target[idx]);

  const value = (path) => {
    ws();
    const ch = json[i];
    // Last key wins, as in JSON.parse: a later non-string value at the target
    // cancels an earlier string.
    if (path && path.length === target.length && ch !== '"') found = null;
    if (ch === '{') {
      i++;
      ws();
      if (json[i] === '}') { i++; return; }
      for (;;) {
        ws();
        const keySpan = readString();
        const key = JSON.parse(json.slice(keySpan.start, keySpan.end));
        ws();
        i++; // colon
        // Only the branch towards the target needs its offsets; the rest is
        // walked (path null) to keep the cursor right.
        const childPath = path ? [...path, key] : null;
        value(childPath && isPrefix(childPath) ? childPath : null);
        ws();
        if (json[i] === ',') { i++; continue; }
        i++; // closing brace
        return;
      }
    }
    if (ch === '[') {
      i++;
      ws();
      if (json[i] === ']') { i++; return; }
      for (;;) {
        value(null);
        ws();
        if (json[i] === ',') { i++; continue; }
        i++; // closing bracket
        return;
      }
    }
    if (ch === '"') {
      const span = readString();
      if (path && path.length === target.length) found = span;
      return;
    }
    // number, true, false, null
    while (i < json.length && !/[\s,}\]]/.test(json[i])) i++;
  };

  value([]);
  return found;
}

/**
 * Set the string at `path` in a JSONC document.
 * @param {string} text the original document (comments included)
 * @param {string[]} path e.g. ['panel', 'logo', 'file']
 * @param {string} newValue
 * @returns {{ok: true, text: string, previous: string}|{ok: false, reason: 'syntax'|'missing'}}
 */
function setJsoncString(text, path, newValue) {
  const stripped = stripJsonComments(text);
  try {
    JSON.parse(stripped);
  } catch {
    return { ok: false, reason: 'syntax' };
  }

  const span = locateString(stripped, path);
  if (!span) return { ok: false, reason: 'missing' };

  const previous = JSON.parse(stripped.slice(span.start, span.end));
  const next = text.slice(0, span.start) + JSON.stringify(newValue) + text.slice(span.end);

  // Belt and braces: the patched document must parse and carry the new value.
  let check;
  try {
    check = JSON.parse(stripJsonComments(next));
  } catch {
    return { ok: false, reason: 'syntax' };
  }
  const actual = path.reduce((node, key) => (node == null ? undefined : node[key]), check);
  if (actual !== newValue) return { ok: false, reason: 'missing' };

  return { ok: true, text: next, previous };
}

module.exports = { setJsoncString, locateString };
