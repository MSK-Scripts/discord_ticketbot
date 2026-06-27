const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, claimTicket } = require('../database');
const { updateChannelTopic, refreshTicketMessage } = require('../utils/ticketActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('claim')
    .setDescription('Claim this ticket for yourself.'),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = await getTicketByChannel(interaction.channelId);
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

    await claimTicket(interaction.channelId, interaction.user.id);

    // Reply immediately with rate-limit warning
    await interaction.reply(
      client.t('messages.ticketClaimed', { user: `<@${interaction.user.id}>` }) + client.t('messages.topicUpdateWarning')
    );

    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (channel) {
      // Update topic (fire-and-forget — rate-limited)
      updateChannelTopic(channel, ticket, { claimedBy: interaction.user.id }, client);

      // Update embed + buttons (no rate-limit)
      await refreshTicketMessage(channel, true, ticket, { claimedBy: interaction.user.id }, client);

      const cfg = client.config.claimOption;
      if (cfg?.categoryWhenClaimed) {
        await channel.setParent(cfg.categoryWhenClaimed, { lockPermissions: false }).catch(() => null);
      }
    }
  },
};
