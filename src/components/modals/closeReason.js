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

    await interaction.deferUpdate().catch(() =>
      interaction.deferReply({ flags: MessageFlags.Ephemeral })
    );

    await performClose(client, interaction.channel, ticket, interaction.user, reason);
  },
};
