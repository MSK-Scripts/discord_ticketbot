const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, setPriority } = require('../database');

// Emoji prefix for each priority level, shown in the channel name
const PRIORITY_EMOJI = {
  low:    '🟢',
  medium: '🟡',
  high:   '🟠',
  urgent: '🔴',
};

/**
 * Strip any existing priority emoji prefix from a channel name and
 * prepend the new one.
 * e.g. "🟡-ticket-max" → "🔴-ticket-max"
 *      "ticket-max"    → "🔴-ticket-max"
 *
 * @param {string} currentName
 * @param {string} priority
 * @returns {string}
 */
function applyPriorityPrefix(currentName, priority) {
  // Remove leading priority emoji + separator if present
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

    // ── Save to DB ────────────────────────────────────────────────────────────
    setPriority(interaction.channelId, priority);

    // ── Rename the channel with priority emoji prefix ─────────────────────────
    const newName = applyPriorityPrefix(interaction.channel.name, priority);
    await interaction.channel.setName(newName).catch(err => {
      client.logger.warn(`[Priority] Could not rename channel: ${err.message}`);
    });

    // ── Post confirmation message ─────────────────────────────────────────────
    const label = client.t(`priorities.${priority}`);
    await interaction.reply(client.t('messages.priorityChanged', { priority: label }));
  },
};
