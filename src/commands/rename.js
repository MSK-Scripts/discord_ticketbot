const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

    const newName = interaction.options.getString('name')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Reply first — setName can be slow due to Discord rate-limits (2/10min per channel)
    await interaction.reply(
      client.t('messages.ticketRenamed', { name: newName }) +
      '\n> ⚠️ *Discord limitiert Umbenennungen auf 2 pro 10 Minuten – der neue Name erscheint in Kürze.*'
    );

    await interaction.channel.setName(newName).catch(err => {
      client.logger.warn(`[Rename] Could not rename channel: ${err.message}`);
    });
  },
};
