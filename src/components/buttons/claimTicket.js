/**
 * Button: tb_claim
 * Claims a ticket for the staff member who clicked the button.
 */
const { getTicketByChannel, claimTicket } = require('../../database');

module.exports = {
  customId: 'tb_claim',

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

    // Rename channel
    const cfg = client.config.claimOption;
    if (cfg?.nameWhenClaimed) {
      const creator = await interaction.guild.members.fetch(ticket.creator_id).catch(() => null);
      const newName = cfg.nameWhenClaimed
        .replace(/S_USERNAME/g, interaction.user.username)
        .replace(/S_USERID/g,   interaction.user.id)
        .replace(/U_USERNAME/g, creator?.user.username ?? 'unknown')
        .replace(/U_USERID/g,   ticket.creator_id)
        .replace(/TICKETCOUNT/g, String(ticket.id))
        .toLowerCase()
        .replace(/[^a-z0-9-✔️]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
      await interaction.channel.setName(newName).catch(() => null);
    }

    if (cfg?.categoryWhenClaimed) {
      await interaction.channel.setParent(cfg.categoryWhenClaimed, { lockPermissions: false }).catch(() => null);
    }

    await interaction.reply(
      client.t('messages.ticketClaimed', { user: `<@${interaction.user.id}>` })
    );
  },
};
