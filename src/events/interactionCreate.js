const { MessageFlags } = require('discord.js');

module.exports = {
  name: 'interactionCreate',

  async execute(client, interaction) {
    try {
      // ── Unfinished configuration ────────────────────────────────────────────
      // The bot boots with placeholders in config.jsonc so that its dashboard —
      // and with it the editor to fix them — is reachable at all. Everything it
      // could DO with those placeholders would end in a cryptic discord.js error
      // ("Supplied parameter is not a cached User or Role"), so it does nothing
      // and says why instead.
      //
      // The gate sits here, on the one dispatcher every command, button, menu and
      // modal passes through, and not in the handful of files that open tickets.
      // A per-handler check is a list that the next handler quietly falls off.
      if (client.configPending?.length > 0) {
        if (interaction.isAutocomplete()) return;   // cannot be answered with text
        await interaction.reply({
          content: client.t('messages.configError'),
          flags: MessageFlags.Ephemeral,
        }).catch(() => null);
        client.logger.warn(
          `[Interactions] Refused "${interaction.customId ?? interaction.commandName}" — ` +
          `${client.configPending.length} configuration field(s) still unset.`,
        );
        return;
      }

      // ── Slash commands ──────────────────────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(client, interaction);
        return;
      }

      // ── Context menu commands (right-click → Apps) ──────────────────────────
      // Same registry as slash commands: names cannot collide, so one lookup works.
      if (interaction.isContextMenuCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(client, interaction);
        return;
      }

      // ── Autocomplete ────────────────────────────────────────────────────────
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command?.autocomplete) return;
        await command.autocomplete(client, interaction);
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

      const reply = { content: client.t('messages.internalError'), flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => null);
      } else {
        await interaction.reply(reply).catch(() => null);
      }
    }
  },
};
