const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} = require('discord.js');
const { typeOption } = require('./typeOption');
const path = require('path');
const fs   = require('fs');
const { panelEmbed } = require('./embeds');

const ASSETS_DIR = path.resolve(__dirname, '../../assets');

/**
 * Resolves a panel image named in the config. The customer's own file in
 * assets/<file> wins; without one, the shipped default in assets/default/<file>
 * is used (that is where the MSK logo lives, so `panel.logo.file: "logo.png"`
 * works out of the box). Customer images in assets/ are gitignored, so replacing
 * the logo never blocks an update. Returns null when neither file exists.
 * @param {string} file
 * @param {string} [assetsDir]
 * @returns {string|null}
 */
function resolvePanelAsset(file, assetsDir = ASSETS_DIR) {
  if (typeof file !== 'string' || file === '') return null;
  // Only a plain file name inside assets/ is allowed. Without this, a config
  // value like "../.env" made the panel post the bot's .env (token included)
  // to Discord as an attachment.
  if (file !== path.basename(file) || file === '.' || file === '..' || file.includes('\\') || file.includes('/')) return null;
  const root = path.resolve(assetsDir);
  for (const candidate of [path.resolve(root, file), path.resolve(root, 'default', file)]) {
    const rel = path.relative(root, candidate);
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
    if (fs.statSync(candidate, { throwIfNoEntry: false })?.isFile()) return candidate;
  }
  return null;
}

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
    const logoPath = resolvePanelAsset(logoCfg.file);
    if (logoPath) {
      files.push(new AttachmentBuilder(logoPath, { name: logoCfg.file }));
      embed.setThumbnail(`attachment://${logoCfg.file}`);
    } else {
      client.logger.warn(`[Panel] Logo file not found: ${path.resolve(ASSETS_DIR, logoCfg.file)}`);
    }
  }

  // ── Optional banner image ────────────────────────────────────────────────
  const bannerCfg = client.config.panel?.banner;
  if (bannerCfg?.enabled && bannerCfg?.file) {
    const bannerPath = resolvePanelAsset(bannerCfg.file);
    if (bannerPath) {
      files.push(new AttachmentBuilder(bannerPath, { name: bannerCfg.file }));
      embed.setImage(`attachment://${bannerCfg.file}`);
    } else {
      client.logger.warn(`[Panel] Banner file not found: ${path.resolve(ASSETS_DIR, bannerCfg.file)}`);
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
    const options = types.map(t => typeOption(t));

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

module.exports = { buildTicketPanel, resolvePanelAsset };
