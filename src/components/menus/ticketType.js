const { MessageFlags } = require('discord.js');
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');
const { buildQuestionsModal } = require('../buttons/openTicket');

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

    if (ticketType.askQuestions && ticketType.questions?.length > 0) {
      return interaction.showModal(buildQuestionsModal(ticketType));
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = await openTicket(client, interaction.guild, user, ticketType, []);
    if (!channel) {
      return interaction.editReply('❌ Ticket konnte nicht erstellt werden. Bitte versuche es erneut.');
    }

    await interaction.editReply(client.t('messages.ticketCreated', { channel: `<#${channel.id}>` }));
  },
};
