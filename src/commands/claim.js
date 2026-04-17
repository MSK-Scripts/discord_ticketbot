const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, claimTicket } = require('../database');
const { updateChannelTopic, refreshTicketMessage } = require('../utils/ticketActions');

const TOPIC_WARNING = '\n> ⚠️ *Das Channel-Topic wird gleich aktualisiert – Discord limitiert Topic-Änderungen auf 2 pro 10 Minuten, das kann einen Moment dauern.*';

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

    // Reply immediately with rate-limit warning
    await interaction.reply(
      client.t('messages.ticketClaimed', { user: `<@${interaction.user.id}>` }) + TOPIC_WARNING
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
