/**
 * Button: tb_reopen
 * Reopens a closed ticket from the closed-ticket message.
 */
const { MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../../database');
const { performReopen } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_reopen',

  async execute(client, interaction) {
    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

    const reopenCfg = client.config.reopenOption ?? {};
    if (!reopenCfg.enabled) {
      return interaction.reply({ content: client.t('messages.reopenDisabled'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.status !== 'closed') {
      return interaction.reply({ content: client.t('messages.ticketNotClosed'), flags: MessageFlags.Ephemeral });
    }

    // Permission check — STAFFONLY (default) requires staff, EVERYONE allows anyone who can see the channel
    const ticketType = client.config.ticketTypes.find(t => t.codeName === ticket.type);
    if ((reopenCfg.whoCanReopen ?? 'STAFFONLY') === 'STAFFONLY' && !client.isStaff(interaction.member, ticketType)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);
    if (!channel) {
      return interaction.reply({ content: client.t('messages.channelNotFound'), flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({ content: client.t('messages.reopeningTicket'), flags: MessageFlags.Ephemeral });

    // Disable the closed-message buttons so they can't be pressed again
    await interaction.message.edit({ components: [] }).catch(() => null);

    await performReopen(client, channel, ticket, interaction.user);
  },
};
