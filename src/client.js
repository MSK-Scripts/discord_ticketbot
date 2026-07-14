const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands }    = require('./handlers/commandHandler');
const { loadEvents }      = require('./handlers/eventHandler');
const { loadComponents }  = require('./handlers/componentHandler');
const { initDatabase }    = require('./database');
const { loadConfig, validateConfig } = require('./config');
const { checkApiKey }     = require('./utils/mskApi');
const { checkVersion }    = require('./utils/versionCheck');
const logger = require('./utils/logger');

// ── Startup Banner ────────────────────────────────────────────────────────────

const TIER_COLORS = {
  basic:        '\x1b[90m',   // gray
  premium:      '\x1b[38;2;94;177;49m',  // green (accent)
  premium_plus: '\x1b[38;2;157;101;254m', // purple
};

const TIER_LABELS = {
  basic:        'Basic',
  premium:      'Premium',
  premium_plus: 'Premium+',
};

function printBanner() {
  const reset = '\x1b[0m';
  console.log('');
  // MSK – centered above TICKET BOT (24 spaces padding)
  console.log('\x1b[38;2;140;225;60m                        ███╗   ███╗███████╗██╗  ██╗');
  console.log('\x1b[38;2;125;210;50m                        ████╗ ████║██╔════╝██║ ██╔╝');
  console.log('\x1b[38;2;110;200;42m                        ██╔████╔██║███████╗█████╔╝ ');
  console.log('\x1b[38;2;97;188;35m                        ██║╚██╔╝██║╚════██║██╔═██╗ ');
  console.log('\x1b[38;2;83;175;28m                        ██║ ╚═╝ ██║███████║██║  ██╗');
  console.log('\x1b[38;2;70;163;22m                        ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝');
  // TICKET BOT
  console.log('\x1b[38;2;58;152;17m████████╗██╗ ██████╗██╗  ██╗███████╗████████╗    ██████╗  ██████╗ ████████╗');
  console.log('\x1b[38;2;48;142;13m╚══██╔══╝██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝    ██╔══██╗██╔═══██╗╚══██╔══╝');
  console.log('\x1b[38;2;40;132;10m   ██║   ██║██║     █████╔╝ █████╗     ██║       ██████╔╝██║   ██║   ██║   ');
  console.log('\x1b[38;2;33;122;8m   ██║   ██║██║     ██╔═██╗ ██╔══╝     ██║       ██╔══██╗██║   ██║   ██║   ');
  console.log('\x1b[38;2;27;121;6m   ██║   ██║╚██████╗██║  ██╗███████╗   ██║       ██████╔╝╚██████╔╝   ██║   ');
  console.log('\x1b[38;2;25;120;5m   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝       ╚═════╝  ╚═════╝    ╚═╝' + reset);
  console.log(`\x1b[90m                 https://github.com/MSK-Scripts/discord_ticketbot${reset}`);
  console.log('');
}

async function printApiKeyStatus() {
  const reset = '\x1b[0m';
  const gray  = '\x1b[90m';
  process.stdout.write(`${gray}Checking API Key...${reset} `);

  const { status, tier } = await checkApiKey();

  if (status === 'not_configured') {
    console.log(`\x1b[90mNo API key configured → Basic${reset}`);
  } else if (status === 'invalid') {
    console.log(`\x1b[31mInvalid API key → Basic${reset}`);
  } else if (status === 'unreachable') {
    console.log(`\x1b[33mMSK server unreachable → Basic${reset}`);
  } else {
    const color = TIER_COLORS[tier] ?? '\x1b[32m';
    const label = TIER_LABELS[tier] ?? tier;
    console.log(`${color}API key valid → ${label}${reset}`);
  }
}

class TicketClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],

      // Global mention policy — the safety net for every outgoing message.
      //
      // 'users' + 'roles' stay enabled because the bot legitimately pings staff
      // roles (ticket open ping, staff reminder). 'everyone' is deliberately
      // absent, so neither a snippet, a broadcast, nor any future user-supplied
      // text can ever trigger an @everyone/@here ping — not even if a call site
      // forgets to pass allowedMentions.
      //
      // Untrusted, user-generated content (e.g. dashboard replies) must ADDITIONALLY
      // pass a per-message zero-ping override:
      //   { parse: [], roles: [], users: [], repliedUser: false }
      // Filtering the string for "@everyone" is NOT enough — role (<@&id>) and
      // user (<@id>) mentions bypass any such text filter.
      allowedMentions: { parse: ['users', 'roles'] },
    });

    /** @type {Collection<string, object>} Slash commands */
    this.commands = new Collection();

    /** @type {Collection<string, object>} Button / modal / menu handlers */
    this.components = new Collection();

    this.logger = logger;
    this.config = null;
    this.db     = null;
    this.locale = null;
  }

  async start() {
    printBanner();
    console.log('\x1b[0m');

    // Check for updates
    await checkVersion();

    // Check API Key status before connecting
    await printApiKeyStatus();
    console.log('\x1b[0m');

    const reset = '\x1b[0m';
    const gray  = '\x1b[90m';
    process.stdout.write(`${gray}Connecting to Discord...${reset}\n`);
    console.log('\x1b[0m');

    // Load & validate config
    this.config = loadConfig();
    const configErrors = validateConfig(this.config);
    if (configErrors.length > 0) {
      this.logger.error('Config validation failed:');
      configErrors.forEach(e => this.logger.error(`  - ${e}`));
      process.exit(1);
    }

    // Load locale — __dirname is src/, so ../locales/ is correct
    const localePath = `../locales/${this.config.lang}.json`;
    try {
      this.locale = require(localePath);
    } catch {
      this.logger.warn(`Locale "${this.config.lang}" not found, falling back to "en".`);
      this.locale = require('../locales/en.json');
    }

    // Configure logger visibility
    this.logger.configure({ showLog: this.config.showLog ?? true });

    // Init database (SQLite by default; MySQL/MariaDB/PostgreSQL via DATABASE_URL)
    this.db = await initDatabase();
    this.logger.info('Database initialized.');

    // Load handlers
    await loadCommands(this);
    await loadEvents(this);
    await loadComponents(this);

    // Login
    await this.login(process.env.TOKEN);
  }

  /**
   * Translate a locale key with variable substitution.
   * @param {string} keyPath  Dot-separated path, e.g. "messages.ticketCreated"
   * @param {object} vars     Variables to replace, e.g. { channel: '#ticket-1' }
   * @returns {string}
   */
  t(keyPath, vars = {}) {
    const keys = keyPath.split('.');
    let value  = this.locale;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return keyPath;
    }
    if (typeof value !== 'string') return keyPath;
    return Object.entries(vars).reduce(
      (str, [k, v]) => str.replaceAll(`{${k}}`, v),
      value
    );
  }

  /**
   * Check if a member has staff access.
   * Optionally checks against a ticket type's specific staffRoles.
   *
   * @param {import('discord.js').GuildMember} member
   * @param {object|null} ticketType  Optional ticket type config entry
   * @returns {boolean}
   */
  isStaff(member, ticketType = null) {
    if (!member) return false;
    if (member.permissions.has('Administrator')) return true;

    // If the ticket type has its own staffRoles, check those first
    if (ticketType?.staffRoles?.length > 0) {
      if (ticketType.staffRoles.some(roleId => member.roles.cache.has(roleId))) return true;
    }

    // Fall back to global staff roles
    const globalRoles = this.config.rolesWhoHaveAccessToTheTickets ?? [];
    return globalRoles.some(roleId => member.roles.cache.has(roleId));
  }
}

module.exports = { TicketClient };
