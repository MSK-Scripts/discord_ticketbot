/**
 * Command: /snippet
 * Send pre-defined canned responses into a ticket channel.
 * Subcommands: send <name> | list
 * Staff-only. Supports autocomplete.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { getTicketByChannel } = require('../database');
const { getAllSnippets, getSnippet, applyPlaceholders } = require('../utils/snippets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snippet')
    .setDescription('Send a pre-defined canned response (staff only)')
    .addSubcommand(sub =>
      sub
        .setName('send')
        .setDescription('Send a snippet into this ticket')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Name of the snippet to send')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Show all available snippets')
    ),

  // ── Autocomplete ────────────────────────────────────────────────────────────
  async autocomplete(client, interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    let choices   = [];

    try {
      choices = getAllSnippets()
        .filter(s =>
          s.name.toLowerCase().includes(focused) ||
          (s.description ?? '').toLowerCase().includes(focused)
        )
        .slice(0, 25)
        .map(s => ({
          name:  `${s.name}${s.description ? ` — ${s.description}` : ''}`.slice(0, 100),
          value: s.name,
        }));
    } catch {
      // snippets.jsonc missing or invalid — return empty list silently
    }

    await interaction.respond(choices);
  },

  // ── Execute ─────────────────────────────────────────────────────────────────
  async execute(client, interaction) {
    const { options, channel, member } = interaction;

    // ── Staff check ────────────────────────────────────────────────────────────
    if (!client.isStaff(member)) {
      return interaction.reply({
        content: client.t('messages.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── Must be inside an open ticket ──────────────────────────────────────────
    const ticket = await getTicketByChannel(interaction.channelId);

    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({
        content: client.t('messages.snippet_not_in_ticket'),
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = options.getSubcommand();

    // ── /snippet list ──────────────────────────────────────────────────────────
    if (sub === 'list') {
      let snippets;
      try {
        snippets = getAllSnippets();
      } catch (err) {
        return interaction.reply({
          content: `❌ ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (snippets.length === 0) {
        return interaction.reply({
          content: client.t('messages.snippet_list_empty'),
          flags: MessageFlags.Ephemeral,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(client.t('embeds.snippetList.title'))
        .setColor(client.config.mainColor ?? '#5865F2')
        .setDescription(
          snippets
            .map(s =>
              `\`/snippet send ${s.name}\`\n> ${(s.description ?? s.content.slice(0, 60).replace(/\n/g, ' ')) + '…'}`
            )
            .join('\n\n')
        )
        .setFooter({
          text: client.t('embeds.snippetList.footer', { count: String(snippets.length) }),
        });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ── /snippet send <name> ───────────────────────────────────────────────────
    if (sub === 'send') {
      const name = options.getString('name', true);

      let snippet;
      try {
        snippet = getSnippet(name);
      } catch (err) {
        return interaction.reply({
          content: `❌ ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!snippet) {
        return interaction.reply({
          content: client.t('messages.snippet_not_found', { name }),
          flags: MessageFlags.Ephemeral,
        });
      }

      // Resolve placeholders
      const typeConfig = client.config.ticketTypes?.find(
        tt => tt.codeName === ticket.type
      ) ?? {};

      const content = applyPlaceholders(snippet.content, {
        user:     `<@${ticket.creator_id}>`,
        staff:    `<@${member.id}>`,
        type:     typeConfig.name ?? ticket.type ?? '',
        priority: ticket.priority ?? '',
      });

      // Build message payload
      const payload = {};

      if (snippet.embed) {
        const embed = new EmbedBuilder()
          .setDescription(content)
          .setColor(snippet.embed.color ?? client.config.mainColor ?? '#5865F2');
        if (snippet.embed.title) embed.setTitle(snippet.embed.title);
        payload.embeds = [embed];
      } else {
        payload.content = content;
      }

      // Defer ephemerally, send snippet publicly, confirm back
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await channel.send(payload);

      return interaction.editReply({
        content: client.t('messages.snippet_sent', { name: snippet.name }),
      });
    }
  },
};
