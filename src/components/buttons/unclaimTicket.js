/**
 * Button: tb_unclaim
 */
const { MessageFlags } = require('discord.js');
const { getTicketByChannel, unclaimTicket } = require('../../database');
const { updateChannelTopic, refreshTicketMessage } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_unclaim',

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }
    if (!ticket.claimed_by) {
      return interaction.reply({ content: client.t('messages.notClaimed'), flags: MessageFlags.Ephemeral });
    }

    await unclaimTicket(interaction.channelId);

    // Reply immediately with rate-limit warning
    await interaction.reply(
      client.t('messages.ticketUnclaimed', { user: `<@${interaction.user.id}>` }) + client.t('messages.topicUpdateWarning')
    );

    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (channel) {
      updateChannelTopic(channel, ticket, { claimedBy: null }, client);
      await refreshTicketMessage(channel, false, ticket, { claimedBy: null }, client);
    }
  },
};
