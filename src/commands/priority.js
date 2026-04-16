const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, setPriority } = require('../database');

const PRIORITY_EMOJI = {
  low:    '🟢',
  medium: '🟡',
  high:   '🟠',
  urgent: '🔴',
};

const RENAME_WARNING = '\n> ⚠️ *Der Kanalname wird gleich aktualisiert – Discord limitiert Umbenennungen, das kann einen Moment dauern.*';

function applyPriorityPrefix(currentName, priority) {
  const stripped = currentName.replace(/^[🟢🟡🟠🔴][-_]?/, '');
  return `${PRIORITY_EMOJI[priority]}-${stripped}`.substring(0, 100);
}

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

    const label   = client.t(`priorities.${priority}`);
    const newName = applyPriorityPrefix(interaction.channel.name, priority);

    // Reply immediately — rename happens in background
    await interaction.reply(
      client.t('messages.priorityChanged', { priority: label }) + RENAME_WARNING
    );

    await interaction.channel.setName(newName).catch(err => {
      client.logger.warn(`[Priority] Could not rename channel: ${err.message}`);
    });
  },
};
