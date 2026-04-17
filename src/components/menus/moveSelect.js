/**
 * Select Menu: tb_moveSelect
 * Handles the actual move after staff selected a target ticket type.
 */
const { MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../../database');
const { performMove } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_moveSelect',

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    const newTypeCode = interaction.values[0];
    const newType     = client.config.ticketTypes.find(t => t.codeName === newTypeCode);

    if (!newType) {
      return interaction.reply({ content: '❌ Unbekannter Ticket-Typ.', flags: MessageFlags.Ephemeral });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.type === newTypeCode) {
      return interaction.reply({ content: '❌ Das Ticket ist bereits in diesem Typ.', flags: MessageFlags.Ephemeral });
    }

    // Guarantee non-null channel — interaction.channel can be null for select-menu
    // submissions if the channel is not in the cache, causing performMove to crash.
    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: '❌ Kanal nicht gefunden.', flags: MessageFlags.Ephemeral });
    }

    // Acknowledge the selection and remove the select-menu
    await interaction.update({ content: `⏳ Verschiebe zu **${newType.name}**...`, components: [] });

    await performMove(client, channel, ticket, newType, interaction.user);

    await interaction.editReply({ content: `✅ Ticket wurde zu **${newType.name}** verschoben.` });
  },
};
