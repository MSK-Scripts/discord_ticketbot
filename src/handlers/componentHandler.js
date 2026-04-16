const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.resolve(__dirname, '../components');

/**
 * Load all component handlers (buttons, modals, menus).
 * Each file exports: { customId, execute } where customId can be a string prefix.
 * @param {import('../client').TicketClient} client
 */
async function loadComponents(client) {
  const files = getFiles(COMPONENTS_DIR, '.js');

  for (const file of files) {
    try {
      const component = require(file);
      if (!component?.customId || !component?.execute) {
        client.logger.warn(`[Components] Skipping ${path.basename(file)}: missing customId or execute.`);
        continue;
      }
      client.components.set(component.customId, component);
      client.logger.info(`[Components] Loaded: ${component.customId}`);
    } catch (err) {
      client.logger.error(`[Components] Failed to load ${file}:`, err);
    }
  }
}

function getFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

module.exports = { loadComponents };
