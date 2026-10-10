const fs = require('fs');
const path = require('path');

const EVENTS_DIR = path.resolve(__dirname, '../events');

/**
 * Load all event files and register them on the client.
 * @param {import('../client').TicketClient} client
 */
async function loadEvents(client) {
  if (!fs.existsSync(EVENTS_DIR)) return;

  for (const file of fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith('.js'))) {
    try {
      const event = require(path.join(EVENTS_DIR, file));
      if (!event?.name || !event?.execute) {
        client.logger.warn(`[Events] Skipping ${file}: missing name or execute.`);
        continue;
      }

      // discord.js does not await listeners, so a rejected execute() would be an
      // unhandled rejection — which terminates the process on Node 24. A failing
      // event (e.g. a DB outage during messageCreate) must cost one event, not the bot.
      const handler = async (...args) => {
        try {
          await event.execute(client, ...args);
        } catch (err) {
          client.logger.error(`[Events] ${event.name} handler failed:`, err);
        }
      };
      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }

      client.logger.info(`[Events] Registered: ${event.name}`);
    } catch (err) {
      client.logger.error(`[Events] Failed to load ${file}:`, err);
    }
  }
}

module.exports = { loadEvents };
