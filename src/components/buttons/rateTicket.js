const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
} = require('discord.js');
const { getRating } = require('../../database');

module.exports = {
  customId: 'tb_rate',

  async execute(client, interaction) {
    const parts  = interaction.customId.split(':');
    const rating = parseInt(parts[1], 10);

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return interaction.reply({ content: client.t('messages.notInvalidRating'), flags: MessageFlags.Ephemeral });
    }

    // Primary: ticket id encoded in the custom ID (tb_rate:{rating}:{ticketId}).
    // Fallback: parse it from the embed description (legacy messages sent before
    // the id was added to the custom ID).
    let ticketId = parts[2] ? parseInt(parts[2], 10) : NaN;
    if (isNaN(ticketId)) {
      const embed = interaction.message?.embeds?.[0];
      const match = embed?.description?.match(/#(\d+)/);
      if (match) ticketId = parseInt(match[1], 10);
    }

    if (isNaN(ticketId)) {
      return interaction.reply({ content: client.t('messages.ratingRefNotFound'), flags: MessageFlags.Ephemeral });
    }

    if (await getRating(ticketId)) {
      return interaction.reply({ content: client.t('messages.alreadyRated'), flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder()
      .setCustomId(`tb_modalRate:${rating}:${ticketId}`)
      .setTitle(client.t('modals.rateComment.title'));

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('rate_comment')
          .setLabel(client.t('modals.rateComment.label'))
          .setPlaceholder(client.t('modals.rateComment.placeholder'))
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(1000)
      )
    );

    await interaction.showModal(modal);
  },
};
