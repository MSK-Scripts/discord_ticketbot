const fs = require('fs');
const path = require('path');

// __dirname = <project>/src  →  ../config = <project>/config  ✓
const CONFIG_PATH  = path.resolve(__dirname, '../config/config.jsonc');
const EXAMPLE_PATH = path.resolve(__dirname, '../config/config.example.jsonc');

/**
 * Strips single-line (//) and multi-line (/* ... *\/) comments from a JSONC
 * string, then removes trailing commas before } and ] so the result is valid
 * JSON that JSON.parse() can consume.
 *
 * Handles edge-cases:
 *  - Preserves content inside strings (including "https://..." URLs)
 *  - Handles escaped quotes (\")
 *  - Removes trailing commas left by the last item in objects/arrays
 *
 * IMPORTANT — position-preserving: comments and trailing commas are replaced
 * with blanks (spaces), never deleted, and newlines inside block comments are
 * kept. The returned string therefore has the EXACT same length and line layout
 * as the source file, so a JSON.parse() error offset maps 1:1 to the line/column
 * the user actually sees in config.jsonc (see describeParseError()).
 *
 * @param {string} text  Raw JSONC source
 * @returns {string}     Valid JSON string (same length/lines as input)
 */
function stripJsonComments(text) {
  let result   = '';
  let i        = 0;
  let inString = false;

  while (i < text.length) {
    const ch = text[i];

    // ── Inside a string literal ─────────────────────────────────────────────
    if (inString) {
      if (ch === '\\') {
        // Escaped character — copy both chars and skip
        result += ch + (text[i + 1] ?? '');
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      result += ch;
      i++;
      continue;
    }

    // ── Start of a string literal ───────────────────────────────────────────
    if (ch === '"') {
      inString = true;
      result += ch;
      i++;
      continue;
    }

    // ── Single-line comment (//) — blank out, keep length, stop at newline ───
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') {
        result += ' ';
        i++;
      }
      continue;
    }

    // ── Multi-line comment (/* ... */) — blank out, preserve newlines/length ─
    if (ch === '/' && text[i + 1] === '*') {
      result += '  ';
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) {
        result += text[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < text.length) {   // consume the closing */
        result += '  ';
        i += 2;
      }
      continue;
    }

    result += ch;
    i++;
  }

  // ── Neutralize trailing commas before } or ] ───────────────────────────────
  // e.g.  { "a": 1, }  →  { "a": 1  }   (comma → space, so positions stay aligned)
  //        [ "x",  ]   →  [ "x"   ]
  result = result.replace(/,(\s*[}\]])/g, ' $1');

  return result;
}

/**
 * Build a human-friendly, multi-line description of a JSON.parse() failure,
 * pointing at the exact line/column in the source with a caret (^).
 *
 * @param {string} source  The (position-preserving) stripped JSON string
 * @param {Error}  err     The error thrown by JSON.parse
 * @returns {string[]}     Lines ready to print
 */
function describeParseError(source, err) {
  const match = /at position (\d+)/i.exec(err.message);
  if (!match) {
    // Position not available — fall back to the raw engine message.
    return [`[Config] Failed to parse config.jsonc: ${err.message}`];
  }

  const pos    = Math.min(Number(match[1]), source.length - 1);
  const before = source.slice(0, pos);
  const line   = before.split('\n').length;
  const col    = pos - before.lastIndexOf('\n');   // 1-based column

  const lines  = source.split('\n');
  const gutter = n => `  ${String(n).padStart(4)} │ `;
  const out    = [];

  out.push(`[Config] Syntax error in config.jsonc at line ${line}, column ${col}.`);
  out.push('');
  if (line > 1)            out.push(gutter(line - 1) + lines[line - 2]);
  out.push(gutter(line) + (lines[line - 1] ?? ''));
  out.push(' '.repeat(gutter(line).length + col - 1) + '^');
  if (line < lines.length) out.push(gutter(line + 1) + lines[line]);

  return out;
}

/**
 * Load and parse the JSONC config file.
 * If config.jsonc does not exist it is created from config.example.jsonc and
 * returned as-is; the caller sorts the placeholders it contains via
 * inspectConfig() and boots with the ticket flow closed.
 * @returns {object}
 */
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    if (fs.existsSync(EXAMPLE_PATH)) {
      fs.copyFileSync(EXAMPLE_PATH, CONFIG_PATH);
      // Deliberately NOT exiting here. The freshly copied example is all
      // placeholders, so inspectConfig() reports it as `pending` and the bot
      // comes up with its ticket flow closed — which is the state the operator
      // can actually repair from, because the config editor lives in the bot's
      // own dashboard. Exiting instead (as this did until 09.09.2026) also burnt
      // one of the supervisor's five restart attempts on a first start that was
      // never going to succeed.
      console.warn('[Config] config.jsonc not found — created from example. Fill in your IDs to open the ticket flow.');
    } else {
      console.error('[Config] config.jsonc not found and no example available. Exiting.');
      process.exit(1);
    }
  }

  const raw      = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const stripped = stripJsonComments(raw);
  try {
    return JSON.parse(stripped);
  } catch (err) {
    console.error('');
    describeParseError(stripped, err).forEach(l => console.error(l));
    console.error('');
    console.error('[Config] Most common causes:');
    console.error('[Config]   • a missing comma between two entries');
    console.error('[Config]   • one comma too many (e.g. after the last entry)');
    console.error('[Config]   • an unclosed "quote" or a missing { } / [ ] bracket');
    console.error('[Config] Fix the spot marked with ^ above, then restart the bot.');
    process.exit(1);
  }
}

/**
 * Sort every configuration problem into the two buckets that decide whether the
 * bot is allowed to boot.
 *
 *   fatal    the config is broken — the bot refuses to start
 *   pending  the config is merely unfinished — the bot starts, but the ticket
 *            flow stays closed (see events/interactionCreate.js)
 *
 * The split exists because a fresh install has NO config.jsonc: loadConfig()
 * writes one from the example, and that example is nothing but placeholders.
 * Treating those as fatal — as this did until 09.09.2026 — means a brand new
 * install can never come up, and for a hosted bot that is a dead end: the editor
 * the operator is supposed to fix the file in lives in the bot's own dashboard,
 * which only exists while the bot is installed and running.
 *
 * The line between the buckets is what breaks if we carry on regardless. A
 * missing key or a wrong TYPE takes out unpredictable code paths; an ID that is
 * simply not filled in yet only breaks the ticket flow, and that flow is gated
 * on `pending` anyway.
 *
 * @param {object} config
 * @returns {{ fatal: string[], pending: string[] }}
 */
function inspectConfig(config) {
  const fatal   = [];
  const pending = [];

  const required = [
    ['openTicketChannelId',           'string'],
    ['ticketTypes',                   'array' ],
    ['rolesWhoHaveAccessToTheTickets','array' ],
    ['closeOption',                   'object'],
    ['mainColor',                     'string'],
  ];

  for (const [key, type] of required) {
    const val        = config[key];
    const actualType = Array.isArray(val) ? 'array' : typeof val;
    if (val === undefined || val === null) {
      fatal.push(`Missing required field: "${key}"`);
    } else if (actualType !== type) {
      fatal.push(`Field "${key}" must be a ${type}, got ${actualType}`);
    } else if (type === 'string' && val.trim() === '') {
      // Present but blank is the shape of an unfinished field, not a broken one.
      pending.push(`Field "${key}" is empty — please set a value.`);
    }
  }

  // mainColor must be a hex color (#rgb or #rrggbb) — otherwise EmbedBuilder
  // throws at runtime when sending the first embed. Fatal rather than pending
  // because it breaks EVERY embed the bot sends, not only the ticket flow.
  if (typeof config.mainColor === 'string' && config.mainColor.trim() !== ''
      && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(config.mainColor.trim())) {
    fatal.push(`Field "mainColor" must be a hex color like "#2ee676", got "${config.mainColor}".`);
  }

  // ── Discord IDs must actually be Discord IDs ────────────────────────────────
  // Without this, the example placeholders ("ROLE_ID_TEAM", "CHANNEL_ID_HERE")
  // sail straight through: the bot starts happily and then dies on the FIRST
  // ticket with a cryptic discord.js error ("Supplied parameter is not a cached
  // User or Role"), which tells the operator nothing about what to fix.
  //
  // These are all `pending`: naming the field is the point, and the ticket flow
  // is closed until they are filled in, so the cryptic error can no longer
  // happen. A typo'd id lands here too — from the outside it is indistinguishable
  // from a field nobody has got round to yet.
  const SNOWFLAKE = /^\d{17,20}$/;
  const isPlaceholder = (v) => typeof v === 'string' && /_HERE$|^ROLE_ID|^CHANNEL_ID|^CATEGORY_ID/.test(v);

  const checkId = (value, field) => {
    if (value === undefined || value === null || value === '') return; // optional/empty is fine
    if (SNOWFLAKE.test(String(value))) return;
    pending.push(
      isPlaceholder(value)
        ? `Field "${field}" is still the example placeholder ("${value}"). Replace it with a real Discord ID.`
        : `Field "${field}" is not a valid Discord ID: "${value}" (expected 17–20 digits).`,
    );
  };
  const checkIdList = (list, field) => {
    if (!Array.isArray(list)) return;
    list.forEach((v, i) => checkId(v, `${field}[${i}]`));
  };

  checkId(config.openTicketChannelId, 'openTicketChannelId');
  if (config.logs)                 checkId(config.logsChannelId, 'logsChannelId');
  if (config.ratingSystem?.enabled) checkId(config.ratingSystem.ratingsChannelId, 'ratingSystem.ratingsChannelId');
  checkId(config.claimOption?.categoryWhenClaimed, 'claimOption.categoryWhenClaimed');
  checkId(config.closeOption?.closeTicketCategoryId, 'closeOption.closeTicketCategoryId');

  checkIdList(config.rolesWhoHaveAccessToTheTickets, 'rolesWhoHaveAccessToTheTickets');
  checkIdList(config.rolesWhoCanNotCreateTickets, 'rolesWhoCanNotCreateTickets');
  if (config.pingRoleWhenOpened) checkIdList(config.roleToPingWhenOpenedId, 'roleToPingWhenOpenedId');

  if (Array.isArray(config.ticketTypes)) {
    config.ticketTypes.forEach((t, i) => {
      checkId(t?.categoryId, `ticketTypes[${i}].categoryId`);
      checkIdList(t?.staffRoles, `ticketTypes[${i}].staffRoles`);
      checkIdList(t?.cantAccess, `ticketTypes[${i}].cantAccess`);
    });
  }

  if (Array.isArray(config.ticketTypes)) {
    if (config.ticketTypes.length === 0) {
      fatal.push('ticketTypes must contain at least one entry.');
    }
    if (config.ticketTypes.length > 25) {
      fatal.push('ticketTypes cannot have more than 25 entries (Discord limit).');
    }
    config.ticketTypes.forEach((t, i) => {
      if (!t.codeName)   fatal.push(`ticketTypes[${i}] is missing "codeName".`);
      if (!t.name)       fatal.push(`ticketTypes[${i}] is missing "name".`);
      if (!t.categoryId) pending.push(`ticketTypes[${i}] is missing "categoryId".`);
      if (t.staffRoles !== undefined && !Array.isArray(t.staffRoles)) {
        fatal.push(`ticketTypes[${i}].staffRoles must be an array.`);
      }
    });
  }

  // Without these the bot cannot even reach Discord, so there is nothing to keep
  // running for.
  if (!process.env.TOKEN)     fatal.push('Environment variable TOKEN is not set.');
  if (!process.env.CLIENT_ID) fatal.push('Environment variable CLIENT_ID is not set.');
  if (!process.env.GUILD_ID)  fatal.push('Environment variable GUILD_ID is not set.');

  return { fatal, pending };
}

/**
 * Every configuration problem, fatal and pending in one list.
 *
 * Kept as-is for the dashboard, which validates an edited config.jsonc before
 * saving it: there the operator must see everything that is still wrong, not
 * only what would stop the bot from booting.
 *
 * @param {object} config
 * @returns {string[]} Array of error messages (empty = valid)
 */
function validateConfig(config) {
  const { fatal, pending } = inspectConfig(config);
  return [...fatal, ...pending];
}

// stripJsonComments is exported so the dashboard can validate an edited
// config.jsonc with exactly the same parser the bot boots with — a file the
// dashboard accepts must never be one the bot then refuses to start on.
module.exports = { loadConfig, inspectConfig, validateConfig, stripJsonComments, describeParseError };
