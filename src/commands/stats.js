const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getStats, getUserStats } = require('../database');
const { statsEmbed, userStatsEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show ticket statistics.')
    .addUserOption(opt =>
      opt.setName('user')
         .setDescription('Show statistics for a specific user')
         .setRequired(false)
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    const targetUser = interaction.options.getUser('user');

    if (targetUser) {
      const stats = await getUserStats(targetUser.id, interaction.guildId);
      return interaction.reply({ embeds: [userStatsEmbed(client, targetUser, stats)] });
    }

    const stats = await getStats(interaction.guildId);
    return interaction.reply({ embeds: [statsEmbed(client, stats)] });
  },
};
