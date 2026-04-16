const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { getTicketByChannel } = require('../../database');

module.exports = {
  customId: 'tb_delete',

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    const ticket = getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

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
      flags: MessageFlags.Ephemeral,
    });
  },
};
