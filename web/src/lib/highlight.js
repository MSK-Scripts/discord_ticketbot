// Tiny, dependency-free syntax highlighter for the config file editor.
//
// It tokenizes JSONC / JSON / .env and returns an HTML string of <span class>
// tokens. SECURITY: every piece of the user's text is HTML-escaped before it is
// placed in the output; only our own fixed class names and span tags are added.
// So the result is safe to pass to dangerouslySetInnerHTML — no user input can
// become markup.

const ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ESCAPE[c]);

// One regex over the interesting JSONC tokens; everything else (whitespace) is
// emitted escaped and untouched between matches.
//
// No token here can contain a real newline: `//` comments stop at end of line and
// JSON strings cannot hold a literal newline. That is deliberate — the editor
// splits this output by "\n" into fixed-height line blocks, which only works if no
// <span> straddles a line break. (Block `/* */` comments are therefore not matched;
// they just render in the default colour, which config files never use anyway.)
const JSONC_RE =
  /\/\/[^\n]*|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b|[{}\[\],:]/g;

function highlightJsonc(code) {
  let out = '';
  let last = 0;
  let m;
  JSONC_RE.lastIndex = 0;
  while ((m = JSONC_RE.exec(code)) !== null) {
    out += esc(code.slice(last, m.index));
    const t = m[0];
    let cls;
    if (t.startsWith('//') || t.startsWith('/*')) cls = 'tok-comment';
    else if (t[0] === '"') {
      // A string immediately followed by ':' is an object key.
      cls = /^\s*:/.test(code.slice(JSONC_RE.lastIndex)) ? 'tok-key' : 'tok-string';
    } else if (t === 'true' || t === 'false' || t === 'null') cls = 'tok-keyword';
    else if (t[0] === '-' || (t[0] >= '0' && t[0] <= '9')) cls = 'tok-number';
    else cls = 'tok-punc';
    out += `<span class="${cls}">${esc(t)}</span>`;
    last = JSONC_RE.lastIndex;
  }
  out += esc(code.slice(last));
  return out;
}

const ENV_LINE_RE = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(=)(.*)$/;

function highlightEnv(code) {
  return code.split('\n').map((line) => {
    if (line.trimStart().startsWith('#')) return `<span class="tok-comment">${esc(line)}</span>`;
    const m = ENV_LINE_RE.exec(line);
    if (!m) return esc(line);
    return `${esc(m[1])}<span class="tok-key">${esc(m[2])}</span><span class="tok-punc">${esc(m[3])}</span><span class="tok-string">${esc(m[4])}</span>`;
  }).join('\n');
}

/** @param {'jsonc'|'json'|'env'} language */
export function highlight(code, language) {
  if (language === 'env') return highlightEnv(code);
  return highlightJsonc(code);
}
