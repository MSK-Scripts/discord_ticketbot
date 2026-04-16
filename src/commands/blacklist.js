const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { addToBlacklist, removeFromBlacklist, isBlacklisted, getBlacklist } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Verwalte die Ticket-Blacklist.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('add')
         .setDescription('Nutzer zur Blacklist hinzufügen.')
         .addUserOption(o => o.setName('nutzer').setDescription('Nutzer').setRequired(true))
         .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(false).setMaxLength(200))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
         .setDescription('Nutzer von der Blacklist entfernen.')
         .addUserOption(o => o.setName('nutzer').setDescription('Nutzer').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
         .setDescription('Alle geblacklisteten Nutzer anzeigen.')
    ),

  async execute(client, interaction) {
    const sub  = interaction.options.getSubcommand();
    const user = interaction.options.getUser('nutzer');

    if (sub === 'add') {
      if (isBlacklisted(user.id, interaction.guildId)) {
        return interaction.reply({
          content: client.t('messages.blacklistAlreadyAdded', { user: `<@${user.id}>` }),
          flags: MessageFlags.Ephemeral,
        });
      }
      addToBlacklist({
        userId:  user.id,
        guildId: interaction.guildId,
        reason:  interaction.options.getString('grund') ?? null,
        addedBy: interaction.user.id,
      });
      return interaction.reply(client.t('messages.blacklistAdded', { user: `<@${user.id}>` }));
    }

    if (sub === 'remove') {
      if (!isBlacklisted(user.id, interaction.guildId)) {
        return interaction.reply({
          content: client.t('messages.blacklistNotFound', { user: `<@${user.id}>` }),
          flags: MessageFlags.Ephemeral,
        });
      }
      removeFromBlacklist(user.id);
      return interaction.reply(client.t('messages.blacklistRemoved', { user: `<@${user.id}>` }));
    }

    if (sub === 'list') {
      const list = getBlacklist(interaction.guildId);
      if (list.length === 0) {
        return interaction.reply({ content: '✅ Die Blacklist ist leer.', flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setTitle('🚫 Ticket-Blacklist')
        .setColor(0xed4245)
        .setTimestamp()
        .setFooter({ text: `${list.length} Einträge` })
        .setDescription(
          list.slice(0, 20).map(entry => {
            const ts = `<t:${Math.floor(entry.added_at / 1000)}:R>`;
            return `<@${entry.user_id}> — von <@${entry.added_by}> ${ts}${entry.reason ? `\n> ${entry.reason}` : ''}`;
          }).join('\n\n')
        );

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};
