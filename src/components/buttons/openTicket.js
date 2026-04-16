/**
 * Button: tb_open
 * Always the entry point — shown in every ticket panel regardless of type count.
 *
 * Behaviour:
 *  - Multiple types → show ephemeral select menu (fresh each time, no Discord cache issue)
 *  - Single type, has questions → show questions modal
 *  - Single type, no questions  → open ticket directly
 */
const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags,
} = require('discord.js');
const { isBlacklisted, getOpenTicketsByUser } = require('../../database');
const { openTicket } = require('../../utils/ticketActions');

module.exports = {
  customId: 'tb_open',

  async execute(client, interaction) {
    const cfg  = client.config;
    const user = interaction.user;

    // ── Guard checks ──────────────────────────────────────────────────────────
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

    // ── Multiple types → ephemeral select menu ────────────────────────────────
    // Sending the menu as an ephemeral reply means Discord creates a fresh
    // interaction every time — the previously selected value is never cached.
    if (cfg.ticketTypes.length > 1) {
      const options = cfg.ticketTypes.map(t =>
        new StringSelectMenuOptionBuilder()
          .setLabel(t.name)
          .setDescription(t.description?.substring(0, 100) ?? '')
          .setValue(t.codeName)
          .setEmoji(t.emoji || '🎫')
      );

      const menu = new StringSelectMenuBuilder()
        .setCustomId('tb_selectType')
        .setPlaceholder(client.t('menus.ticketType'))
        .addOptions(options);

      return interaction.reply({
        content: '🎫 Bitte wähle eine Kategorie:',
        components: [new ActionRowBuilder().addComponents(menu)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Single type ───────────────────────────────────────────────────────────
    const ticketType = cfg.ticketTypes[0];

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
