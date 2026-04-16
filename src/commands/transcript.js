const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../database');
const { generateTranscript } = require('../utils/transcript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transcript')
    .setDescription('Generiert ein HTML-Transcript des aktuellen Tickets.'),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const html   = await generateTranscript(interaction.channel, ticket, interaction.guild.name);
      const file   = new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `ticket-${ticket.id}.html` });
      await interaction.editReply({ content: client.t('messages.transcriptCreated'), files: [file] });
    } catch (err) {
      client.logger.error('[Transcript] Error:', err);
      await interaction.editReply('❌ Fehler beim Erstellen des Transcripts.');
    }
  },
};
