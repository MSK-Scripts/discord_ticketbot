const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a user from the ticket.')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to remove').setRequired(true)
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

    const user = interaction.options.getUser('user');
    if (user.id === ticket.creator_id) {
      return interaction.reply({
        content: client.t('messages.cannotRemoveCreator'),
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.channel.permissionOverwrites.delete(user.id);
      await interaction.reply(client.t('messages.userRemoved', { user: `<@${user.id}>` }));
    } catch (err) {
      client.logger.error('[Remove] Error:', err);
      await interaction.reply({ content: client.t('messages.userRemoveFailed'), flags: MessageFlags.Ephemeral });
    }
  },
};
