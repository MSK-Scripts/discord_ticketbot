/**
 * Button: tb_close
 * Shows a reason modal (if configured) or closes the ticket immediately.
 */
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { getTicketByChannel } = require('../../database');
const { performClose } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_close',

  async execute(client, interaction) {
    const ticket = getTicketByChannel(interaction.channelId);

    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), ephemeral: true });
    }

    const cfg = client.config.closeOption ?? {};

    // Permission check
    if (cfg.whoCanCloseTicket === 'STAFFONLY' && !client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    // Show reason modal if configured
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

    // Close immediately without reason
    await interaction.deferUpdate();
    await performClose(client, interaction.channel, ticket, interaction.user, null);
  },
};
