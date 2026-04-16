const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { panelEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Sendet das Ticket-Panel in den konfigurierten Kanal.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channelId = client.config.openTicketChannelId;
    const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return interaction.editReply(
        `❌ Kanal \`${channelId}\` nicht gefunden. Bitte \`openTicketChannelId\` in der Config prüfen.`
      );
    }

    const embed = panelEmbed(client);
    const types = client.config.ticketTypes;

    let components;
    if (types.length === 1) {
      // Single type → direct open button
      components = [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('tb_open')
            .setLabel(client.t('buttons.openTicket'))
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary)
        ),
      ];
    } else {
      // Multiple types → select menu
      const options = types.map(t => ({
        label:       t.name,
        description: t.description?.substring(0, 100) ?? '',
        value:       t.codeName,
        emoji:       t.emoji || undefined,
      }));

      components = [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('tb_selectType')
            .setPlaceholder(client.t('menus.ticketType'))
            .addOptions(options)
        ),
      ];
    }

    try {
      await channel.send({ embeds: [embed], components });
      await interaction.editReply(`✅ Ticket-Panel wurde in <#${channel.id}> gesendet.`);
    } catch (err) {
      client.logger.error('[Setup] Failed to send panel:', err);
      await interaction.editReply('❌ Fehler beim Senden des Panels. Sind die Bot-Berechtigungen korrekt?');
    }
  },
};
