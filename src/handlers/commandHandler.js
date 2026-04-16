const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const COMMANDS_DIR = path.resolve(__dirname, '../commands');

/**
 * Recursively load all command files and register them with Discord.
 * @param {import('../client').TicketClient} client
 */
async function loadCommands(client) {
  const commandFiles = getFiles(COMMANDS_DIR, '.js');
  const commandData = [];

  for (const file of commandFiles) {
    try {
      const command = require(file);
      if (!command?.data || !command?.execute) {
        client.logger.warn(`[Commands] Skipping ${path.basename(file)}: missing data or execute.`);
        continue;
      }
      client.commands.set(command.data.name, command);
      commandData.push(command.data.toJSON());
      client.logger.info(`[Commands] Loaded: /${command.data.name}`);
    } catch (err) {
      client.logger.error(`[Commands] Failed to load ${file}:`, err);
    }
  }

  // Register slash commands with Discord via REST
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    client.logger.info(`[Commands] Registering ${commandData.length} slash command(s)...`);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandData }
    );
    client.logger.success('[Commands] Slash commands registered successfully.');
  } catch (err) {
    client.logger.error('[Commands] Failed to register slash commands:', err);
  }
}

/**
 * Recursively find all files with a given extension under a directory.
 * @param {string} dir
 * @param {string} ext
 * @returns {string[]}
 */
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

module.exports = { loadCommands };
