/**
 * Shared ticket lifecycle logic — used by commands AND button handlers.
 */

const {
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const db = require('../database');
const { generateTranscript } = require('./transcript');
const {
  ticketOpenedEmbed,
  ticketClosedEmbed,
  ticketClosedDMEmbed,
  ticketLogEmbed,
  ratingRequestEmbed,
} = require('./embeds');

// ─── Open ─────────────────────────────────────────────────────────────────────

async function openTicket(client, guild, user, ticketType, answers = []) {
  const cfg = client.config;

  if (db.isBlacklisted(user.id, guild.id)) return null;

  if (cfg.maxTicketOpened > 0) {
    const open = db.getOpenTicketsByUser(user.id, guild.id);
    if (open.length >= cfg.maxTicketOpened) return null;
  }

  const totalForUser = db.getOpenTicketsByUser(user.id, guild.id).length;
  const nameTpl      = ticketType.ticketNameOption || cfg.ticketNameOption || 'ticket-USERNAME';
  const channelName  = nameTpl
    .replace(/USERNAME/g,    sanitizeName(user.username))
    .replace(/USERID/g,      user.id)
    .replace(/TICKETCOUNT/g, String(totalForUser + 1))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);

  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id:    user.id,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  for (const roleId of cfg.rolesWhoHaveAccessToTheTickets ?? []) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  for (const roleId of ticketType.cantAccess ?? []) {
    overwrites.push({ id: roleId, deny: [PermissionFlagsBits.ViewChannel] });
  }

  let channel;
  try {
    channel = await guild.channels.create({
      name:                 channelName,
      type:                 ChannelType.GuildText,
      parent:               ticketType.categoryId || null,
      permissionOverwrites: overwrites,
    });
  } catch (err) {
    client.logger.error('[openTicket] Failed to create channel:', err);
    return null;
  }

  db.createTicket({ channelId: channel.id, guildId: guild.id, creatorId: user.id, type: ticketType.codeName });
  const ticket = db.getTicketByChannel(channel.id);

  const embed   = ticketOpenedEmbed(client, { user, ticketType, priority: 'medium', count: ticket.id, answers });
  const buttons = buildTicketButtons(client);

  let pingContent = '';
  if (cfg.pingRoleWhenOpened && cfg.roleToPingWhenOpenedId?.length > 0) {
    pingContent = cfg.roleToPingWhenOpenedId.map(id => `<@&${id}>`).join(' ');
  }

  await channel.send({ content: pingContent || undefined, embeds: [embed], components: [buttons] });

  return channel;
}

// ─── Close ────────────────────────────────────────────────────────────────────

async function performClose(client, channel, ticket, closer, reason) {
  const cfg = client.config.closeOption ?? {};

  let transcriptHtml = null;
  let transcriptFile = null;

  if (cfg.createTranscript) {
    try {
      transcriptHtml = await generateTranscript(channel, ticket, channel.guild.name);
      transcriptFile = new AttachmentBuilder(
        Buffer.from(transcriptHtml, 'utf-8'),
        { name: `ticket-${ticket.id}.html` }
      );
    } catch (err) {
      client.logger.error('[performClose] Transcript error:', err);
    }
  }

  db.closeTicket(channel.id, closer.id, reason, transcriptHtml);
  const updatedTicket = db.getTicketByChannel(channel.id);

  const deleteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tb_delete')
      .setLabel(client.t('buttons.delete'))
      .setEmoji(client.t('buttons.deleteEmoji'))
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [ticketClosedEmbed(client, { closer, reason })], components: [deleteRow] }).catch(() => null);

  if (cfg.closeTicketCategoryId) {
    await channel.setParent(cfg.closeTicketCategoryId, { lockPermissions: false }).catch(() => null);
  }

  await channel.permissionOverwrites.edit(ticket.creator_id, {
    ViewChannel: false, SendMessages: false,
  }).catch(() => null);

  const duration = updatedTicket.closed_at - updatedTicket.created_at;

  if (client.config.logs && client.config.logsChannelId) {
    const logChannel = await channel.guild.channels.fetch(client.config.logsChannelId).catch(() => null);
    if (logChannel) {
      await logChannel.send({
        embeds: [ticketLogEmbed(client, { ticket: updatedTicket, closer, reason, duration, transcriptUrl: null })],
        files:  transcriptFile ? [transcriptFile] : [],
      }).catch(() => null);
    }
  }

  if (cfg.dmUser && ticket.creator_id !== closer.id) {
    try {
      const creator = await channel.guild.members.fetch(ticket.creator_id);
      await creator.user.send({
        embeds: [ticketClosedDMEmbed(client, { count: ticket.id, type: ticket.type, closer, reason, transcriptUrl: null })],
      }).catch(() => null);
    } catch { /* DMs closed */ }
  }

  const ratingCfg = client.config.ratingSystem;
  if (ratingCfg?.enabled && ticket.creator_id !== closer.id) {
    const ratingRow   = buildRatingRow();
    const ratingEmbed = ratingRequestEmbed(client, { count: ticket.id });

    if (ratingCfg.dmUser) {
      try {
        const creator = await channel.guild.members.fetch(ticket.creator_id);
        await creator.user.send({ embeds: [ratingEmbed], components: [ratingRow] }).catch(() => null);
      } catch { /* DMs closed */ }
    } else {
      await channel.send({ content: `<@${ticket.creator_id}>`, embeds: [ratingEmbed], components: [ratingRow] }).catch(() => null);
    }
  }
}

// ─── Move ─────────────────────────────────────────────────────────────────────

/**
 * Move a ticket to a different type/category.
 * Updates DB, moves the channel, adjusts permissions.
 *
 * @param {import('../client').TicketClient} client
 * @param {import('discord.js').TextChannel} channel
 * @param {object}                           ticket       DB row
 * @param {object}                           newType      Config ticketType entry
 * @param {import('discord.js').User}        movedBy
 * @returns {Promise<void>}
 */
async function performMove(client, channel, ticket, newType, movedBy) {
  // Update DB type
  db.setType(channel.id, newType.codeName);

  // Move to new category
  if (newType.categoryId) {
    await channel.setParent(newType.categoryId, { lockPermissions: false }).catch(() => null);
  }

  // Update cantAccess permission overwrites
  const allTypes  = client.config.ticketTypes;
  const oldType   = allTypes.find(t => t.codeName === ticket.type);

  // Remove old cantAccess denies
  for (const roleId of oldType?.cantAccess ?? []) {
    await channel.permissionOverwrites.delete(roleId).catch(() => null);
  }
  // Apply new cantAccess denies
  for (const roleId of newType.cantAccess ?? []) {
    await channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(() => null);
  }

  await channel.send({
    embeds: [{
      description: `🔀 Ticket wurde von <@${movedBy.id}> von **${oldType?.name ?? ticket.type}** zu **${newType.name}** verschoben.`,
      color: 0x5865f2,
    }],
  }).catch(() => null);

  client.logger.info(`[Move] Ticket #${ticket.id} moved from ${ticket.type} → ${newType.codeName} by ${movedBy.tag}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the Close + Claim + Move action row for a ticket channel.
 */
function buildTicketButtons(client) {
  const cfg     = client.config;
  const buttons = [];

  if (cfg.closeOption?.closeButton !== false) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('tb_close')
        .setLabel(client.t('buttons.close'))
        .setEmoji(client.t('buttons.closeEmoji'))
        .setStyle(ButtonStyle.Danger)
    );
  }

  if (cfg.claimOption?.claimButton) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('tb_claim')
        .setLabel(client.t('buttons.claim'))
        .setEmoji(client.t('buttons.claimEmoji'))
        .setStyle(ButtonStyle.Success)
    );
  }

  // Move button — only shown when there are multiple ticket types
  if (cfg.ticketTypes?.length > 1) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('tb_move')
        .setLabel(client.t('buttons.move'))
        .setEmoji(client.t('buttons.moveEmoji'))
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return new ActionRowBuilder().addComponents(buttons);
}

function buildRatingRow() {
  const buttons = [1, 2, 3, 4, 5].map(n =>
    new ButtonBuilder()
      .setCustomId(`tb_rate:${n}`)
      .setLabel(String(n))
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Secondary)
  );
  return new ActionRowBuilder().addComponents(buttons);
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || 'user';
}

module.exports = { openTicket, performClose, performMove, buildTicketButtons };
