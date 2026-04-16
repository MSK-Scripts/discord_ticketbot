const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
} = require('discord.js');
const { getTicketByChannel } = require('../../database');
const { performClose } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_close',

  async execute(client, interaction) {
    const ticket = getTicketByChannel(interaction.channelId);

    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }

    const cfg = client.config.closeOption ?? {};

    if (cfg.whoCanCloseTicket === 'STAFFONLY' && !client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    // Show reason modal if configured — the modal submit handler will show the warning
    if (cfg.askReason) {
      const modal = new ModalBuilder()
        .setCustomId('tb_modalClose')
        .setTitle(client.t('modals.closeReason.title'));

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('close_reason')
            .setLabel(client.t('modals.closeReason.label'))
            .setPlaceholder(client.t('modals.closeReason.placeholder'))
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500)
        )
      );

      return interaction.showModal(modal);
    }

    // No reason modal — reply immediately with warning, then close
    await interaction.reply({
      content: '⏳ **Das Ticket wird geschlossen.** Bitte warte einen Moment, das Transcript wird erstellt...',
      flags: MessageFlags.Ephemeral,
    });

    await performClose(client, interaction.channel, ticket, interaction.user, null);
  },
};
