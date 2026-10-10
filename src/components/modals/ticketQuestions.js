/**
 * Modal: tb_modalQuestions (prefix match, e.g. tb_modalQuestions:support)
 * Submitted when the user fills in the ticket-type question modal.
 *
 * After successful ticket creation the ephemeral confirmation is shown for
 * 10 seconds and then automatically deleted.
 */
const { MessageFlags } = require('discord.js');
const { openTicket, refusalText } = require('../../utils/ticketActions');

const SUCCESS_DELETE_DELAY = 10_000;

module.exports = {
  customId: 'tb_modalQuestions',

  async execute(client, interaction) {
    const typeCode   = interaction.customId.split(':')[1];
    const ticketType = client.config.ticketTypes.find(t => t.codeName === typeCode);

    if (!ticketType) {
      return interaction.reply({ content: client.t('messages.unknownTicketType'), flags: MessageFlags.Ephemeral });
    }

    // Keys must match the index-based custom IDs set in buildQuestionsModal (q_0 … q_4).
    const answers = (ticketType.questions ?? []).slice(0, 5).map((q, i) => {
      try { return interaction.fields.getTextInputValue(`q_${i}`) ?? ''; } catch { return ''; }
    });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // openTicket re-runs every eligibility check (blacklist, blocked roles, type
    // access, open-ticket limit), since things may have changed while the user
    // was filling in the form.
    const { channel, refusal } = await openTicket(client, interaction.guild, interaction.user, ticketType, answers);
    if (!channel) {
      return interaction.editReply(refusal ? refusalText(client, refusal) : client.t('messages.ticketCreateFailed'));
    }

    // Show success for 10 seconds, then auto-delete
    await interaction.editReply(client.t('messages.ticketCreated', { channel: `<#${channel.id}>` }));
    setTimeout(() => interaction.deleteReply().catch(() => null), SUCCESS_DELETE_DELAY);
  },
};
