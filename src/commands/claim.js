const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, claimTicket } = require('../database');
const { updateChannelTopic, refreshTicketButtons } = require('../utils/ticketActions');

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

    await interaction.reply(
      client.t('messages.ticketClaimed', { user: `<@${interaction.user.id}>` })
    );

    // Guarantee non-null channel for topic + button updates
    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (channel) {
      // Update topic and toggle Claim → Unclaim button
      await updateChannelTopic(channel, ticket, { claimedBy: interaction.user.id }, client);
      await refreshTicketButtons(channel, true, client);

      // Move to claimed category if configured
      const cfg = client.config.claimOption;
      if (cfg?.categoryWhenClaimed) {
        await channel.setParent(cfg.categoryWhenClaimed, { lockPermissions: false }).catch(() => null);
      }
    }
  },
};
