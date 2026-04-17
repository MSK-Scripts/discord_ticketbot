const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, claimTicket } = require('../database');
const { updateChannelTopic } = require('../utils/ticketActions');

const RENAME_WARNING = '\n> ⚠️ *Der Kanalname wird gleich aktualisiert – Discord limitiert Umbenennungen, das kann einen Moment dauern.*';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Beansprucht dieses Ticket für dich.'),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.claimed_by) {
      return interaction.reply({
        content: client.t('messages.ticketAlreadyClaimed', { user: `<@${ticket.claimed_by}>` }),
        flags: MessageFlags.Ephemeral,
      });
    }

    claimTicket(interaction.channelId, interaction.user.id);

    // Reply immediately — rename + topic update happen in background
    const cfg        = client.config.claimOption;
    const willRename = !!cfg?.nameWhenClaimed;
    await interaction.reply(
      client.t('messages.ticketClaimed', { user: `<@${interaction.user.id}>` }) +
      (willRename ? RENAME_WARNING : '')
    );

    // Update topic (no rate-limit)
    await updateChannelTopic(interaction.channel, ticket, { claimedBy: interaction.user.id }, client);

    // Rename channel (rate-limited, runs in background after reply)
    if (willRename) {
      const creator = await interaction.guild.members.fetch(ticket.creator_id).catch(() => null);
      const newName = cfg.nameWhenClaimed
        .replace(/S_USERNAME/g, interaction.user.username)
        .replace(/S_USERID/g,   interaction.user.id)
        .replace(/U_USERNAME/g, creator?.user.username ?? 'unknown')
        .replace(/U_USERID/g,   ticket.creator_id)
        .replace(/TICKETCOUNT/g, String(ticket.id))
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100);
      await interaction.channel.setName(newName).catch(err =>
        client.logger.warn(`[Claim] Could not rename channel: ${err.message}`)
      );
    }

    if (cfg?.categoryWhenClaimed) {
      await interaction.channel.setParent(cfg.categoryWhenClaimed, { lockPermissions: false }).catch(() => null);
    }
  },
};
