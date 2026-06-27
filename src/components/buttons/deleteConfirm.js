const { MessageFlags } = require('discord.js');
const { getTicketByChannel }     = require('../../database');
const { captureFinalTranscript } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_deleteConfirm',

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ content: client.t('messages.deletingChannel'), flags: MessageFlags.Ephemeral }).catch(() => null);

    // If the ticket was reopened and is being deleted WITHOUT a second close,
    // capture a final transcript first — otherwise the messages added after the
    // reopen would be lost (the close-time transcript would be stale). A ticket
    // that is already 'closed' has a complete transcript, so we skip it.
    try {
      const ticket = await getTicketByChannel(interaction.channelId);
      if (ticket && ticket.status === 'open') {
        await captureFinalTranscript(client, interaction.channel, ticket, interaction.user);
      }
    } catch (err) {
      client.logger.error('[Delete] Pre-delete transcript capture failed:', err);
    }

    try {
      await interaction.channel.delete(client.t('messages.deleteReason', { user: interaction.user.tag }));
      client.logger.info(`[Delete] Channel ${interaction.channelId} deleted by ${interaction.user.tag}`);
    } catch (err) {
      client.logger.error('[Delete] Failed to delete channel:', err);
    }
  },
};
