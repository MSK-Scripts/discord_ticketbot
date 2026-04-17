const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, setPriority } = require('../database');
const { updateChannelTopic } = require('../utils/ticketActions');

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

    // Guarantee non-null channel — required for setTopic
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

    // Reply first, then update topic (setTopic has no rate-limit)
    await interaction.reply(client.t('messages.priorityChanged', { priority: label }));

    // Pass the current claimed_by from DB so the topic stays accurate
    await updateChannelTopic(channel, ticket, { priority, claimedBy: ticket.claimed_by ?? null }, client);
  },
};
