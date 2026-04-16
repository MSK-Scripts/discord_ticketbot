const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../database');

const RENAME_WARNING = '\n> ⚠️ *Der Kanalname wird gleich aktualisiert – Discord limitiert Umbenennungen, das kann einen Moment dauern.*';

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

    // Reply immediately — rename happens in background
    await interaction.reply(
      client.t('messages.ticketRenamed', { name: newName }) + RENAME_WARNING
    );

    await interaction.channel.setName(newName).catch(err => {
      client.logger.warn(`[Rename] Could not rename channel: ${err.message}`);
    });
  },
};
