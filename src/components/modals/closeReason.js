const { MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../../database');
const { performClose } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_modalClose',

  async execute(client, interaction) {
    const reason = interaction.fields.getTextInputValue('close_reason') || null;

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }

    // Acknowledge the modal and show warning — performClose will disable all
    // buttons as its very first step, so no further interactions are possible.
    await interaction.reply({
      content: '⏳ **Das Ticket wird geschlossen.** Bitte warte einen Moment, das Transcript wird erstellt...',
      flags: MessageFlags.Ephemeral,
    });

    await performClose(client, interaction.channel, ticket, interaction.user, reason);
  },
};
