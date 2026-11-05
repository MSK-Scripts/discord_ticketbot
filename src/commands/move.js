const {
  SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags,
} = require('discord.js');
const { typeOption } = require('../utils/typeOption');
const { getTicketByChannel } = require('../database');
const { performMove } = require('../utils/ticketActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move the ticket to a different type/category.'),

  async execute(client, interaction) {
    if (!(await client.isStaffIn(interaction.member, interaction.channelId))) {
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

    const options = types.map(t => typeOption(t));

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
