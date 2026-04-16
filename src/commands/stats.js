const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    const targetUser = interaction.options.getUser('nutzer');

    if (targetUser) {
      const stats = getUserStats(targetUser.id, interaction.guildId);
      return interaction.reply({ embeds: [userStatsEmbed(client, targetUser, stats)] });
    }

    const stats = getStats(interaction.guildId);
    return interaction.reply({ embeds: [statsEmbed(client, stats)] });
  },
};
