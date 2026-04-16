const { updateLastActivity } = require('../database');

module.exports = {
  name: 'messageCreate',

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Track last activity for auto-close
    const ticket = client.db
      ? require('../database').getTicketByChannel(message.channelId)
      : null;

    if (ticket && ticket.status === 'open') {
      try {
        updateLastActivity(message.channelId);
      } catch { /* ignore */ }
    }
  },
};
