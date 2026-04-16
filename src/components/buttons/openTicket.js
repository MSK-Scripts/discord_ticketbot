/**
 * Button: tb_open
 * Triggered when there is only ONE ticket type configured.
 * Directly opens a ticket (or shows a modal if questions are configured).
 */
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_open',

  async execute(client, interaction) {
    const cfg        = client.config;
    const ticketType = cfg.ticketTypes[0];
    const user       = interaction.user;

    // ── Guard checks ────────────────────────────────────────────────────────
    if (isBlacklisted(user.id, interaction.guildId)) {
      return interaction.reply({ content: client.t('messages.blacklisted'), ephemeral: true });
    }

    if (cfg.maxTicketOpened > 0) {
      const open = getOpenTicketsByUser(user.id, interaction.guildId);
      if (open.length >= cfg.maxTicketOpened) {
        return interaction.reply({
          content: client.t('messages.ticketLimitReached', { limit: String(cfg.maxTicketOpened) }),
          ephemeral: true,
        });
      }
    }

    // ── Show modal if questions are configured ───────────────────────────────
    if (ticketType.askQuestions && ticketType.questions?.length > 0) {
      const modal = buildQuestionsModal(ticketType);
      return interaction.showModal(modal);
    }

    // ── Open ticket directly ─────────────────────────────────────────────────
    await interaction.deferReply({ ephemeral: true });

    const channel = await openTicket(client, interaction.guild, user, ticketType, []);
    if (!channel) {
      return interaction.editReply('❌ Ticket konnte nicht erstellt werden.');
    }

    await interaction.editReply(
      client.t('messages.ticketCreated', { channel: `<#${channel.id}>` })
    );
  },
};

/**
 * Build a Discord modal from a ticket type's question list.
 * @param {object} ticketType
 * @returns {ModalBuilder}
 */
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
