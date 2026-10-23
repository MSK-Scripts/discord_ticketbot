const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { addToBlacklist, removeFromBlacklist, isBlacklisted, getBlacklist } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage the ticket blacklist.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('add')
         .setDescription('Add a user to the blacklist.')
         .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
         .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(200))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
         .setDescription('Remove a user from the blacklist.')
         .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
         .setDescription('Show all blacklisted users.')
    ),

  async execute(client, interaction) {
    const sub  = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');

    if (sub === 'add') {
      if (await isBlacklisted(user.id, interaction.guildId)) {
        return interaction.reply({
          content: client.t('messages.blacklistAlreadyAdded', { user: `<@${user.id}>` }),
          flags: MessageFlags.Ephemeral,
        });
      }
      await addToBlacklist({
        userId:  user.id,
        guildId: interaction.guildId,
        reason:  interaction.options.getString('reason') ?? null,
        addedBy: interaction.user.id,
      });
      return interaction.reply(client.t('messages.blacklistAdded', { user: `<@${user.id}>` }));
    }

    if (sub === 'remove') {
      if (!await isBlacklisted(user.id, interaction.guildId)) {
        return interaction.reply({
          content: client.t('messages.blacklistNotFound', { user: `<@${user.id}>` }),
          flags: MessageFlags.Ephemeral,
        });
      }
      await removeFromBlacklist(user.id, interaction.guildId);
      return interaction.reply(client.t('messages.blacklistRemoved', { user: `<@${user.id}>` }));
    }

    if (sub === 'list') {
      const list = await getBlacklist(interaction.guildId);
      if (list.length === 0) {
        return interaction.reply({ content: client.t('messages.blacklistEmpty'), flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setTitle(client.t('embeds.blacklistList.title'))
        .setColor(0xed4245)
        .setTimestamp()
        .setFooter({ text: client.t('embeds.blacklistList.footer', { count: String(list.length) }) })
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
