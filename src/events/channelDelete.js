const { closeOrphanedTicket } = require('../utils/ticketActions');

/**
 * A ticket channel deleted directly in Discord (not via the Delete button)
 * leaves its DB row "open". That row would count against the creator's
 * maxTicketOpened forever and be skipped silently by auto-close and the staff
 * reminder, so close it here.
 */
module.exports = {
  name: 'channelDelete',

  async execute(client, channel) {
    if (!client.db || !channel?.guild) return;
    await closeOrphanedTicket(client, channel.id);
  },
};
