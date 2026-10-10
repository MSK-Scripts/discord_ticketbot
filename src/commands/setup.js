const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { buildTicketPanel } = require('../utils/panel');
const { savePanelMessage } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Send the ticket panel to the configured channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    // setDefaultMemberPermissions is only a default: a server admin can widen it
    // under Integrations. Enforce the same permission here as well.
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: client.t('messages.noPermission'), flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channelId = client.config.openTicketChannelId;
    const channel   = await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return interaction.editReply(client.t('messages.panelChannelNotFound', { channel: channelId }));
    }

    const { embeds, components, files } = buildTicketPanel(client);

    try {
      const sent = await channel.send({ embeds, components, files });
      // Persist the panel location so it can auto-refresh on every boot
      // (see refreshTicketPanel in src/events/ready.js) — no need to re-run
      // /setup after an update that changes the embed/text.
      await savePanelMessage(interaction.guildId, channel.id, sent.id);
      await interaction.editReply(client.t('messages.panelSent', { channel: channel.id }));
    } catch (err) {
      client.logger.error('[Setup] Failed to send panel:', err);
      await interaction.editReply(client.t('messages.panelSendFailed'));
    }
  },
};
