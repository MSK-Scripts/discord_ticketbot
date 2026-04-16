const { SlashCommandBuilder } = require('discord.js');
const { getTicketByChannel, claimTicket } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Beansprucht dieses Ticket für dich.'),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), ephemeral: true });
    }
    if (ticket.claimed_by) {
      return interaction.reply({
        content: client.t('messages.ticketAlreadyClaimed', { user: `<@${ticket.claimed_by}>` }),
        ephemeral: true,
      });
    }

    claimTicket(interaction.channelId, interaction.user.id);

    // Rename channel if configured
    const cfg = client.config.claimOption;
    if (cfg?.nameWhenClaimed) {
      const creator = await interaction.guild.members.fetch(ticket.creator_id).catch(() => null);
      const newName = cfg.nameWhenClaimed
        .replace(/S_USERNAME/g, interaction.user.username)
        .replace(/S_USERID/g,   interaction.user.id)
        .replace(/U_USERNAME/g, creator?.user.username ?? 'unknown')
        .replace(/U_USERID/g,   ticket.creator_id)
        .replace(/TICKETCOUNT/g, String(ticket.id));
      await interaction.channel.setName(newName).catch(() => null);
    }

    // Move to claimed category if configured
    if (cfg?.categoryWhenClaimed) {
      await interaction.channel.setParent(cfg.categoryWhenClaimed, { lockPermissions: false }).catch(() => null);
    }

    await interaction.reply(client.t('messages.ticketClaimed', { user: `<@${interaction.user.id}>` }));
  },
};
