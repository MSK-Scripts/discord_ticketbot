/**
 * Button: tb_delete
 * Permanently deletes the ticket channel (staff only).
 * Shows a confirmation step first.
 */
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getTicketByChannel } = require('../../database');

module.exports = {
  customId: 'tb_delete',

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), ephemeral: true });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), ephemeral: true });
    }

    // Confirmation step
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tb_deleteConfirm')
        .setLabel('Ja, Ticket löschen')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('tb_deleteCancel')
        .setLabel('Abbrechen')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: '⚠️ **Bist du sicher?** Der Ticket-Kanal wird unwiderruflich gelöscht.',
      components: [row],
      ephemeral: true,
    });
  },
};
