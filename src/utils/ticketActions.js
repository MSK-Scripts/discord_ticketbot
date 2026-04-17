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
  EmbedBuilder,
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

const PRIORITY_EMOJI = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
const PRIORITY_LABEL = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', urgent: 'Dringend' };

// ─── Channel Topic ────────────────────────────────────────────────────────────

async function updateChannelTopic(channel, ticket, overrides = {}, client) {
  const priority  = overrides.priority  ?? ticket.priority  ?? 'medium';
  const claimedBy = overrides.claimedBy !== undefined ? overrides.claimedBy : ticket.claimed_by;

  const priorityLabel = client?.t(`priorities.${priority}`)
    ?? `${PRIORITY_EMOJI[priority]} ${PRIORITY_LABEL[priority]}`;

  let topic = priorityLabel;
  if (claimedBy) topic += ` | 🙋 Claimed by <@${claimedBy}>`;

  await channel.setTopic(topic).catch(err =>
    client?.logger?.warn(`[Topic] Could not set topic: ${err.message}`)
  );
}

// ─── Opening Message Refresh ──────────────────────────────────────────────────

async function refreshTicketMessage(channel, isClaimed, ticket, overrides = {}, client) {
  try {
    const messages   = await channel.messages.fetch({ limit: 50 });
    const openingMsg = messages.find(m =>
      m.author.id === client.user.id &&
      m.embeds.length > 0 &&
      m.components.length > 0 &&
      m.components[0].components.some(c =>
        ['tb_close', 'tb_claim', 'tb_unclaim'].includes(c.customId)
      )
    );

    if (!openingMsg) {
      client.logger.warn('[refreshTicketMessage] Opening message not found.');
      return;
    }

    const priority  = overrides.priority  ?? ticket.priority  ?? 'medium';
    const claimedBy = overrides.claimedBy !== undefined ? overrides.claimedBy : ticket.claimed_by;

    const oldEmbed      = openingMsg.embeds[0];
    const priorityLabel = client.t(`priorities.${priority}`);

    const descTemplate = client.locale?.embeds?.ticketOpened?.description ?? '';
    const keyMatch     = descTemplate.match(/\*\*(.+?):\*\* \{priority\}/);
    const priorityKey  = keyMatch ? keyMatch[1] : 'Priority';

    const newDescription = (oldEmbed?.description ?? '').replace(
      new RegExp(`\\*\\*${priorityKey}:\\*\\* .+`),
      `**${priorityKey}:** ${priorityLabel}`
    );

    const CLAIM_FIELD = '🙋 Claimed by';
    const fields      = (oldEmbed?.fields ?? []).filter(f => f.name !== CLAIM_FIELD);
    if (claimedBy) fields.push({ name: CLAIM_FIELD, value: `<@${claimedBy}>`, inline: true });

    const newEmbed   = EmbedBuilder.from(oldEmbed).setDescription(newDescription).setFields(fields);
    const newButtons = buildTicketButtons(client, isClaimed);

    await openingMsg.edit({ embeds: [newEmbed], components: [newButtons] });
  } catch (err) {
    client?.logger?.warn(`[refreshTicketMessage] ${err.message}`);
  }
}

// ─── Ticket Button Row ────────────────────────────────────────────────────────

function buildTicketButtons(client, isClaimed = false) {
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
    if (isClaimed) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('tb_unclaim')
          .setLabel(client.t('buttons.unclaim'))
          .setEmoji(client.t('buttons.unclaimEmoji'))
          .setStyle(ButtonStyle.Secondary)
      );
    } else {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('tb_claim')
          .setLabel(client.t('buttons.claim'))
          .setEmoji(client.t('buttons.claimEmoji'))
          .setStyle(ButtonStyle.Success)
      );
    }
  }

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

// ─── Open ─────────────────────────────────────────────────────────────────────

async function openTicket(client, guild, user, ticketType, answers = []) {
  const cfg = client.config;

  if (db.isBlacklisted(user.id, guild.id)) return null;

  if (cfg.maxTicketOpened > 0) {
    const open = db.getOpenTicketsByUser(user.id, guild.id);
    if (open.length >= cfg.maxTicketOpened) return null;
  }

  const totalCount   = db.getTotalTicketCount(guild.id);
  const ticketNumber = totalCount + 1;

  const nameTpl     = ticketType.ticketNameOption || cfg.ticketNameOption || 'ticket-USERNAME';
  const channelName = nameTpl
    .replace(/USERNAME/g,    sanitizeName(user.username))
    .replace(/USERID/g,      user.id)
    .replace(/TICKETCOUNT/g, String(ticketNumber))
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100) || 'ticket';

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

  const staffRoles = (ticketType.staffRoles?.length > 0)
    ? ticketType.staffRoles
    : (cfg.rolesWhoHaveAccessToTheTickets ?? []);

  for (const roleId of staffRoles) {
    overwrites.push({
      id:    roleId,
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

  updateChannelTopic(channel, ticket, {}, client); // fire-and-forget

  const embed   = ticketOpenedEmbed(client, { user, ticketType, priority: 'medium', count: ticket.id, answers });
  const buttons = buildTicketButtons(client, false);

  let pingContent = '';
  if (cfg.pingRoleWhenOpened) {
    const pingRoles = (ticketType.staffRoles?.length > 0)
      ? ticketType.staffRoles
      : (cfg.roleToPingWhenOpenedId ?? []);
    if (pingRoles.length > 0) pingContent = pingRoles.map(id => `<@&${id}>`).join(' ');
  }

  await channel.send({ content: pingContent || undefined, embeds: [embed], components: [buttons] });

  return channel;
}

// ─── Close ────────────────────────────────────────────────────────────────────

async function performClose(client, channel, ticket, closer, reason) {
  const cfg = client.config.closeOption ?? {};

  // 1. Disable all ticket buttons immediately
  try {
    const recent      = await channel.messages.fetch({ limit: 20 });
    const withButtons = recent.filter(
      m => m.author.id === client.user.id && m.components.length > 0
    );
    await Promise.all(withButtons.map(m => m.edit({ components: [] }).catch(() => null)));
  } catch { /* ignore */ }

  // 2. Generate transcript
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

  // 3. Update DB
  db.closeTicket(channel.id, closer.id, reason, transcriptHtml);
  const updatedTicket = db.getTicketByChannel(channel.id);

  // 4. Post closed embed + delete button
  const deleteRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('tb_delete')
      .setLabel(client.t('buttons.delete'))
      .setEmoji(client.t('buttons.deleteEmoji'))
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    embeds:     [ticketClosedEmbed(client, { closer, reason })],
    components: [deleteRow],
  }).catch(() => null);

  // 5. Remove creator's view access
  await channel.permissionOverwrites.edit(ticket.creator_id, {
    ViewChannel: false, SendMessages: false,
  }).catch(() => null);

  const duration = updatedTicket.closed_at - updatedTicket.created_at;

  // 6. Send to log channel
  if (client.config.logs && client.config.logsChannelId) {
    const logChannel = await channel.guild.channels.fetch(client.config.logsChannelId).catch(() => null);
    if (logChannel) {
      await logChannel.send({
        embeds: [ticketLogEmbed(client, { ticket: updatedTicket, closer, reason, duration, transcriptUrl: null })],
        files:  transcriptFile ? [transcriptFile] : [],
      }).catch(err => client.logger.error('[performClose] Failed to send log:', err));
    } else {
      client.logger.warn('[performClose] Log channel not found.');
    }
  }

  // 7. DM the ticket creator
  if (cfg.dmUser) {
    try {
      const creator   = await channel.guild.members.fetch(ticket.creator_id);
      const dmPayload = {
        embeds: [ticketClosedDMEmbed(client, {
          count: ticket.id, type: ticket.type, closer, reason, transcriptUrl: null,
        })],
      };
      if (transcriptHtml) {
        dmPayload.files = [
          new AttachmentBuilder(
            Buffer.from(transcriptHtml, 'utf-8'),
            { name: `ticket-${ticket.id}.html` }
          ),
        ];
      }
      await creator.user.send(dmPayload);
      client.logger.info(`[performClose] DM sent to ${creator.user.tag}`);
    } catch (err) {
      client.logger.warn(`[performClose] Could not DM creator (${ticket.creator_id}): ${err.message}`);
    }
  }

  // 8. Rating request
  const ratingCfg = client.config.ratingSystem;
  if (ratingCfg?.enabled) {
    const ratingRow   = buildRatingRow();
    const ratingEmbed = ratingRequestEmbed(client, { count: ticket.id });

    if (ratingCfg.dmUser) {
      try {
        const creator = await channel.guild.members.fetch(ticket.creator_id);
        await creator.user.send({ embeds: [ratingEmbed], components: [ratingRow] });
        client.logger.info(`[performClose] Rating DM sent to ${creator.user.tag}`);
      } catch (err) {
        client.logger.warn(`[performClose] Could not send rating DM (${ticket.creator_id}): ${err.message}`);
      }
    } else {
      await channel.send({
        content:    `<@${ticket.creator_id}>`,
        embeds:     [ratingEmbed],
        components: [ratingRow],
      }).catch(() => null);
    }
  }

  // 9. Move to closed category — awaited last so it never blocks steps 5–8
  if (cfg.closeTicketCategoryId) {
    await channel.setParent(cfg.closeTicketCategoryId, { lockPermissions: false }).catch(err =>
      client.logger.warn(`[performClose] setParent failed: ${err.message}`)
    );
  }

  // 10. Rename channel to "closed-..." — fire-and-forget (cosmetic, rate-limited bucket)
  // Strip any leading priority emoji + separator, then prepend "closed-"
  // e.g. "🔴-ticket-max" → "closed-ticket-max"
  //      "ticket-max"    → "closed-ticket-max"
  const baseName   = channel.name.replace(/^[🟢🟡🟠🔴]-?/, '');
  const closedName = `closed-${baseName}`.substring(0, 100);
  channel.setName(closedName).catch(err =>
    client.logger.warn(`[performClose] setName failed: ${err.message}`)
  );
}

// ─── Move ─────────────────────────────────────────────────────────────────────

async function performMove(client, channel, ticket, newType, movedBy) {
  if (!channel) {
    client.logger.error('[performMove] channel is null — cannot move ticket.');
    return;
  }

  db.setType(channel.id, newType.codeName);

  const cfg      = client.config;
  const allTypes = cfg.ticketTypes;
  const oldType  = allTypes.find(t => t.codeName === ticket.type);

  const oldStaffRoles = (oldType?.staffRoles?.length > 0)
    ? oldType.staffRoles : (cfg.rolesWhoHaveAccessToTheTickets ?? []);
  const newStaffRoles = (newType.staffRoles?.length > 0)
    ? newType.staffRoles : (cfg.rolesWhoHaveAccessToTheTickets ?? []);

  for (const roleId of oldStaffRoles.filter(id => !newStaffRoles.includes(id))) {
    await channel.permissionOverwrites.delete(roleId).catch(() => null);
  }
  for (const roleId of newStaffRoles) {
    await channel.permissionOverwrites.edit(roleId, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      AttachFiles: true, EmbedLinks:   true, ManageMessages:     true,
    }).catch(() => null);
  }
  for (const roleId of oldType?.cantAccess ?? []) {
    await channel.permissionOverwrites.delete(roleId).catch(() => null);
  }
  for (const roleId of newType.cantAccess ?? []) {
    await channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(() => null);
  }

  await channel.send({
    embeds: [{
      description: `🔀 Ticket wurde von <@${movedBy.id}> von **${oldType?.name ?? ticket.type}** zu **${newType.name}** verschoben.`,
      color: 0x5865f2,
    }],
  }).catch(() => null);

  if (newType.categoryId) {
    await channel.setParent(newType.categoryId, { lockPermissions: false }).catch(err =>
      client.logger.warn(`[performMove] setParent failed: ${err.message}`)
    );
  }

  client.logger.info(`[Move] Ticket #${ticket.id} ${ticket.type} → ${newType.codeName} by ${movedBy.tag}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRatingRow() {
  return new ActionRowBuilder().addComponents(
    [1, 2, 3, 4, 5].map(n =>
      new ButtonBuilder()
        .setCustomId(`tb_rate:${n}`)
        .setLabel(String(n))
        .setEmoji('⭐')
        .setStyle(ButtonStyle.Secondary)
    )
  );
}

function sanitizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || 'user';
}

function getEffectiveStaffRoles(ticketType, cfg) {
  return (ticketType?.staffRoles?.length > 0)
    ? ticketType.staffRoles
    : (cfg.rolesWhoHaveAccessToTheTickets ?? []);
}

module.exports = {
  openTicket,
  performClose,
  performMove,
  buildTicketButtons,
  refreshTicketMessage,
  updateChannelTopic,
  getEffectiveStaffRoles,
};
