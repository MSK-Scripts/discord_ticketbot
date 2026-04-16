const fs = require('fs');
const path = require('path');

// __dirname = <project>/src  →  ../config = <project>/config  ✓
const CONFIG_PATH   = path.resolve(__dirname, '../config/config.jsonc');
const EXAMPLE_PATH  = path.resolve(__dirname, '../config/config.example.jsonc');

/**
 * Strips single-line (//) and multi-line (/* ... *\/) comments from a JSONC string,
 * while preserving content inside strings (e.g. URLs containing "//").
 * @param {string} text
 * @returns {string}
 */
function stripJsonComments(text) {
  let result   = '';
  let i        = 0;
  let inString = false;

  while (i < text.length) {
    const ch = text[i];

    if (inString) {
      if (ch === '\\') {
        result += ch + text[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      result += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inString = true;
      result += ch;
      i++;
      continue;
    }

    // Single-line comment
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }

    // Multi-line comment
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Load and parse the JSONC config file.
 * If config.jsonc does not exist, it is created from config.example.jsonc.
 * @returns {object}
 */
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    if (fs.existsSync(EXAMPLE_PATH)) {
      fs.copyFileSync(EXAMPLE_PATH, CONFIG_PATH);
      console.warn('[Config] config.jsonc not found — created from example. Please fill in your IDs and restart.');
      process.exit(0);
    } else {
      console.error('[Config] config.jsonc not found and no example available. Exiting.');
      process.exit(1);
    }
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  try {
    return JSON.parse(stripJsonComments(raw));
  } catch (err) {
    console.error('[Config] Failed to parse config.jsonc:', err.message);
    process.exit(1);
  }
}

/**
 * Validate required config fields.
 * @param {object} config
 * @returns {string[]} Array of error messages (empty = valid)
 */
function validateConfig(config) {
  const errors = [];

  const required = [
    ['openTicketChannelId', 'string'],
    ['ticketTypes',         'array' ],
    ['rolesWhoHaveAccessToTheTickets', 'array'],
    ['closeOption',         'object'],
    ['mainColor',           'string'],
  ];

  for (const [key, type] of required) {
    const val        = config[key];
    const actualType = Array.isArray(val) ? 'array' : typeof val;
    if (val === undefined || val === null) {
      errors.push(`Missing required field: "${key}"`);
    } else if (actualType !== type) {
      errors.push(`Field "${key}" must be a ${type}, got ${actualType}`);
    }
  }

  if (Array.isArray(config.ticketTypes)) {
    if (config.ticketTypes.length === 0) {
      errors.push('ticketTypes must contain at least one entry.');
    }
    if (config.ticketTypes.length > 25) {
      errors.push('ticketTypes cannot have more than 25 entries (Discord limit).');
    }
    config.ticketTypes.forEach((t, i) => {
      if (!t.codeName)   errors.push(`ticketTypes[${i}] is missing "codeName".`);
      if (!t.name)       errors.push(`ticketTypes[${i}] is missing "name".`);
      if (!t.categoryId) errors.push(`ticketTypes[${i}] is missing "categoryId".`);

      // staffRoles must be an array if present
      if (t.staffRoles !== undefined && !Array.isArray(t.staffRoles)) {
        errors.push(`ticketTypes[${i}].staffRoles must be an array.`);
      }
    });
  }

  if (!process.env.TOKEN)     errors.push('Environment variable TOKEN is not set.');
  if (!process.env.CLIENT_ID) errors.push('Environment variable CLIENT_ID is not set.');
  if (!process.env.GUILD_ID)  errors.push('Environment variable GUILD_ID is not set.');

  return errors;
}

module.exports = { loadConfig, validateConfig };
