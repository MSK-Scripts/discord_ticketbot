/**
 * Command: /broadcast
 * Sends a message to all open ticket channels.
 * Optionally filtered by ticket type.
 * Staff-only.
 */
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getAllOpenTickets } = require('../database');
const { parseColor } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('Send a message to all open ticket channels')
    .addStringOption(opt =>
      opt
        .setName('message')
        .setDescription('The message to broadcast')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('Only broadcast to a specific ticket type (leave empty for all)')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt
        .setName('embed')
        .setDescription('Send as an embed? (default: true)')
        .setRequired(false)
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({
        content: client.t('messages.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
    }

    const message    = interaction.options.getString('message', true);
    const typeFilter = interaction.options.getString('type') ?? null;
    const asEmbed    = interaction.options.getBoolean('embed') ?? true;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tickets = await getAllOpenTickets(interaction.guildId, typeFilter);

    if (tickets.length === 0) {
      return interaction.editReply(client.t('messages.broadcastNoTickets'));
    }

    let sent   = 0;
    let failed = 0;

    for (const ticket of tickets) {
      try {
        const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
        if (!channel) { failed++; continue; }

        const payload = asEmbed
          ? {
              embeds: [
                new EmbedBuilder()
                  .setAuthor({
                    name:    client.t('embeds.broadcast.author', { user: interaction.user.username }),
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setDescription(message)
                  .setColor(parseColor(client.config.mainColor))
                  .setTimestamp(),
              ],
            }
          : { content: client.t('embeds.broadcast.plain', { message }) };

        await channel.send(payload);
        sent++;
      } catch {
        failed++;
      }
    }

    return interaction.editReply(
      failed > 0
        ? client.t('messages.broadcastResultFailed', { sent: String(sent), failed: String(failed) })
        : client.t('messages.broadcastResult', { sent: String(sent) })
    );
  },
};
