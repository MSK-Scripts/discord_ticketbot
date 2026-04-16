const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Entfernt einen Nutzer aus dem Ticket.')
    .addUserOption(opt =>
      opt.setName('nutzer').setDescription('Der zu entfernende Nutzer').setRequired(true)
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('nutzer');
    if (user.id === ticket.creator_id) {
      return interaction.reply({
        content: '❌ Der Ersteller des Tickets kann nicht entfernt werden.',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.channel.permissionOverwrites.delete(user.id);
      await interaction.reply(client.t('messages.userRemoved', { user: `<@${user.id}>` }));
    } catch (err) {
      client.logger.error('[Remove] Error:', err);
      await interaction.reply({ content: '❌ Fehler beim Entfernen des Nutzers.', flags: MessageFlags.Ephemeral });
    }
  },
};
