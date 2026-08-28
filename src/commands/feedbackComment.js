/**
 * Message context menu: right-click a rating post → Apps → "Comment Feedback".
 *
 * The command name is fixed English like every slash command in this repo: command
 * names are registered once at boot, while `client.t` follows the configured locale
 * — a translated name would only be right for whoever booted the bot last.
 */
const {
  ContextMenuCommandBuilder, ApplicationCommandType,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const {
  isRatingMessage, canCommentFeedback, commentFieldName, existingComment,
} = require('../utils/feedbackComments');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Comment Feedback')
    .setType(ApplicationCommandType.Message),

  async execute(client, interaction) {
    const message = interaction.targetMessage;

    if (!isRatingMessage(client, message)) {
      return interaction.reply({
        content: client.t('messages.feedbackNotARating'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    if (!canCommentFeedback(client, interaction.member)) {
      return interaction.reply({
        content: client.t('messages.feedbackCommentNoPermission'),
        flags:   MessageFlags.Ephemeral,
      });
    }

    const fieldName = commentFieldName(client, interaction.member);
    const current   = existingComment(message.embeds[0]?.toJSON?.() ?? message.embeds[0], fieldName);

    const input = new TextInputBuilder()
      .setCustomId('feedback_comment')
      .setLabel(client.t('modals.feedbackComment.label'))
      .setPlaceholder(client.t('modals.feedbackComment.placeholder'))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    // Re-commenting replaces the existing text, so it has to be visible in the box.
    if (current) input.setValue(current.slice(0, 1000));

    const modal = new ModalBuilder()
      .setCustomId(`tb_modalFeedbackComment:${message.channelId}:${message.id}`)
      .setTitle(client.t('modals.feedbackComment.title'))
      .addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
  },
};
