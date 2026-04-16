const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { panelEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Sendet das Ticket-Panel in den konfigurierten Kanal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    await interaction.deferReply({ flags: 64 });

    const channelId = client.config.openTicketChannelId;
    const channel   = await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return interaction.editReply(
        `❌ Kanal \`${channelId}\` nicht gefunden. Bitte \`openTicketChannelId\` in der Config prüfen.`
      );
    }

    const embed = panelEmbed(client);

    // Always use a single button — regardless of how many ticket types are configured.
    // The type selection happens in an ephemeral follow-up so Discord never caches
    // a previously selected value (which would force users to restart Discord).
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tb_open')
        .setLabel(client.t('buttons.openTicket'))
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Primary)
    );

    try {
      await channel.send({ embeds: [embed], components: [row] });
      await interaction.editReply(`✅ Ticket-Panel wurde in <#${channel.id}> gesendet.`);
    } catch (err) {
      client.logger.error('[Setup] Failed to send panel:', err);
      await interaction.editReply('❌ Fehler beim Senden des Panels. Sind die Bot-Berechtigungen korrekt?');
    }
  },
};
