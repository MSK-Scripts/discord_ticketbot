/**
 * Select Menu: tb_selectType
 * Shown when multiple ticket types are configured.
 * After selection: show modal (if questions) or open ticket directly.
 */
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');
const { buildQuestionsModal } = require('../buttons/openTicket');

module.exports = {
  customId: 'tb_selectType',

  async execute(client, interaction) {
    const typeCode   = interaction.values[0];
    const ticketType = client.config.ticketTypes.find(t => t.codeName === typeCode);

    if (!ticketType) {
      return interaction.reply({ content: '❌ Unbekannter Ticket-Typ.', ephemeral: true });
    }

    const user = interaction.user;

    // ── Guard checks ─────────────────────────────────────────────────────────
    if (isBlacklisted(user.id, interaction.guildId)) {
      return interaction.reply({ content: client.t('messages.blacklisted'), ephemeral: true });
    }

    const cfg = client.config;
    if (cfg.maxTicketOpened > 0) {
      const open = getOpenTicketsByUser(user.id, interaction.guildId);
      if (open.length >= cfg.maxTicketOpened) {
        return interaction.reply({
          content: client.t('messages.ticketLimitReached', { limit: String(cfg.maxTicketOpened) }),
          ephemeral: true,
        });
      }
    }

    // ── Role restriction check ────────────────────────────────────────────────
    if (ticketType.cantAccess?.length > 0) {
      const member = interaction.member;
      const blocked = ticketType.cantAccess.some(roleId => member.roles.cache.has(roleId));
      if (blocked) {
        return interaction.reply({
          content: '❌ Du hast keinen Zugriff auf diesen Ticket-Typ.',
          ephemeral: true,
        });
      }
    }

    // ── Show modal if questions configured ────────────────────────────────────
    if (ticketType.askQuestions && ticketType.questions?.length > 0) {
      const modal = buildQuestionsModal(ticketType);
      return interaction.showModal(modal);
    }

    // ── Open ticket directly ──────────────────────────────────────────────────
    await interaction.deferReply({ ephemeral: true });

    const channel = await openTicket(client, interaction.guild, user, ticketType, []);
    if (!channel) {
      return interaction.editReply('❌ Ticket konnte nicht erstellt werden. Bitte versuche es erneut.');
    }

    await interaction.editReply(
      client.t('messages.ticketCreated', { channel: `<#${channel.id}>` })
    );
  },
};
