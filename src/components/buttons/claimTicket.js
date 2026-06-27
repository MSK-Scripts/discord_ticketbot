/**
 * Button: tb_claim
 */
const { MessageFlags } = require('discord.js');
const { getTicketByChannel, claimTicket } = require('../../database');
const { updateChannelTopic, refreshTicketMessage } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_claim',

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
      updateChannelTopic(channel, ticket, { claimedBy: interaction.user.id }, client);
      await refreshTicketMessage(channel, true, ticket, { claimedBy: interaction.user.id }, client);

      const cfg = client.config.claimOption;
      if (cfg?.categoryWhenClaimed) {
        await channel.setParent(cfg.categoryWhenClaimed, { lockPermissions: false }).catch(() => null);
      }
    }
  },
};
