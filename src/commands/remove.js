const { SlashCommandBuilder } = require('discord.js');
const { getTicketByChannel } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Entfernt einen Nutzer aus dem Ticket.')
    .addUserOption(opt =>
      opt.setName('nutzer')
         .setDescription('Der zu entfernende Nutzer')
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

    // Don't allow removing the ticket creator
    if (user.id === ticket.creator_id) {
      return interaction.reply({
        content: '❌ Der Ersteller des Tickets kann nicht entfernt werden.',
        ephemeral: true,
      });
    }

    try {
      await interaction.channel.permissionOverwrites.delete(user.id);
      await interaction.reply(client.t('messages.userRemoved', { user: `<@${user.id}>` }));
    } catch (err) {
      client.logger.error('[Remove] Error:', err);
      await interaction.reply({ content: '❌ Fehler beim Entfernen des Nutzers.', ephemeral: true });
    }
  },
};
