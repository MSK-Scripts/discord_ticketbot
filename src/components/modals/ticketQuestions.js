/**
 * Modal: tb_modalQuestions (prefix match, e.g. tb_modalQuestions:support)
 * Submitted when the user fills in the ticket-type question modal.
 */
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_modalQuestions',

  async execute(client, interaction) {
    const typeCode   = interaction.customId.split(':')[1];
    const ticketType = client.config.ticketTypes.find(t => t.codeName === typeCode);

    if (!ticketType) {
      return interaction.reply({ content: '❌ Unbekannter Ticket-Typ.', ephemeral: true });
    }

    // Collect answers in question order
    const answers = (ticketType.questions ?? []).map(q => {
      const key = q.label.toLowerCase().replace(/\s+/g, '_').substring(0, 45);
      try {
        return interaction.fields.getTextInputValue(key) ?? '';
      } catch {
        return '';
      }
    });

    await interaction.deferReply({ ephemeral: true });

    // Re-check limits (user might have opened another ticket while filling in the modal)
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

    await interaction.editReply(
      client.t('messages.ticketCreated', { channel: `<#${channel.id}>` })
    );
  },
};
