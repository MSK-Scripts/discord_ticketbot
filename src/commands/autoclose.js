/**
 * Command: /autoclose pause & /autoclose resume (subcommands)
 * Pauses or resumes the inactivity handling for THIS ticket — the auto-close
 * warning + closure, and the staff-inactivity reminder. Useful when a ticket is
 * deliberately parked (waiting on a third party) and must not be nagged or closed.
 * Staff-only.
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, setAutoClosePaused } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoclose')
    .setDescription('Pause or resume inactivity alerts and auto-closing for this ticket')
    .addSubcommand(sub =>
      sub
        .setName('pause')
        .setDescription('Stop this ticket from being auto-closed or pinged for inactivity')
    )
    .addSubcommand(sub =>
      sub
        .setName('resume')
        .setDescription('Let the normal inactivity rules apply to this ticket again')
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({
        content: client.t('messages.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
    }

    const ticket = await getTicketByChannel(interaction.channelId);

    if (!ticket) {
      return interaction.reply({
        content: client.t('messages.notATicket'),
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.status !== 'open') {
      return interaction.reply({
        content: client.t('messages.ticketAlreadyClosed'),
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();
    const isPaused = !!ticket.auto_close_paused;

    // ── /autoclose pause ───────────────────────────────────────────────────────
    if (sub === 'pause') {
      if (isPaused) {
        return interaction.reply({
          content: client.t('messages.autoCloseAlreadyPaused'),
          flags: MessageFlags.Ephemeral,
        });
      }

      await setAutoClosePaused(interaction.channelId, true);
      // Drop any pending "will be auto-closed" warning flag so a later resume
      // starts clean (the warning fires fresh once inactivity rules apply again).
      client.autoCloseWarned?.delete(interaction.channelId);

      return interaction.reply({
        embeds: [{
          description: client.t('embeds.autoClosePaused.description', { user: `<@${interaction.user.id}>` }),
          color: 0xfee75c,
        }],
      });
    }

    // ── /autoclose resume ──────────────────────────────────────────────────────
    if (sub === 'resume') {
      if (!isPaused) {
        return interaction.reply({
          content: client.t('messages.autoCloseNotPaused'),
          flags: MessageFlags.Ephemeral,
        });
      }

      // Resuming refreshes last_activity in the DB, so the ticket gets a full
      // fresh inactivity window instead of closing immediately for the parked time.
      await setAutoClosePaused(interaction.channelId, false);
      client.autoCloseWarned?.delete(interaction.channelId);

      return interaction.reply({
        embeds: [{
          description: client.t('embeds.autoCloseResumed.description', { user: `<@${interaction.user.id}>` }),
          color: 0x57f287,
        }],
      });
    }
  },
};
