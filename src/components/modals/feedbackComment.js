/**
 * Modal: tb_modalFeedbackComment:{channelId}:{messageId}
 * Submitted from the "Comment Feedback" message context menu.
 */
const { EmbedBuilder, MessageFlags } = require('discord.js');

const {
  isRatingMessage, canCommentFeedback, commentFieldName, upsertComment,
} = require('../../utils/feedbackComments');

module.exports = {
  customId: 'tb_modalFeedbackComment',

  async execute(client, interaction) {
    const [, channelId, messageId] = interaction.customId.split(':');

    const channel = await client.channels.fetch(channelId).catch(() => null);
    const message = channel ? await channel.messages.fetch(messageId).catch(() => null) : null;

    if (!message || !isRatingMessage(client, message)) {
      return interaction.reply({
        content: client.t('messages.feedbackNotARating'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    // Re-checked on submit: the member could have lost the role while the modal was open.
    if (!canCommentFeedback(client, interaction.member)) {
      return interaction.reply({
        content: client.t('messages.feedbackCommentNoPermission'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    const text = interaction.fields.getTextInputValue('feedback_comment')?.trim();
    if (!text) {
      return interaction.reply({
        content: client.t('messages.feedbackCommentEmpty'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    const embedData = message.embeds[0].toJSON();
    const fieldName = commentFieldName(client, interaction.member);
    const fields    = upsertComment(embedData, fieldName, text);

    if (!fields) {
      return interaction.reply({
        content: client.t('messages.feedbackCommentFull'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    const embed = EmbedBuilder.from(embedData).setFields(fields);

    try {
      await message.edit({ embeds: [embed] });
    } catch (err) {
      client.logger.warn(`[Feedback] Could not edit rating message ${messageId}: ${err.message}`);
      return interaction.reply({
        content: client.t('messages.feedbackCommentFailed'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    client.logger.info(`[Feedback] ${interaction.user.tag} commented on rating message ${messageId}`);

    await interaction.reply({
      content: client.t('messages.feedbackCommentSaved'),
      flags:   MessageFlags.Ephemeral,
    });
  },
};
