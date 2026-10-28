/**
 * Minimal ANSI (SGR) parser for the live console.
 *
 * The bot colours its own output with ANSI escape codes. Dumping the raw string
 * into the DOM shows them as garbage ("[90m[36m…"), so we translate them into
 * styled spans rather than stripping them — the operator then sees exactly the
 * same colours as in the terminal, banner gradient included.
 *
 * Inline styles are used deliberately: the dashboard CSP allows
 * `style-src-attr 'unsafe-inline'` (React needs it anyway) while still forbidding
 * inline <style> blocks and inline scripts.
 */

// ESC (0x1B) followed by '[', the SGR parameters, and 'm'.
// Written as the \x1b escape on purpose: a LITERAL escape byte in the source is
// an invisible control character that an editor, linter or copy-paste can silently
// eat, which would break log colouring in a way that is very hard to spot.
// eslint-disable-next-line no-control-regex
const SGR = /\x1b\[([0-9;]*)m/g;

// 30–37 standard, 90–97 bright, mapped onto the console tokens of index.css.
// The console is dark in both themes and every token is checked against it
// (tests/dashboard-contrast.test.js), so a line stays readable whatever
// colour the bot asks for; black and bright black become the dimmed grey.
const COLORS = {
  30: 'var(--log-dim)', 31: 'var(--log-error)', 32: 'var(--log-ok)', 33: 'var(--log-warn)',
  34: 'var(--log-blue)', 35: 'var(--log-magenta)', 36: 'var(--log-info)', 37: 'var(--log-text)',
  90: 'var(--log-dim)', 91: 'var(--log-error)', 92: 'var(--log-ok)', 93: 'var(--log-warn)',
  94: 'var(--log-blue)', 95: 'var(--log-magenta)', 96: 'var(--log-info)', 97: 'var(--log-text)',
};

/**
 * Split one line into [{ text, style }] runs.
 * Style state resets per line, which matches how the bot emits its log lines.
 */
export function parseAnsi(line) {
  const runs = [];
  let style = {};
  let cursor = 0;
  let match;

  SGR.lastIndex = 0;
  while ((match = SGR.exec(line)) !== null) {
    if (match.index > cursor) {
      runs.push({ text: line.slice(cursor, match.index), style: { ...style } });
    }

    const codes = match[1].split(';').filter(s => s !== '').map(Number);
    if (codes.length === 0) style = {}; // a bare ESC[m is a reset

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) style = {};
      else if (code === 1) style.fontWeight = 700;
      else if (code === 2) style.opacity = 0.65;
      else if (code === 4) style.textDecoration = 'underline';
      else if (code === 38 && codes[i + 1] === 2) {
        // 38;2;r;g;b — 24-bit colour, used by the startup banner's gradient
        style.color = `rgb(${codes[i + 2] ?? 0}, ${codes[i + 3] ?? 0}, ${codes[i + 4] ?? 0})`;
        i += 4;
      } else if (COLORS[code]) {
        style.color = COLORS[code];
      }
    }

    cursor = SGR.lastIndex;
  }

  if (cursor < line.length) {
    runs.push({ text: line.slice(cursor), style: { ...style } });
  }
  return runs;
}

/** Strip every escape code — for when only the plain text is wanted. */
export const stripAnsi = (line) => String(line).replace(SGR, '');
