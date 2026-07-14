// Semantic validation mirrored from the bot (src/config.js → validateConfig()),
// so a form/file save can never write a config that makes the bot exit(1) on the
// next restart. `error`-severity issues highlight fields and block Save; warnings
// are shown but do not block. The server re-validates on save as a hard backstop.
//
// IMPORTANT: when src/config.js changes its rules, update this mirror too.

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Enum whitelists — violations are warnings, since the bot itself does not exit
// on these and we must not be stricter than the bot and block a valid save.
const ENUMS = {
  priority:        ['low', 'medium', 'high', 'urgent'],
  interactionType: ['BUTTON', 'SELECT_MENU'],
  whoCanClose:     ['EVERYONE', 'STAFFONLY'],
  whoCanReopen:    ['EVERYONE', 'STAFFONLY'],
  statusType:      ['PLAYING', 'WATCHING', 'LISTENING', 'STREAMING', 'COMPETING'],
  statusPresence:  ['online', 'idle', 'dnd', 'invisible'],
  questionStyle:   ['SHORT', 'PARAGRAPH'],
};

const err = (message, path) => ({ severity: 'error', message, path });
const warn = (message, path) => ({ severity: 'warn', message, path });

function enumWarn(value, allowed, path, field) {
  if (value === undefined || value === null || value === '') return null;
  if (isStr(value) && allowed.includes(value)) return null;
  return warn(`"${field}" should be one of: ${allowed.join(', ')}.`, path);
}

/** Validate a parsed config.jsonc model. Returns all issues (errors + warnings). */
export function validateBotConfig(model) {
  const issues = [];
  if (!isObj(model)) return [err('Configuration must be a JSON object.')];

  const required = [
    ['openTicketChannelId', 'string'],
    ['ticketTypes', 'array'],
    ['rolesWhoHaveAccessToTheTickets', 'array'],
    ['closeOption', 'object'],
    ['mainColor', 'string'],
  ];
  for (const [key, type] of required) {
    const val = model[key];
    const actual = Array.isArray(val) ? 'array' : val === null ? 'null' : typeof val;
    if (val === undefined || val === null) {
      issues.push(err(`Missing required field: "${key}".`, [key]));
    } else if (actual !== type) {
      issues.push(err(`Field "${key}" must be a ${type}, got ${actual}.`, [key]));
    } else if (type === 'string' && val.trim() === '') {
      issues.push(err(`Field "${key}" is empty — please set a value.`, [key]));
    }
  }

  const mainColor = model.mainColor;
  if (isStr(mainColor) && mainColor.trim() !== '' && !HEX_RE.test(mainColor.trim())) {
    issues.push(err(`"mainColor" must be a hex color like "#2ee676", got "${mainColor}".`, ['mainColor']));
  }

  const types = model.ticketTypes;
  if (Array.isArray(types)) {
    if (types.length === 0) issues.push(err('ticketTypes must contain at least one entry.', ['ticketTypes']));
    if (types.length > 25) issues.push(err('ticketTypes cannot have more than 25 entries (Discord limit).', ['ticketTypes']));
    types.forEach((t, i) => {
      const tt = isObj(t) ? t : {};
      if (!tt.codeName)   issues.push(err(`ticketTypes[${i}] is missing "codeName".`,   ['ticketTypes', i, 'codeName']));
      if (!tt.name)       issues.push(err(`ticketTypes[${i}] is missing "name".`,       ['ticketTypes', i, 'name']));
      if (!tt.categoryId) issues.push(err(`ticketTypes[${i}] is missing "categoryId".`, ['ticketTypes', i, 'categoryId']));
      if (tt.staffRoles !== undefined && !Array.isArray(tt.staffRoles)) {
        issues.push(err(`ticketTypes[${i}].staffRoles must be an array.`, ['ticketTypes', i, 'staffRoles']));
      }
      const es = enumWarn(tt.priority, ENUMS.priority, ['ticketTypes', i, 'priority'], `ticketTypes[${i}].priority`);
      if (es) issues.push(es);
      if (Array.isArray(tt.questions)) {
        tt.questions.forEach((q, qi) => {
          const qq = isObj(q) ? q : {};
          const qs = enumWarn(qq.style, ENUMS.questionStyle, ['ticketTypes', i, 'questions', qi, 'style'], 'question style');
          if (qs) issues.push(qs);
        });
      }
    });
  }

  const panel = isObj(model.panel) ? model.panel : {};
  const it = enumWarn(panel.interactionType, ENUMS.interactionType, ['panel', 'interactionType'], 'panel.interactionType');
  if (it) issues.push(it);

  const closeOption = isObj(model.closeOption) ? model.closeOption : {};
  const wc = enumWarn(closeOption.whoCanCloseTicket, ENUMS.whoCanClose, ['closeOption', 'whoCanCloseTicket'], 'closeOption.whoCanCloseTicket');
  if (wc) issues.push(wc);

  const reopenOption = isObj(model.reopenOption) ? model.reopenOption : {};
  const wr = enumWarn(reopenOption.whoCanReopen, ENUMS.whoCanReopen, ['reopenOption', 'whoCanReopen'], 'reopenOption.whoCanReopen');
  if (wr) issues.push(wr);

  const status = isObj(model.status) ? model.status : {};
  const st = enumWarn(status.type, ENUMS.statusType, ['status', 'type'], 'status.type');
  if (st) issues.push(st);
  const sp = enumWarn(status.status, ENUMS.statusPresence, ['status', 'status'], 'status.status');
  if (sp) issues.push(sp);

  return issues;
}

const PLACEHOLDER_RE = /^YOUR_.*_HERE$/;
const isUnset = (v) => !v || v.trim() === '' || PLACEHOLDER_RE.test(v.trim());

/** Validate .env values. All issues are warnings — never lock the user out of
 *  saving their .env, but surface missing credentials. */
export function validateBotEnv(env) {
  const issues = [];
  for (const key of ['TOKEN', 'CLIENT_ID', 'GUILD_ID']) {
    if (isUnset(env.get(key))) issues.push(warn(`${key} is not set — the bot will not start without it.`));
  }
  if (isUnset(env.get('MSK_API_KEY'))) {
    issues.push(warn('MSK_API_KEY is not set — transcripts will be sent as file attachments instead of links.'));
  }
  return issues;
}
