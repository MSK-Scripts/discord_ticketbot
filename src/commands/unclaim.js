const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, unclaimTicket } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unclaim')
    .setDescription('Gibt das beanspruchte Ticket frei.'),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (!ticket.claimed_by) {
      return interaction.reply({ content: '❌ Dieses Ticket ist nicht beansprucht.', flags: MessageFlags.Ephemeral });
    }

    unclaimTicket(interaction.channelId);

    // ── Reply immediately so Discord doesn't time out ─────────────────────────
    await interaction.reply(client.t('messages.ticketUnclaimed', { user: `<@${interaction.user.id}>` }));

    // ── Restore original channel name in background ───────────────────────────
    const creator  = await interaction.guild.members.fetch(ticket.creator_id).catch(() => null);
    const nameOpt  = client.config.ticketNameOption ?? 'ticket-USERNAME';
    const origName = nameOpt
      .replace(/USERNAME/g,    creator?.user.username ?? 'unknown')
      .replace(/USERID/g,      ticket.creator_id)
      .replace(/TICKETCOUNT/g, String(ticket.id));
    await interaction.channel.setName(origName).catch(err =>
      client.logger.warn(`[Unclaim] Could not rename channel: ${err.message}`)
    );
  },
};
