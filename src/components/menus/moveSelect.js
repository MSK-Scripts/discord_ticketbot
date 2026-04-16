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

    await interaction.update({ content: `⏳ Verschiebe zu **${newType.name}**...`, components: [] });
    await performMove(client, interaction.channel, ticket, newType, interaction.user);
    await interaction.editReply({ content: `✅ Ticket wurde zu **${newType.name}** verschoben.` });
  },
};
