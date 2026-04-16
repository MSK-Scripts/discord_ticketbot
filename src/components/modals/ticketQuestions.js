const { MessageFlags } = require('discord.js');
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');

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

    await interaction.editReply(client.t('messages.ticketCreated', { channel: `<#${channel.id}>` }));
  },
};
