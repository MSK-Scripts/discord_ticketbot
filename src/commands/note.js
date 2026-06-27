const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, addNote, getNotes } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Manage staff notes for this ticket.')
    .addSubcommand(sub =>
      sub.setName('add')
         .setDescription('Add a note.')
         .addStringOption(opt =>
           opt.setName('text').setDescription('Content of the note').setRequired(true).setMaxLength(1000)
         )
    )
    .addSubcommand(sub =>
      sub.setName('list')
         .setDescription('Show all notes for this ticket.')
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      await addNote(ticket.id, interaction.user.id, interaction.options.getString('text'));
      return interaction.reply({ content: client.t('messages.noteAdded'), flags: MessageFlags.Ephemeral });
    }

    if (sub === 'list') {
      const notes = await getNotes(ticket.id); // chronological (oldest first)
      if (notes.length === 0) {
        return interaction.reply({ content: client.t('messages.notesEmpty'), flags: MessageFlags.Ephemeral });
      }

      // Respect Discord embed limits: max 25 fields AND ~6000 total characters.
      // Pick the newest notes (walking backwards) until either limit is hit,
      // then restore chronological order for display.
      const MAX_FIELDS  = 25;
      const CHAR_BUDGET = 5500;
      const selected    = [];
      let   usedChars   = 0;

      for (let i = notes.length - 1; i >= 0 && selected.length < MAX_FIELDS; i--) {
        const note   = notes[i];
        const header = `<@${note.author_id}> <t:${Math.floor(note.created_at / 1000)}:R>`;
        const cost   = header.length + (note.content?.length ?? 0);
        if (usedChars + cost > CHAR_BUDGET) break;
        usedChars += cost;
        selected.unshift(note);
      }

      const embed = new EmbedBuilder()
        .setTitle(client.t('embeds.staffNotes.title', { count: String(ticket.id) }))
        .setColor(0x5865f2)
        .setTimestamp();

      for (const note of selected) {
        embed.addFields({
          name:   `<@${note.author_id}> <t:${Math.floor(note.created_at / 1000)}:R>`,
          value:  note.content,
          inline: false,
        });
      }

      if (selected.length < notes.length) {
        embed.setFooter({
          text: client.t('embeds.staffNotes.footer', {
            shown: String(selected.length),
            total: String(notes.length),
          }),
        });
      }

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};
