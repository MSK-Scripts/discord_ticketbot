const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, unclaimTicket } = require('../database');
const { updateChannelTopic, refreshTicketMessage } = require('../utils/ticketActions');

const TOPIC_WARNING = '\n> ⚠️ *Das Channel-Topic wird gleich aktualisiert – Discord limitiert Topic-Änderungen auf 2 pro 10 Minuten, das kann einen Moment dauern.*';

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

    // Reply immediately with rate-limit warning
    await interaction.reply(
      client.t('messages.ticketUnclaimed', { user: `<@${interaction.user.id}>` }) + TOPIC_WARNING
    );

    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (channel) {
      // Update topic (fire-and-forget — rate-limited)
      updateChannelTopic(channel, ticket, { claimedBy: null }, client);

      // Update embed + buttons (no rate-limit)
      await refreshTicketMessage(channel, false, ticket, { claimedBy: null }, client);
    }
  },
};
