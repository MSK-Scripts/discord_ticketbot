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

    // ── Reply immediately so Discord doesn't time out ─────────────────────────
    await interaction.reply(client.t('messages.ticketRenamed', { name: newName }));

    // ── Rename in background ──────────────────────────────────────────────────
    await interaction.channel.setName(newName).catch(err => {
      client.logger.warn(`[Rename] Could not rename channel: ${err.message}`);
    });
  },
};
