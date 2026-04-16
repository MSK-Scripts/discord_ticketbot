/**
 * Button: tb_move
 * Opens an ephemeral select menu so staff can pick the target ticket type.
 * Only accessible by staff.
 */
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { getTicketByChannel } = require('../../database');

module.exports = {
  customId: 'tb_move',

  async execute(client, interaction) {
    // Staff-only
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), ephemeral: true });
    }

    // Exclude the current type from the options
    const types = client.config.ticketTypes.filter(t => t.codeName !== ticket.type);

    if (types.length === 0) {
      return interaction.reply({
        content: '❌ Es gibt keine anderen Ticket-Typen zum Verschieben.',
        ephemeral: true,
      });
    }

    const options = types.map(t =>
      new StringSelectMenuOptionBuilder()
        .setLabel(t.name)
        .setDescription(t.description?.substring(0, 100) ?? '')
        .setValue(t.codeName)
        .setEmoji(t.emoji || '🎫')
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('tb_moveSelect')
      .setPlaceholder('Neuen Ticket-Typ auswählen...')
      .addOptions(options);

    await interaction.reply({
      content: `🔀 **Ticket verschieben** (aktuell: **${ticket.type}**)\nWohin soll dieses Ticket verschoben werden?`,
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  },
};
