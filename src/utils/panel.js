const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
} = require('discord.js');
const path = require('path');
const fs   = require('fs');
const { panelEmbed } = require('./embeds');

/**
 * Builds the full ticket-panel payload (embed + interaction row + file attachments).
 *
 * Shared by `/setup` (initial send) and the boot-time auto-refresh in `ready.js`,
 * so the panel always reflects the current config & locale — e.g. after an update
 * the operator no longer has to re-run `/setup` to pick up embed/text changes.
 *
 * @param {import('../client')} client
 * @returns {{ embeds: import('discord.js').EmbedBuilder[], components: ActionRowBuilder[], files: AttachmentBuilder[] }}
 */
function buildTicketPanel(client) {
  const embed = panelEmbed(client);
  const files = [];

  // ── Optional logo image ──────────────────────────────────────────────────
  const logoCfg = client.config.panel?.logo;
  if (logoCfg?.enabled && logoCfg?.file) {
    const logoPath = path.resolve(__dirname, '../../assets', logoCfg.file);
    if (fs.existsSync(logoPath)) {
      files.push(new AttachmentBuilder(logoPath, { name: logoCfg.file }));
      embed.setThumbnail(`attachment://${logoCfg.file}`);
    } else {
      client.logger.warn(`[Panel] Logo file not found: ${logoPath}`);
    }
  }

  // ── Optional banner image ────────────────────────────────────────────────
  const bannerCfg = client.config.panel?.banner;
  if (bannerCfg?.enabled && bannerCfg?.file) {
    const bannerPath = path.resolve(__dirname, '../../assets', bannerCfg.file);
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: bannerCfg.file }));
      embed.setImage(`attachment://${bannerCfg.file}`);
    } else {
      client.logger.warn(`[Panel] Banner file not found: ${bannerPath}`);
    }
  }

  // ── Interaction type ─────────────────────────────────────────────────────
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

  return { embeds: [embed], components: [row], files };
}

module.exports = { buildTicketPanel };
