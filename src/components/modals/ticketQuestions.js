/**
 * Modal: tb_modalQuestions (prefix match, e.g. tb_modalQuestions:support)
 * Submitted when the user fills in the ticket-type question modal.
 *
 * After successful ticket creation the ephemeral confirmation is shown for
 * 10 seconds and then automatically deleted.
 */
const { MessageFlags } = require('discord.js');
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');

const SUCCESS_DELETE_DELAY = 10_000;

module.exports = {
  customId: 'tb_modalQuestions',

  async execute(client, interaction) {
    const typeCode   = interaction.customId.split(':')[1];
    const ticketType = client.config.ticketTypes.find(t => t.codeName === typeCode);

    if (!ticketType) {
      return interaction.reply({ content: '❌ Unbekannter Ticket-Typ.', flags: MessageFlags.Ephemeral });
    }

    const answers = (ticketType.questions ?? []).map(q => {
      const key = q.label.toLowerCase().replace(/\s+/g, '_').substring(0, 45);
      try { return interaction.fields.getTextInputValue(key) ?? ''; } catch { return ''; }
    });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Re-check limits in case user opened another ticket while filling the form
    if (isBlacklisted(interaction.user.id, interaction.guildId)) {
      return interaction.editReply(client.t('messages.blacklisted'));
    }

    const cfg = client.config;
    if (cfg.maxTicketOpened > 0) {
      const open = getOpenTicketsByUser(interaction.user.id, interaction.guildId);
      if (open.length >= cfg.maxTicketOpened) {
        return interaction.editReply(
          client.t('messages.ticketLimitReached', { limit: String(cfg.maxTicketOpened) })
        );
      }
    }

    const channel = await openTicket(client, interaction.guild, interaction.user, ticketType, answers);
    if (!channel) {
      return interaction.editReply('❌ Ticket konnte nicht erstellt werden. Bitte versuche es erneut.');
    }

    // Show success for 10 seconds, then auto-delete
    await interaction.editReply(client.t('messages.ticketCreated', { channel: `<#${channel.id}>` }));
    setTimeout(() => interaction.deleteReply().catch(() => null), SUCCESS_DELETE_DELAY);
  },
};
