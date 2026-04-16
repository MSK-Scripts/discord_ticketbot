/**
 * Modal: tb_modalClose
 * Submitted when the user fills in the close-reason modal.
 */
const { getTicketByChannel } = require('../../database');
const { performClose } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_modalClose',

  async execute(client, interaction) {
    const reason = interaction.fields.getTextInputValue('close_reason') || null;

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), ephemeral: true });
    }

    await interaction.deferUpdate().catch(() =>
      interaction.deferReply({ ephemeral: true })
    );

    await performClose(client, interaction.channel, ticket, interaction.user, reason);
  },
};
