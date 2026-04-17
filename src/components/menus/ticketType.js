/**
 * Select Menu: tb_selectType
 * Shown when multiple ticket types are configured.
 *
 * After selection:
 *  - Has questions → showModal(), then immediately delete the select-menu message
 *  - No questions  → deferUpdate(), open ticket, transform message into success
 *                    notice, auto-delete after 10 seconds
 */
const { MessageFlags } = require('discord.js');
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');
const { buildQuestionsModal } = require('../buttons/openTicket');

const SUCCESS_DELETE_DELAY = 10_000;

module.exports = {
  customId: 'tb_selectType',

  async execute(client, interaction) {
    const typeCode   = interaction.values[0];
    const ticketType = client.config.ticketTypes.find(t => t.codeName === typeCode);

    if (!ticketType) {
      return interaction.reply({ content: '❌ Unbekannter Ticket-Typ.', flags: MessageFlags.Ephemeral });
    }

    const user = interaction.user;

    if (isBlacklisted(user.id, interaction.guildId)) {
      return interaction.reply({ content: client.t('messages.blacklisted'), flags: MessageFlags.Ephemeral });
    }

    const cfg = client.config;
    if (cfg.maxTicketOpened > 0) {
      const open = getOpenTicketsByUser(user.id, interaction.guildId);
      if (open.length >= cfg.maxTicketOpened) {
        return interaction.reply({
          content: client.t('messages.ticketLimitReached', { limit: String(cfg.maxTicketOpened) }),
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (ticketType.cantAccess?.length > 0) {
      const blocked = ticketType.cantAccess.some(roleId => interaction.member.roles.cache.has(roleId));
      if (blocked) {
        return interaction.reply({
          content: '❌ Du hast keinen Zugriff auf diesen Ticket-Typ.',
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // ── Has questions → show modal then delete the select-menu message ────────
    // After showModal(), the interaction token remains valid for 15 minutes so
    // we can still call deleteReply() to remove the "Bitte wähle eine Kategorie"
    // ephemeral message that was sent by the tb_open button handler.
    if (ticketType.askQuestions && ticketType.questions?.length > 0) {
      await interaction.showModal(buildQuestionsModal(ticketType));
      // Delete the select-menu message — it's no longer needed
      await interaction.deleteReply().catch(() => null);
      return;
    }

    // ── No questions → open ticket directly ───────────────────────────────────
    // deferUpdate keeps the existing ephemeral message, then we transform it
    // into the success notice and auto-delete it after 10 seconds.
    await interaction.deferUpdate();

    const channel = await openTicket(client, interaction.guild, user, ticketType, []);
    if (!channel) {
      return interaction.editReply({
        content: '❌ Ticket konnte nicht erstellt werden. Bitte versuche es erneut.',
        components: [],
      });
    }

    await interaction.editReply({
      content:    client.t('messages.ticketCreated', { channel: `<#${channel.id}>` }),
      components: [],
    });
    setTimeout(() => interaction.deleteReply().catch(() => null), SUCCESS_DELETE_DELAY);
  },
};
