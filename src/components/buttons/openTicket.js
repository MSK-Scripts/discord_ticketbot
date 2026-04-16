const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
} = require('discord.js');
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_open',

  async execute(client, interaction) {
    const cfg        = client.config;
    const ticketType = cfg.ticketTypes[0];
    const user       = interaction.user;

    if (isBlacklisted(user.id, interaction.guildId)) {
      return interaction.reply({ content: client.t('messages.blacklisted'), flags: MessageFlags.Ephemeral });
    }

    if (cfg.maxTicketOpened > 0) {
      const open = getOpenTicketsByUser(user.id, interaction.guildId);
      if (open.length >= cfg.maxTicketOpened) {
        return interaction.reply({
          content: client.t('messages.ticketLimitReached', { limit: String(cfg.maxTicketOpened) }),
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
      return interaction.editReply('❌ Ticket konnte nicht erstellt werden.');
    }

    await interaction.editReply(client.t('messages.ticketCreated', { channel: `<#${channel.id}>` }));
  },
};

function buildQuestionsModal(ticketType) {
  const modal = new ModalBuilder()
    .setCustomId(`tb_modalQuestions:${ticketType.codeName}`)
    .setTitle(ticketType.name.substring(0, 45));

  const rows = ticketType.questions.slice(0, 5).map(q =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(q.label.toLowerCase().replace(/\s+/g, '_').substring(0, 45))
        .setLabel(q.label.substring(0, 45))
        .setPlaceholder(q.placeholder?.substring(0, 100) ?? '')
        .setStyle(q.style === 'PARAGRAPH' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setMaxLength(q.maxLength ?? 500)
        .setRequired(true)
    )
  );

  modal.addComponents(...rows);
  return modal;
}

module.exports.buildQuestionsModal = buildQuestionsModal;
