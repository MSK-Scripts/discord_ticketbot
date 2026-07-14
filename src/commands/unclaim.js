const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../database');
const { performUnclaim } = require('../utils/ticketActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unclaim')
    .setDescription('Release the claimed ticket.'),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (!ticket.claimed_by) {
      return interaction.reply({ content: client.t('messages.notClaimed'), flags: MessageFlags.Ephemeral });
    }

    // Reply immediately with rate-limit warning
    await interaction.reply(
      client.t('messages.ticketUnclaimed', { user: `<@${interaction.user.id}>` }) + client.t('messages.topicUpdateWarning')
    );

    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    await performUnclaim(client, channel, ticket);
  },
};
