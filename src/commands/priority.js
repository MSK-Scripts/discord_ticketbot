const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, setPriority } = require('../database');
const { updateChannelTopic, refreshTicketMessage } = require('../utils/ticketActions');

// setTopic is rate-limited: 2 changes per 10 minutes per channel (same as rename)
const TOPIC_WARNING = '\n> ⚠️ *Das Channel-Topic wird gleich aktualisiert – Discord limitiert Topic-Änderungen auf 2 pro 10 Minuten, das kann einen Moment dauern.*';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Setzt die Priorität des aktuellen Tickets.')
    .addStringOption(opt =>
      opt.setName('stufe')
         .setDescription('Prioritätsstufe')
         .setRequired(true)
         .addChoices(
           { name: '🟢 Niedrig',  value: 'low'    },
           { name: '🟡 Mittel',   value: 'medium' },
           { name: '🟠 Hoch',     value: 'high'   },
           { name: '🔴 Dringend', value: 'urgent' },
         )
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    // Guarantee non-null channel
    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: '❌ Kanal nicht gefunden.', flags: MessageFlags.Ephemeral });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

    const priority = interaction.options.getString('stufe');
    if (ticket.priority === priority) {
      return interaction.reply({
        content: `ℹ️ Die Priorität ist bereits auf **${client.t(`priorities.${priority}`)}** gesetzt.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    setPriority(interaction.channelId, priority);

    const label = client.t(`priorities.${priority}`);

    // Reply immediately with rate-limit warning
    await interaction.reply(
      client.t('messages.priorityChanged', { priority: label }) + TOPIC_WARNING
    );

    // Update channel topic (fire-and-forget — rate-limited, may be queued)
    updateChannelTopic(channel, ticket, { priority, claimedBy: ticket.claimed_by ?? null }, client);

    // Update opening embed priority + button row (no rate-limit)
    await refreshTicketMessage(
      channel,
      !!ticket.claimed_by,
      ticket,
      { priority, claimedBy: ticket.claimed_by ?? null },
      client
    );
  },
};
