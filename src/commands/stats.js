const { SlashCommandBuilder } = require('discord.js');
const { getStats, getUserStats } = require('../database');
const { statsEmbed, userStatsEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Zeigt Ticket-Statistiken.')
    .addUserOption(opt =>
      opt.setName('nutzer')
         .setDescription('Statistiken für einen bestimmten Nutzer anzeigen')
         .setRequired(false)
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const targetUser = interaction.options.getUser('nutzer');

    if (targetUser) {
      // ── Per-user stats ──────────────────────────────────────────────────
      const stats = getUserStats(targetUser.id, interaction.guildId);
      const embed = userStatsEmbed(client, targetUser, stats);
      return interaction.reply({ embeds: [embed] });
    }

    // ── Server-wide stats ───────────────────────────────────────────────
    const stats = getStats(interaction.guildId);
    const embed = statsEmbed(client, stats);
    return interaction.reply({ embeds: [embed] });
  },
};
