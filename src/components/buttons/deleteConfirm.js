/**
 * Button: tb_deleteConfirm
 * Final step — actually deletes the channel after user confirmed.
 */
module.exports = {
  customId: 'tb_deleteConfirm',

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    await interaction.reply({ content: '🗑️ Kanal wird gelöscht...', ephemeral: true }).catch(() => null);

    try {
      await interaction.channel.delete(`Ticket gelöscht von ${interaction.user.tag}`);
      client.logger.info(`[Delete] Channel ${interaction.channelId} deleted by ${interaction.user.tag}`);
    } catch (err) {
      client.logger.error('[Delete] Failed to delete channel:', err);
    }
  },
};
