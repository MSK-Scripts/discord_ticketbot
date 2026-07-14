// Line-based read/patch of a .env file (client side).
//
// Like jsoncEdit, this never regenerates the file. parseEnv() gives the current
// values; setEnvValue() patches only the single KEY=… line (or appends it if
// missing). Comments, blank lines and unknown keys are preserved 1:1. This mirrors
// the bot-side src/dashboard/envFile.js so form edits and setup writes agree.

const KEY_LINE_RE = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

// CRLF handling is load-bearing, not cosmetic. Splitting on '\n' leaves a trailing
// '\r'; KEY_LINE_RE ends in `(.*)$`, and in JS `.` does not match '\r' while `$`
// does not match before it — so the regex FAILS on every line of a CRLF file, the
// patcher concludes the key is absent, and APPENDS a duplicate. Split on /\r?\n/.
const splitLines = (content) => content.split(/\r?\n/);
const detectEol = (content) => (content.includes('\r\n') ? '\r\n' : '\n');

/** Strip one layer of matching surrounding quotes from a raw .env value. */
function unquote(raw) {
  const t = raw.trim();
  if (t.length >= 2 && t[0] === '"' && t[t.length - 1] === '"') {
    return t.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (t.length >= 2 && t[0] === "'" && t[t.length - 1] === "'") {
    return t.slice(1, -1);
  }
  return t;
}

/** Parse a .env document into a Map of KEY → { value, line }. Comments/blanks ignored. */
export function parseEnv(content) {
  const map = new Map();
  splitLines(content).forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;
    const m = KEY_LINE_RE.exec(line);
    if (!m) return;
    map.set(m[2], { value: unquote(m[3]), line: i });
  });
  return map;
}

/** Set `key` to `value`, patching only the matching line (append if missing).
 *  Values are always written double-quoted; backslashes then quotes are escaped
 *  first so a trailing "\" can never escape the closing quote. */
export function setEnvValue(content, key, value) {
  const eol = detectEol(content);
  const lines = splitLines(content);
  const quoted = `${key}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

  for (let i = 0; i < lines.length; i++) {
    const m = KEY_LINE_RE.exec(lines[i]);
    if (m && m[2] === key) {
      lines[i] = `${m[1]}${quoted}`;
      return lines.join(eol);
    }
  }

  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines[lines.length - 1] = quoted;
    lines.push('');
  } else {
    lines.push(quoted);
  }
  return lines.join(eol);
}
