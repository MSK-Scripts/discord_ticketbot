const { MessageFlags } = require('discord.js');

module.exports = {
  customId: 'tb_deleteConfirm',

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ content: '🗑️ Kanal wird gelöscht...', flags: MessageFlags.Ephemeral }).catch(() => null);

    try {
      await interaction.channel.delete(`Ticket gelöscht von ${interaction.user.tag}`);
      client.logger.info(`[Delete] Channel ${interaction.channelId} deleted by ${interaction.user.tag}`);
    } catch (err) {
      client.logger.error('[Delete] Failed to delete channel:', err);
    }
  },
};
