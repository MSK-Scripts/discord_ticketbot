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
    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }

    const cfg = client.config.closeOption;
    if (cfg.whoCanCloseTicket === 'STAFFONLY' && !client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    // Guarantee a non-null channel object
    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: '❌ Kanal nicht gefunden.', flags: MessageFlags.Ephemeral });
    }

    const reason = interaction.options.getString('grund') ?? null;

    await interaction.reply({
      content: '⏳ **Das Ticket wird geschlossen.** Bitte warte einen Moment, das Transcript wird erstellt...',
      flags: MessageFlags.Ephemeral,
    });

    await performClose(client, channel, ticket, interaction.user, reason);
  },
};
