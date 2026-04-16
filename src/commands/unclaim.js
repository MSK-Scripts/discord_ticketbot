const { SlashCommandBuilder } = require('discord.js');
const { getTicketByChannel, unclaimTicket } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unclaim')
    .setDescription('Gibt das beanspruchte Ticket frei.'),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }
    if (!ticket.claimed_by) {
      return interaction.reply({ content: '❌ Dieses Ticket ist nicht beansprucht.', ephemeral: true });
    }

    unclaimTicket(interaction.channelId);

    // Restore original channel name
    const creator = await interaction.guild.members.fetch(ticket.creator_id).catch(() => null);
    const nameOpt = client.config.ticketNameOption ?? 'ticket-USERNAME';
    const origName = nameOpt
      .replace(/USERNAME/g, creator?.user.username ?? 'unknown')
      .replace(/USERID/g,   ticket.creator_id)
      .replace(/TICKETCOUNT/g, String(ticket.id));
    await interaction.channel.setName(origName).catch(() => null);

    await interaction.reply(client.t('messages.ticketUnclaimed', { user: `<@${interaction.user.id}>` }));
  },
};
