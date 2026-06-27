/**
 * Command: /lock & /unlock (subcommands)
 * Locks or unlocks a ticket — prevents the creator from sending messages.
 * Staff-only.
 */
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, lockTicket, unlockTicket } = require('../database');

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

      // Remove SendMessages from the ticket creator
      await channel.permissionOverwrites.edit(ticket.creator_id, {
        SendMessages: false,
      }).catch(err => client.logger.warn(`[Lock] Permission edit failed: ${err.message}`));

      await lockTicket(interaction.channelId);

      return interaction.reply({
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

      // Restore SendMessages for the ticket creator
      await channel.permissionOverwrites.edit(ticket.creator_id, {
        SendMessages: true,
      }).catch(err => client.logger.warn(`[Unlock] Permission edit failed: ${err.message}`));

      await unlockTicket(interaction.channelId);

      return interaction.reply({
        embeds: [{
          description: client.t('embeds.unlocked.description', { user: `<@${interaction.user.id}>` }),
          color: 0x57f287,
        }],
      });
    }
  },
};
