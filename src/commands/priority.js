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

    // Reply immediately, then update topic (no rate-limit)
    const label = client.t(`priorities.${priority}`);
    await interaction.reply(client.t('messages.priorityChanged', { priority: label }));
    await updateChannelTopic(interaction.channel, ticket, { priority }, client);
  },
};
