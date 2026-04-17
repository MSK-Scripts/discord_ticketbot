const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const path = require('path');
const fs   = require('fs');
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
    const files = [];

    // ── Optional logo image ────────────────────────────────────────────────
    const logoCfg = client.config.panel?.logo;
    if (logoCfg?.enabled && logoCfg?.file) {
      const logoPath = path.resolve(__dirname, '../../assets', logoCfg.file);
      if (fs.existsSync(logoPath)) {
        files.push(new AttachmentBuilder(logoPath, { name: logoCfg.file }));
        embed.setThumbnail(`attachment://${logoCfg.file}`);
      } else {
        client.logger.warn(`[Setup] Logo file not found: ${logoPath}`);
      }
    }

    // ── Optional banner image ──────────────────────────────────────────────
    const bannerCfg = client.config.panel?.banner;
    if (bannerCfg?.enabled && bannerCfg?.file) {
      const bannerPath = path.resolve(__dirname, '../../assets', bannerCfg.file);
      if (fs.existsSync(bannerPath)) {
        files.push(new AttachmentBuilder(bannerPath, { name: bannerCfg.file }));
        embed.setImage(`attachment://${bannerCfg.file}`);
      } else {
        client.logger.warn(`[Setup] Banner file not found: ${bannerPath}`);
      }
    }

    // ── Interaction type ───────────────────────────────────────────────────
    const interactionType = client.config.panel?.interactionType ?? 'BUTTON';
    const types           = client.config.ticketTypes;

    let row;

    if (interactionType === 'SELECT_MENU' && types.length > 1) {
      // Show the select menu directly in the panel — no button click needed.
      // The handler (tb_panelSelect) resets the menu after every use so Discord
      // never caches a previously selected value.
      const options = types.map(t =>
        new StringSelectMenuOptionBuilder()
          .setLabel(t.name)
          .setDescription(t.description?.substring(0, 100) ?? '')
          .setValue(t.codeName)
          .setEmoji(t.emoji || '🎫')
      );

      row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('tb_panelSelect')
          .setPlaceholder(client.t('menus.ticketType'))
          .addOptions(options)
      );
    } else {
      // BUTTON mode (default): single green button opens ephemeral select or modal
      row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('tb_open')
          .setLabel(client.t('buttons.openTicket'))
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Success)
      );
    }

    try {
      await channel.send({ embeds: [embed], components: [row], files });
      await interaction.editReply(`✅ Ticket-Panel wurde in <#${channel.id}> gesendet.`);
    } catch (err) {
      client.logger.error('[Setup] Failed to send panel:', err);
      await interaction.editReply('❌ Fehler beim Senden des Panels. Sind die Bot-Berechtigungen korrekt?');
    }
  },
};
