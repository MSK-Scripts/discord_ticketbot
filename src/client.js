const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { loadComponents } = require('./handlers/componentHandler');
const { initDatabase } = require('./database');
const { loadConfig, validateConfig } = require('./config');
const logger = require('./utils/logger');

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
    });

    /** @type {Collection<string, object>} Slash commands */
    this.commands = new Collection();

    /** @type {Collection<string, object>} Button / modal / menu handlers */
    this.components = new Collection();

    this.logger = logger;
    this.config = null;
    this.db = null;
    this.locale = null;
  }

  async start() {
    this.logger.info('Starting Discord Ticket Bot...');

    // Load & validate config
    this.config = loadConfig();
    const configErrors = validateConfig(this.config);
    if (configErrors.length > 0) {
      this.logger.error('Config validation failed:');
      configErrors.forEach(e => this.logger.error(`  - ${e}`));
      process.exit(1);
    }

    // Load locale
    const localePath = `../locales/${this.config.lang}.json`;
    try {
      this.locale = require(localePath);
    } catch {
      this.logger.warn(`Locale "${this.config.lang}" not found, falling back to "en".`);
      this.locale = require('../locales/en.json');
    }

    // Init database
    this.db = initDatabase();
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
    let value = this.locale;
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
   * @param {import('discord.js').GuildMember} member
   * @returns {boolean}
   */
  isStaff(member) {
    if (!member) return false;
    if (member.permissions.has('Administrator')) return true;
    const staffRoles = this.config.rolesWhoHaveAccessToTheTickets ?? [];
    return staffRoles.some(roleId => member.roles.cache.has(roleId));
  }
}

module.exports = { TicketClient };
