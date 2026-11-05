/**
 * Button: tb_open
 * Always the entry point — shown in every ticket panel regardless of type count.
 *
 * Behaviour (only counting the types this member may open, see
 * getTypeAccessRefusal: `cantAccess` and `requiredRoles`):
 *  - Multiple types → show ephemeral select menu (fresh each time, no Discord cache issue)
 *  - Single type, has questions → show questions modal
 *  - Single type, no questions  → open ticket directly
 *  - No type left → the refusal of the first configured type
 */
const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags,
} = require('discord.js');
const { openTicket, getOpenRefusal, getTypeAccessRefusal, refusalText } = require('../../utils/ticketActions');

// How long (ms) the "ticket created" confirmation stays visible before auto-delete
const SUCCESS_DELETE_DELAY = 10_000;

module.exports = {
  customId: 'tb_open',

  async execute(client, interaction) {
    const cfg  = client.config;
    const user = interaction.user;

    // ── Types this member may open ────────────────────────────────────────────
    // This list is ephemeral, so it can be personal: types blocked by
    // `cantAccess` or missing a `requiredRoles` role are left out. The select
    // handler still runs the full check on the picked type.
    const openable = cfg.ticketTypes.filter(t => !getTypeAccessRefusal(interaction.member, t));

    // ── Guard checks ──────────────────────────────────────────────────────────
    // With one type, check it right away; with several, the type-specific
    // checks run once a type is picked. With none left, checking the first
    // configured type yields its type refusal (after blacklist and blocked
    // roles, which take precedence).
    const checkType = openable.length === 1 ? openable[0]
                    : openable.length === 0 ? cfg.ticketTypes[0]
                    : null;
    const refusal   = await getOpenRefusal(client, interaction.member, checkType)
                   ?? (openable.length === 0 ? { key: 'messages.noAccessToType' } : null);
    if (refusal) {
      return interaction.reply({ content: refusalText(client, refusal), flags: MessageFlags.Ephemeral });
    }

    // ── Multiple types → ephemeral select menu ────────────────────────────────
    if (openable.length > 1) {
      const options = openable.map(t =>
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
        content: client.t('messages.selectCategory'),
        components: [new ActionRowBuilder().addComponents(menu)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Single type ───────────────────────────────────────────────────────────
    const ticketType = openable[0];

    // Has questions → show modal (the panel button interaction is consumed by the modal)
    if (ticketType.askQuestions && ticketType.questions?.length > 0) {
      return interaction.showModal(buildQuestionsModal(ticketType));
    }

    // No questions → open directly, show success for 10s then delete
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { channel, refusal: openRefusal } = await openTicket(client, interaction.guild, user, ticketType, []);
    if (!channel) {
      return interaction.editReply(openRefusal ? refusalText(client, openRefusal) : client.t('messages.ticketCreateFailed'));
    }

    await interaction.editReply(client.t('messages.ticketCreated', { channel: `<#${channel.id}>` }));
    setTimeout(() => interaction.deleteReply().catch(() => null), SUCCESS_DELETE_DELAY);
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

  const rows = ticketType.questions.slice(0, 5).map((q, i) =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        // Index-based custom IDs (q_0 … q_4) guarantee uniqueness — deriving them
        // from the label could collide when two labels normalise to the same string.
        .setCustomId(`q_${i}`)
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
