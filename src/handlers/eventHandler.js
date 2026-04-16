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

      const handler = (...args) => event.execute(client, ...args);
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
