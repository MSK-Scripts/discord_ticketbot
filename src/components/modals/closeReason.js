/**
 * Modal: tb_modalClose
 * Submitted when the user fills in the close-reason modal.
 */
const { MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../../database');
const { performClose } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_modalClose',

  async execute(client, interaction) {
    const reason = interaction.fields.getTextInputValue('close_reason') || null;

    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }

    // interaction.channel can be null for modal submissions if the channel
    // is not cached — always fetch to guarantee a valid channel object.
    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: client.t('messages.channelNotFound'), flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({
      content: client.t('messages.closingTicket'),
      flags: MessageFlags.Ephemeral,
    });

    await performClose(client, channel, ticket, interaction.user, reason);
  },
};
