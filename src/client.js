const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands }    = require('./handlers/commandHandler');
const { loadEvents }      = require('./handlers/eventHandler');
const { loadComponents }  = require('./handlers/componentHandler');
const { initDatabase, getTicketByChannel } = require('./database');
const { loadConfig, inspectConfig } = require('./config');
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

async function printApiKeyStatus(client) {
  const reset = '\x1b[0m';
  const gray  = '\x1b[90m';
  process.stdout.write(`${gray}Checking API Key...${reset} `);

  const { status, tier, limits } = await checkApiKey();

  // Kept on the client so the close flow can size the attachment upload to the
  // tier instead of a fixed budget. Read once at startup: the tier changes with
  // a subscription, not during a run, and a restart follows an upgrade anyway
  // (the hosted dashboard restarts the bot, a self-hoster does it by hand).
  client.tier       = status === 'valid' ? tier : 'basic';
  client.tierLimits = status === 'valid' ? limits : null;

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

    /** @type {string[]} Config fields still to be filled in. Non-empty means the
     *  bot is up but the ticket flow is closed — see start() and
     *  events/interactionCreate.js. */
    this.configPending = [];
  }

  async start() {
    printBanner();
    console.log('\x1b[0m');

    // Check for updates
    await checkVersion();

    // Check API Key status before connecting
    await printApiKeyStatus(this);
    console.log('\x1b[0m');

    const reset = '\x1b[0m';
    const gray  = '\x1b[90m';
    process.stdout.write(`${gray}Connecting to Discord...${reset}\n`);
    console.log('\x1b[0m');

    // Load & validate config
    this.config = loadConfig();
    const { fatal, pending } = inspectConfig(this.config);

    if (fatal.length > 0) {
      this.logger.error('Config validation failed:');
      fatal.forEach(e => this.logger.error(`  - ${e}`));
      process.exit(1);
    }

    // An unfinished config is not a reason to refuse the boot. The bot comes up,
    // the dashboard becomes reachable, and the operator fills in the ids there —
    // for a hosted install that is the ONLY repair path, because the editor is
    // part of the very dashboard a dead bot would not be serving.
    //
    // What it is a reason for: keeping the ticket flow shut until it is done.
    // interactionCreate reads this list and answers instead of letting an
    // interaction reach discord.js with a placeholder in its hands.
    this.configPending = pending;
    if (pending.length > 0) {
      this.logger.warn('Configuration is not finished yet — the ticket flow stays closed:');
      pending.forEach(e => this.logger.warn(`  - ${e}`));
      this.logger.warn('Open the dashboard and fill these in, the bot restarts itself afterwards.');
    }

    // Tell the supervisor, which is what /api/bot/status reports and therefore
    // what msk-shop sees when it checks whether an installation came up. Without
    // this a half-configured bot is indistinguishable from a finished one.
    process.send?.({ type: 'config-state', pending });

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
   * The ticketTypes entry for a ticket row, or null (unknown or removed type).
   * @param {object|null} ticket
   * @returns {object|null}
   */
  ticketTypeOf(ticket) {
    if (!ticket) return null;
    return (this.config.ticketTypes ?? []).find(t => t.codeName === ticket.type) ?? null;
  }

  /**
   * Check if a member is staff for a ticket type.
   *
   * The most specific roles win: a type with its own staffRoles is handled by
   * those roles only (they override rolesWhoHaveAccessToTheTickets), which is
   * exactly who openTicket() and performMove() give access to the channel.
   * Without a type, or for a type without staffRoles, the global roles apply.
   *
   * @param {import('discord.js').GuildMember} member
   * @param {object|null} ticketType  Optional ticket type config entry
   * @returns {boolean}
   */
  isStaff(member, ticketType = null) {
    if (!member) return false;
    if (member.permissions.has('Administrator')) return true;

    const roles = (ticketType?.staffRoles?.length > 0)
      ? ticketType.staffRoles
      : (this.config.rolesWhoHaveAccessToTheTickets ?? []);
    return roles.some(roleId => member.roles.cache.has(roleId));
  }

  /**
   * Staff of ANY kind: the global staff roles or any ticket type's staffRoles.
   * For actions not tied to one ticket (stats, broadcast, rating comments).
   * @param {import('discord.js').GuildMember} member
   * @returns {boolean}
   */
  isAnyStaff(member) {
    if (this.isStaff(member)) return true;
    return (this.config.ticketTypes ?? []).some(type => this.isStaff(member, type));
  }

  /**
   * Staff check for an interaction in a channel: type-aware inside a ticket
   * channel, "any staff" elsewhere (the command then rejects non-ticket
   * channels on its own).
   * @param {import('discord.js').GuildMember} member
   * @param {string} channelId
   * @returns {Promise<boolean>}
   */
  async isStaffIn(member, channelId) {
    const ticket = channelId ? await getTicketByChannel(channelId) : null;
    return ticket ? this.isStaff(member, this.ticketTypeOf(ticket)) : this.isAnyStaff(member);
  }
}

module.exports = { TicketClient };
