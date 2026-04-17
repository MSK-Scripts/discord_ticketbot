/**
 * Button: tb_unclaim
 * Releases the claim on the ticket — shown in place of the Claim button
 * once the ticket has been claimed.
 */
const { MessageFlags } = require('discord.js');
const { getTicketByChannel, unclaimTicket } = require('../../database');
const { updateChannelTopic, refreshTicketButtons } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_unclaim',

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }
    if (!ticket.claimed_by) {
      return interaction.reply({ content: '❌ Dieses Ticket ist nicht beansprucht.', flags: MessageFlags.Ephemeral });
    }

    unclaimTicket(interaction.channelId);

    await interaction.reply(
      client.t('messages.ticketUnclaimed', { user: `<@${interaction.user.id}>` })
    );

    // Guarantee non-null channel for topic + button updates
    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (channel) {
      await updateChannelTopic(channel, ticket, { claimedBy: null }, client);
      await refreshTicketButtons(channel, false, client);
    }
  },
};
