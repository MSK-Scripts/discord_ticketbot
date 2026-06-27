const {
  SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ActionRowBuilder, MessageFlags,
} = require('discord.js');
const { getTicketByChannel } = require('../database');
const { performMove } = require('../utils/ticketActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move the ticket to a different type/category.'),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }
    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }
    if (ticket.status !== 'open') {
      return interaction.reply({ content: client.t('messages.ticketAlreadyClosed'), flags: MessageFlags.Ephemeral });
    }

    const types = client.config.ticketTypes.filter(t => t.codeName !== ticket.type);
    if (types.length === 0) {
      return interaction.reply({
        content: client.t('messages.noOtherTypes'),
        flags: MessageFlags.Ephemeral,
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
      .setPlaceholder(client.t('menus.moveTarget'))
      .addOptions(options);

    await interaction.reply({
      content: client.t('messages.selectMoveTarget'),
      components: [new ActionRowBuilder().addComponents(menu)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
