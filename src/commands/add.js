const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicketByChannel } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Fügt einen Nutzer zum Ticket hinzu.')
    .addUserOption(opt =>
      opt.setName('nutzer')
         .setDescription('Der hinzuzufügende Nutzer')
         .setRequired(true)
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }

    const user = interaction.options.getUser('nutzer');
    try {
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel:      true,
        SendMessages:     true,
        ReadMessageHistory: true,
      });
      await interaction.reply(client.t('messages.userAdded', { user: `<@${user.id}>` }));
    } catch (err) {
      client.logger.error('[Add] Error:', err);
      await interaction.reply({ content: '❌ Fehler beim Hinzufügen des Nutzers.', ephemeral: true });
    }
  },
};
