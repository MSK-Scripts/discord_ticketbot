const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../database');
const { performClose } = require('../utils/ticketActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Schließt das aktuelle Ticket.')
    .addStringOption(opt =>
      opt.setName('grund').setDescription('Grund für die Schließung').setRequired(false)
    ),

  async execute(client, interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket)                  return interaction.editReply(client.t('messages.notATicket'));
    if (ticket.status !== 'open') return interaction.editReply(client.t('messages.ticketAlreadyClosed'));

    const cfg = client.config.closeOption;
    if (cfg.whoCanCloseTicket === 'STAFFONLY' && !client.isStaff(interaction.member)) {
      return interaction.editReply(client.t('messages.onlyStaff'));
    }

    const reason = interaction.options.getString('grund') ?? null;
    await interaction.editReply('⏳ Ticket wird geschlossen...');
    await performClose(client, interaction.channel, ticket, interaction.user, reason);
  },
};
