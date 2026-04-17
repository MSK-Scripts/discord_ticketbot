/**
 * Select Menu: tb_panelSelect
 *
 * Used when interactionType = "SELECT_MENU" in the panel config.
 * The select menu lives directly in the panel message (non-ephemeral).
 *
 * After every interaction — success or failure — the menu is reset to its
 * default state (no pre-selected value). This means users never have to
 * restart Discord to open a second ticket of the same type.
 */
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require('discord.js');
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');
const { buildQuestionsModal } = require('../buttons/openTicket');

module.exports = {
  customId: 'tb_panelSelect',

  async execute(client, interaction) {
    const typeCode   = interaction.values[0];
    const ticketType = client.config.ticketTypes.find(t => t.codeName === typeCode);

    if (!ticketType) {
      await resetMenu(interaction, client);
      return interaction.followUp({ content: '❌ Unbekannter Ticket-Typ.', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.user;

    // ── Guard checks — reset menu first so the panel is always usable ─────────
    if (isBlacklisted(user.id, interaction.guildId)) {
      await resetMenu(interaction, client);
      return interaction.followUp({ content: client.t('messages.blacklisted'), flags: MessageFlags.Ephemeral });
    }

    const cfg = client.config;
    if (cfg.maxTicketOpened > 0) {
      const open = getOpenTicketsByUser(user.id, interaction.guildId);
      if (open.length >= cfg.maxTicketOpened) {
        await resetMenu(interaction, client);
        return interaction.followUp({
          content: client.t('messages.ticketLimitReached', { limit: String(cfg.maxTicketOpened) }),
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (ticketType.cantAccess?.length > 0) {
      const blocked = ticketType.cantAccess.some(roleId => interaction.member.roles.cache.has(roleId));
      if (blocked) {
        await resetMenu(interaction, client);
        return interaction.followUp({
          content: '❌ Du hast keinen Zugriff auf diesen Ticket-Typ.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // ── Has questions → reset menu, then show modal ───────────────────────────
    // We must acknowledge the interaction before showing the modal.
    // deferUpdate keeps the panel message intact; after the defer we show the modal.
    // Discord.js v14 does not allow showModal() after deferUpdate(), so instead we
    // reset via update() and immediately open the modal in the same acknowledgement.
    if (ticketType.askQuestions && ticketType.questions?.length > 0) {
      // showModal() counts as the interaction acknowledgement — we cannot also call
      // update(). Instead, reset the menu right after the modal is submitted via
      // the tb_modalQuestions handler which calls interaction.followUp (ephemeral).
      // Here we just show the modal immediately.
      await interaction.showModal(buildQuestionsModal(ticketType));
      // Reset the panel menu via webhook edit (does not require an unacknowledged interaction)
      await resetMenuViaWebhook(interaction, client).catch(() => null);
      return;
    }

    // ── No questions → reset menu + open ticket ───────────────────────────────
    // Use update() to reset the select menu and acknowledge the interaction.
    await resetMenu(interaction, client);

    const channel = await openTicket(client, interaction.guild, user, ticketType, []);
    if (!channel) {
      return interaction.followUp({ content: '❌ Ticket konnte nicht erstellt werden.', flags: MessageFlags.Ephemeral });
    }

    await interaction.followUp({
      content: client.t('messages.ticketCreated', { channel: `<#${channel.id}>` }),
      flags: MessageFlags.Ephemeral,
    });
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Reset the panel select menu to its default (no selection) state.
 * Uses interaction.update() — this is the interaction acknowledgement.
 * Must be called before any followUp.
 */
async function resetMenu(interaction, client) {
  const freshRow = buildFreshPanelRow(interaction, client);
  await interaction.update({ components: [freshRow] }).catch(() => null);
}

/**
 * Reset the panel menu via the webhook token (after the interaction was already
 * acknowledged by showModal). Does not require an unacknowledged interaction.
 */
async function resetMenuViaWebhook(interaction, client) {
  const freshRow = buildFreshPanelRow(interaction, client);
  await interaction.message.edit({ components: [freshRow] });
}

/**
 * Build a fresh select menu row from the current config (no pre-selected value).
 */
function buildFreshPanelRow(interaction, client) {
  const types   = client.config.ticketTypes;
  const options = types.map(t =>
    new StringSelectMenuOptionBuilder()
      .setLabel(t.name)
      .setDescription(t.description?.substring(0, 100) ?? '')
      .setValue(t.codeName)
      .setEmoji(t.emoji || '🎫')
  );

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('tb_panelSelect')
      .setPlaceholder(client.t('menus.ticketType'))
      .addOptions(options)
  );
}
