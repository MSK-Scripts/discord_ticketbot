const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { getTicketByChannel } = require('../database');

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

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
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }

    const priority = interaction.options.getString('stufe');
    require('../database').setPriority(interaction.channelId, priority);

    const label = client.t(`priorities.${priority}`);
    await interaction.reply(client.t('messages.priorityChanged', { priority: label }));
  },
};
