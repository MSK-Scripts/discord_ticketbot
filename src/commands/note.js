const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTicketByChannel, addNote, getNotes } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Verwalte Staff-Notizen für dieses Ticket.')
    .addSubcommand(sub =>
      sub.setName('add')
         .setDescription('Notiz hinzufügen.')
         .addStringOption(opt =>
           opt.setName('text')
              .setDescription('Inhalt der Notiz')
              .setRequired(true)
              .setMaxLength(1000)
         )
    )
    .addSubcommand(sub =>
      sub.setName('list')
         .setDescription('Alle Notizen dieses Tickets anzeigen.')
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const text = interaction.options.getString('text');
      addNote(ticket.id, interaction.user.id, text);
      await interaction.reply({ content: client.t('messages.noteAdded'), ephemeral: true });
    }

    if (sub === 'list') {
      const notes = getNotes(ticket.id);
      if (notes.length === 0) {
        return interaction.reply({ content: '📝 Keine Notizen für dieses Ticket.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📝 Staff-Notizen — Ticket #${ticket.id}`)
        .setColor(0x5865f2)
        .setTimestamp();

      for (const note of notes) {
        const ts = `<t:${Math.floor(note.created_at / 1000)}:R>`;
        embed.addFields({
          name: `<@${note.author_id}> ${ts}`,
          value: note.content,
          inline: false,
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
