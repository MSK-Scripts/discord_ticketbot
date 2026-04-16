/**
 * Select Menu: tb_moveSelect
 * Handles the actual move after staff selected a target ticket type.
 */
const { getTicketByChannel } = require('../../database');
const { performMove } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_moveSelect',

  async execute(client, interaction) {
    // Double-check staff permission (select menu can arrive independently)
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const newTypeCode = interaction.values[0];
    const newType     = client.config.ticketTypes.find(t => t.codeName === newTypeCode);

    if (!newType) {
      return interaction.reply({ content: '❌ Unbekannter Ticket-Typ.', ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), ephemeral: true });
    }
    if (ticket.type === newTypeCode) {
      return interaction.reply({ content: '❌ Das Ticket ist bereits in diesem Typ.', ephemeral: true });
    }

    // Acknowledge the selection first
    await interaction.update({ content: `⏳ Verschiebe zu **${newType.name}**...`, components: [] });

    await performMove(client, interaction.channel, ticket, newType, interaction.user);

    await interaction.editReply({ content: `✅ Ticket wurde zu **${newType.name}** verschoben.` });
  },
};
