/**
 * Command: /lock & /unlock (subcommands)
 * Locks or unlocks a ticket — prevents the creator and added users from sending messages.
 * Staff-only.
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, lockTicket, unlockTicket } = require('../database');
const { editParticipantAccess } = require('../utils/ticketActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock or unlock a ticket channel')
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('Lock this ticket — user cannot send messages until unlocked')
        .addStringOption(opt =>
          opt
            .setName('reason')
            .setDescription('Optional reason for locking')
            .setRequired(false)
            .setMaxLength(300)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Unlock this ticket — restore the user\'s ability to send messages')
    ),

  async execute(client, interaction) {
    if (!(await client.isStaffIn(interaction.member, interaction.channelId))) {
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

    // Ensure we have a usable channel reference
    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({
        content: client.t('messages.channelNotFound'),
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();

    // ── /lock lock ─────────────────────────────────────────────────────────────
    if (sub === 'lock') {
      if (ticket.locked) {
        return interaction.reply({
          content: client.t('messages.alreadyLocked'),
          flags: MessageFlags.Ephemeral,
        });
      }

      const reason = interaction.options.getString('reason') ?? null;

      // One permission edit per participant can outlast Discord's 3 s reply
      // window, so acknowledge first.
      await interaction.deferReply();

      // Remove SendMessages from the creator and every /add-ed user
      await editParticipantAccess(client, channel, ticket, { SendMessages: false });

      await lockTicket(interaction.channelId);

      return interaction.editReply({
        embeds: [{
          description: reason
            ? client.t('embeds.locked.withReason', { user: `<@${interaction.user.id}>`, reason })
            : client.t('embeds.locked.description', { user: `<@${interaction.user.id}>` }),
          color: 0xed4245,
        }],
      });
    }

    // ── /lock unlock ───────────────────────────────────────────────────────────
    if (sub === 'unlock') {
      if (!ticket.locked) {
        return interaction.reply({
          content: client.t('messages.notLocked'),
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();

      // Restore SendMessages for the creator and every /add-ed user
      await editParticipantAccess(client, channel, ticket, { SendMessages: true });

      await unlockTicket(interaction.channelId);

      return interaction.editReply({
        embeds: [{
          description: client.t('embeds.unlocked.description', { user: `<@${interaction.user.id}>` }),
          color: 0x57f287,
        }],
      });
    }
  },
};
