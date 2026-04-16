const { MessageFlags } = require('discord.js');

module.exports = {
  name: 'interactionCreate',

  async execute(client, interaction) {
    try {
      // ── Slash commands ──────────────────────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(client, interaction);
        return;
      }

      // ── Buttons, Select Menus, Modals ───────────────────────────────────────
      if (
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()
      ) {
        const customId = interaction.customId;

        if (client.components.has(customId)) {
          await client.components.get(customId).execute(client, interaction);
          return;
        }

        const prefix = customId.split(':')[0];
        if (client.components.has(prefix)) {
          await client.components.get(prefix).execute(client, interaction);
          return;
        }

        client.logger.warn(`[Interactions] No handler for customId: ${customId}`);
      }
    } catch (err) {
      client.logger.error('[Interactions] Unhandled error:', err);

      const reply = { content: '❌ Ein interner Fehler ist aufgetreten.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => null);
      } else {
        await interaction.reply(reply).catch(() => null);
      }
    }
  },
};
