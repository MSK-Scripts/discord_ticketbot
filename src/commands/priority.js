const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getTicketByChannel, setPriority } = require('../database');
const { updateChannelTopic, refreshTicketMessage } = require('../utils/ticketActions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Set the priority of the current ticket.')
    .addStringOption(opt =>
      opt.setName('level')
         .setDescription('Priority level')
         .setRequired(true)
         .addChoices(
           { name: '🟢 Niedrig',  value: 'low'    },
           { name: '🟡 Mittel',   value: 'medium' },
           { name: '🟠 Hoch',     value: 'high'   },
           { name: '🔴 Dringend', value: 'urgent' },
         )
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({ content: client.t('messages.onlyStaff'), flags: MessageFlags.Ephemeral });
    }

    // Guarantee non-null channel
    const channel = interaction.channel
      ?? await client.channels.fetch(interaction.channelId).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: client.t('messages.channelNotFound'), flags: MessageFlags.Ephemeral });
    }

    const ticket = await getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: client.t('messages.notATicket'), flags: MessageFlags.Ephemeral });
    }

    const priority = interaction.options.getString('level');
    if (ticket.priority === priority) {
      return interaction.reply({
        content: client.t('messages.priorityAlreadySet', { priority: client.t(`priorities.${priority}`) }),
        flags: MessageFlags.Ephemeral,
      });
    }

    await setPriority(interaction.channelId, priority);

    const label = client.t(`priorities.${priority}`);

    // Reply immediately with rate-limit warning
    await interaction.reply(
      client.t('messages.priorityChanged', { priority: label }) + client.t('messages.topicUpdateWarning')
    );

    // Update channel topic (fire-and-forget — rate-limited, may be queued)
    updateChannelTopic(channel, ticket, { priority, claimedBy: ticket.claimed_by ?? null }, client);

    // Update opening embed priority + button row (no rate-limit)
    await refreshTicketMessage(
      channel,
      !!ticket.claimed_by,
      ticket,
      { priority, claimedBy: ticket.claimed_by ?? null },
      client
    );
  },
};
