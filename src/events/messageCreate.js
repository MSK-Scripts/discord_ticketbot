const { updateLastActivity, getTicketByChannel, setLastNotifySent } = require('../database');

const NOTIFY_COOLDOWN_MS = 30 * 60_000; // 30 minutes between DM pings per ticket

module.exports = {
  name: 'messageCreate',

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Track last activity for auto-close
    const ticket = client.db
      ? await getTicketByChannel(message.channelId)
      : null;

    if (ticket && ticket.status === 'open') {
      try {
        await updateLastActivity(message.channelId);
      } catch { /* ignore */ }

      // Ticket is active again → clear any auto-close warning flag so a future
      // inactivity cycle triggers a fresh warning (see ready.js runAutoClose).
      client.autoCloseWarned?.delete(message.channelId);

      // ── DM notification: alert creator when staff replies ────────────────────
      if (
        ticket.notify_on_reply &&
        message.author.id !== ticket.creator_id
      ) {
        try {
          const member = await message.guild.members.fetch(message.author.id).catch(() => null);
          if (member && client.isStaff(member)) {
            const now = Date.now();
            if (!ticket.last_notify_sent || now - ticket.last_notify_sent > NOTIFY_COOLDOWN_MS) {
              const creator = await message.guild.members.fetch(ticket.creator_id).catch(() => null);
              if (creator) {
                const link = `https://discord.com/channels/${message.guildId}/${ticket.channel_id}`;
                await creator.user.send({
                  embeds: [{
                    title: client.t('messages.staffReplyTitle'),
                    description: client.t('messages.staffReplyBody', { type: ticket.type, link }),
                    color: 0x5865f2,
                    timestamp: new Date().toISOString(),
                  }],
                }).catch(() => null);
                await setLastNotifySent(ticket.channel_id);
              }
            }
          }
        } catch { /* ignore — don't let notification errors break activity tracking */ }
      }
    }
  },
};
