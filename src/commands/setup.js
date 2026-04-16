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

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tb_open')
        .setLabel(client.t('buttons.openTicket'))
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Success)
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
