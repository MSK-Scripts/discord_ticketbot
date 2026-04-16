const { SlashCommandBuilder } = require('discord.js');
const { getTicketByChannel } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('Benennt den Ticket-Kanal um.')
    .addStringOption(opt =>
      opt.setName('name')
         .setDescription('Neuer Kanalname')
         .setRequired(true)
         .setMinLength(2)
         .setMaxLength(100)
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }

    const newName = interaction.options.getString('name')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    try {
      await interaction.channel.setName(newName);
      await interaction.reply(client.t('messages.ticketRenamed', { name: newName }));
    } catch (err) {
      client.logger.error('[Rename] Error:', err);
      await interaction.reply({ content: '❌ Umbenennung fehlgeschlagen.', ephemeral: true });
    }
  },
};
