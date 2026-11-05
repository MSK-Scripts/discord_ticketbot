const { StringSelectMenuOptionBuilder } = require('discord.js');

/**
 * Select-menu option for a ticket type, shared by every type picker (panel,
 * open button, move). Discord rejects an empty option description, and the
 * dashboard creates new types with description '', so the description is
 * only set when the type has one. Before, such a type broke the whole menu.
 */
function typeOption(ticketType) {
  const option = new StringSelectMenuOptionBuilder()
    .setLabel(ticketType.name)
    .setValue(ticketType.codeName)
    .setEmoji(ticketType.emoji || '🎫');

  const description = ticketType.description?.trim().substring(0, 100);
  if (description) option.setDescription(description);

  return option;
}

module.exports = { typeOption };
