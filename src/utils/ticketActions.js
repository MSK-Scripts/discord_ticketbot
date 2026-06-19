/**
 * Shared ticket lifecycle logic — used by commands AND button handlers.
 */

const {
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');
const path = require('path');
const { randomUUID } = require('crypto');
const db = require('../database');
const { generateTranscript } = require('./transcript');
const { uploadTranscript }   = require('./mskApi');
const {
  ticketOpenedEmbed,
  ticketClosedEmbed,
  ticketClosedDMEmbed,
  ticketReopenedEmbed,
  ticketLogEmbed,
  ratingRequestEmbed,
} = require('./embeds');

const PRIORITY_EMOJI = { low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴' };
const PRIORITY_LABEL = { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', urgent: 'Dringend' };
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

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

  // Predefined priority per ticket type (falls back to 'medium' on missing/invalid value)
  const priority = VALID_PRIORITIES.has(ticketType.priority) ? ticketType.priority : 'medium';

  db.createTicket({ channelId: channel.id, guildId: guild.id, creatorId: user.id, type: ticketType.codeName, priority });
  const ticket = db.getTicketByChannel(channel.id);

  updateChannelTopic(channel, ticket, {}, client); // fire-and-forget

  const embed   = ticketOpenedEmbed(client, { user, ticketType, priority, count: ticket.id, answers });
  const buttons = buildTicketButtons(client, false);

  let pingContent = '';
  if (cfg.pingRoleWhenOpened) {
    const pingRoles = (ticketType.staffRoles?.length > 0)
      ? ticketType.staffRoles
      : (cfg.roleToPingWhenOpenedId ?? []);
    if (pingRoles.length > 0) pingContent = pingRoles.map(id => `<@&${id}>`).join(' ');
  }

  await channel.send({ content: pingContent || undefined, embeds: [embed], components: [buttons] });

  // ── User notification opt-in button ──────────────────────────────────────────
  if (cfg.userNotifications?.enabled) {
    const { buildNotifyButton } = require('../components/buttons/notifyToggle');
    const notifyRow = new ActionRowBuilder().addComponents(buildNotifyButton(false, client));
    await channel.send({
      content: `<@${user.id}>`,
      embeds: [{
        description: client.t('embeds.notifyOptIn.description'),
        color: 0x5865f2,
      }],
      components: [notifyRow],
    }).catch(() => null);
  }

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

  // 2. Generate transcript & upload to MSK server
  let transcriptHtml         = null;
  let transcriptUrl          = null;
  let transcriptFallbackFile = null; // attached to DM/log if upload fails
  let transcriptUploadError  = null;

  if (cfg.createTranscript) {
    // The transcript is generated before db.closeTicket() runs, so the DB row
    // still has closed_at / closed_by / close_reason unset. Stamp them now so
    // the transcript header shows the actual close time, closer and reason.
    ticket.closed_at    = ticket.closed_at    ?? Date.now();
    ticket.closed_by    = ticket.closed_by    ?? closer?.id ?? null;
    ticket.close_reason = ticket.close_reason ?? (reason || null);

    // Collect attachments BEFORE generating the HTML so the transcript can link
    // the persistent local copies (attachments/<uuid>.<ext>) instead of the
    // Discord CDN URLs, which are signed and expire after ~24h.
    const attachments    = await collectAttachments(channel, client);
    const attachmentUrls = new Map(
      attachments.map(a => [a.discordId, `attachments/${a.id}.${a.ext}`]),
    );

    try {
      transcriptHtml = await generateTranscript(channel, ticket, channel.guild.name, client.config.transcriptDesign, attachmentUrls, client.config.transcriptLang, client.config.mainColor);
    } catch (err) {
      client.logger.error('[performClose] Transcript generation error:', err);
    }

    if (transcriptHtml) {
      const result = await uploadTranscript({
        ticketId:       ticket.id,
        transcriptHtml,
        attachments,
      });

      if (result.success) {
        transcriptUrl = result.url;
        client.logger.info(`[performClose] Transcript uploaded: ${transcriptUrl} (tier: ${result.tier})`);
      } else {
        transcriptUploadError = result.error;
        client.logger.error(`[performClose] Transcript upload failed: ${result.error}`);

        // Fallback: ship the transcript as an .html file attachment so it isn't lost.
        // Discord's per-file limit for bot uploads to non-boosted destinations is 10 MB; keep a safety margin.
        const MAX_DM_BYTES = 9 * 1024 * 1024;
        const htmlBytes    = Buffer.byteLength(transcriptHtml, 'utf-8');

        if (htmlBytes <= MAX_DM_BYTES) {
          transcriptFallbackFile = new AttachmentBuilder(
            Buffer.from(transcriptHtml, 'utf-8'),
            { name: `transcript-${ticket.id}.html` },
          );
          client.logger.info(`[performClose] Prepared transcript fallback file (${htmlBytes} bytes).`);
        } else {
          client.logger.warn(`[performClose] Transcript too large for DM fallback (${htmlBytes} bytes) — no file attached.`);
        }
      }
    }
  }

  // 3. Update DB
  db.closeTicket(channel.id, closer.id, reason, transcriptHtml);
  const updatedTicket = db.getTicketByChannel(channel.id);

  // 4. Post closed embed + delete button (+ optional reopen button)
  const closedButtons = [];

  const reopenCfg = client.config.reopenOption ?? {};
  if (reopenCfg.enabled && reopenCfg.button !== false) {
    closedButtons.push(
      new ButtonBuilder()
        .setCustomId('tb_reopen')
        .setLabel(client.t('buttons.reopen'))
        .setEmoji(client.t('buttons.reopenEmoji'))
        .setStyle(ButtonStyle.Success)
    );
  }

  closedButtons.push(
    new ButtonBuilder()
      .setCustomId('tb_delete')
      .setLabel(client.t('buttons.delete'))
      .setEmoji(client.t('buttons.deleteEmoji'))
      .setStyle(ButtonStyle.Danger)
  );

  const deleteRow = new ActionRowBuilder().addComponents(closedButtons);

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
      const logPayload = {
        embeds: [ticketLogEmbed(client, { ticket: updatedTicket, closer, reason, duration, transcriptUrl })],
      };
      // If the upload failed, also attach the raw transcript file so staff still has it.
      if (transcriptFallbackFile) {
        logPayload.files   = [transcriptFallbackFile];
        logPayload.content = `⚠️ Transcript upload failed (\`${transcriptUploadError ?? 'unknown error'}\`) — attached as fallback file.`;
      }
      await logChannel.send(logPayload).catch(err => client.logger.error('[performClose] Failed to send log:', err));
    } else {
      client.logger.warn('[performClose] Log channel not found.');
    }
  }

  // 7. DM the ticket creator
  // Always attempt a DM when we have a fallback file, so the transcript isn't lost
  // even if `dmUser` is disabled in the config.
  if (cfg.dmUser || transcriptFallbackFile) {
    try {
      const creator = await channel.guild.members.fetch(ticket.creator_id);

      const dmPayload = {
        embeds: [ticketClosedDMEmbed(client, {
          count: ticket.id, type: ticket.type, closer, reason, transcriptUrl,
        })],
      };

      if (transcriptFallbackFile) {
        dmPayload.files   = [transcriptFallbackFile];
        dmPayload.content = '⚠️ Our transcript service was temporarily unavailable, so your transcript is attached here as an HTML file.';
      }

      await creator.user.send(dmPayload);
      client.logger.info(
        `[performClose] DM sent to ${creator.user.tag}${transcriptFallbackFile ? ' (with fallback transcript file)' : ''}`
      );
    } catch (err) {
      client.logger.warn(`[performClose] Could not DM creator (${ticket.creator_id}): ${err.message}`);
    }
  }

  // 8. Rating request
  const ratingCfg = client.config.ratingSystem;
  if (ratingCfg?.enabled) {
    const ratingRow   = buildRatingRow(ticket.id);
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

// ─── Reopen ─────────────────────────────────────────────────────────────────────

/**
 * Reopen a previously closed ticket.
 * Restores the creator's channel access, moves the channel back to its type's
 * category, renames it (drops the "closed-" prefix) and posts a fresh button row.
 *
 * @param {object} client
 * @param {import('discord.js').TextChannel} channel
 * @param {object} ticket    The ticket row (status === 'closed')
 * @param {import('discord.js').User} reopener
 */
async function performReopen(client, channel, ticket, reopener) {
  const cfg = client.config;

  // 1. Restore the creator's view + send access
  await channel.permissionOverwrites.edit(ticket.creator_id, {
    ViewChannel: true, SendMessages: true,
  }).catch(() => null);

  // 2. Update DB (clears closed_by/closed_at/close_reason, status → open)
  db.reopenTicket(channel.id);
  const updated = db.getTicketByChannel(channel.id);

  // 3. Move back to the ticket type's category (if configured)
  const ticketType = cfg.ticketTypes.find(t => t.codeName === updated.type);
  if (ticketType?.categoryId) {
    await channel.setParent(ticketType.categoryId, { lockPermissions: false }).catch(err =>
      client.logger.warn(`[performReopen] setParent failed: ${err.message}`)
    );
  }

  // 4. Post reopened embed + fresh ticket button row
  const buttons = buildTicketButtons(client, !!updated.claimed_by);
  await channel.send({
    embeds:     [ticketReopenedEmbed(client, { reopener })],
    components: [buttons],
  }).catch(() => null);

  // 5. Restore channel topic (priority/claim)
  updateChannelTopic(channel, updated, {}, client); // fire-and-forget

  // 6. Rename — strip the "closed-" prefix added on close — fire-and-forget (rate-limited)
  const restoredName = (channel.name.replace(/^closed-/, '') || 'ticket').substring(0, 100);
  channel.setName(restoredName).catch(err =>
    client.logger.warn(`[performReopen] setName failed: ${err.message}`)
  );

  client.logger.info(`[Reopen] Ticket #${updated.id} reopened by ${reopener.tag}`);
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
      description: client.t('embeds.moved.description', {
        user: `<@${movedBy.id}>`,
        from: oldType?.name ?? ticket.type,
        to:   newType.name,
      }),
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

// Mirror of the MSK upload route's allow-list. Types the server would reject
// are skipped here so a single unsupported file can't fail the whole upload.
const ALLOWED_ATTACHMENT_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'mp4', 'mp3', 'zip', 'txt',
]);

/** Lowercased, allow-listed file extension or null. */
function safeAttachmentExt(name) {
  const ext = path.extname(name || '').slice(1).toLowerCase();
  return ALLOWED_ATTACHMENT_EXTS.has(ext) ? ext : null;
}

/**
 * Collect all attachments from the channel messages.
 * These are sent to the MSK API so premium users can download them from the
 * transcript. Each gets a stable UUID + extension so the transcript HTML can
 * link the stored copy (attachments/<uuid>.<ext>) — see performClose.
 * @param {import('discord.js').TextChannel} channel
 * @param {object} client
 * @returns {Promise<Array<{id: string, discordId: string, ext: string, name: string, data: Buffer, mimeType: string}>>}
 */
async function collectAttachments(channel, client) {
  if (!process.env.MSK_API_KEY) return [];

  try {
    const attachments = [];
    let lastId;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const batch = await channel.messages.fetch(options);
      if (batch.size === 0) break;

      for (const msg of batch.values()) {
        for (const att of msg.attachments.values()) {
          // Skip types the server would reject — keeps the upload from failing
          // wholesale over one unsupported file (it falls back to the Discord
          // link in the transcript).
          const ext = safeAttachmentExt(att.name);
          if (!ext) continue;
          try {
            const res    = await fetch(att.url);
            if (!res.ok) continue;
            const buffer = Buffer.from(await res.arrayBuffer());
            attachments.push({
              id:        randomUUID(),
              discordId: att.id,
              ext,
              name:      att.name,
              data:      buffer,
              mimeType:  att.contentType ?? 'application/octet-stream',
            });
          } catch (err) {
            client.logger?.warn(`[collectAttachments] Failed to fetch ${att.name}: ${err.message}`);
          }
        }
      }

      lastId = batch.last().id;
      if (batch.size < 100) break;
    }

    return attachments;
  } catch (err) {
    client.logger?.warn(`[collectAttachments] Error: ${err.message}`);
    return [];
  }
}

/**
 * Capture a FINAL transcript right before a ticket channel is deleted.
 *
 * Closing generates a transcript snapshot, but the Delete button removes the
 * channel directly. If a ticket was reopened and then deleted WITHOUT being
 * closed again, the messages added after the reopen would never be captured.
 * This regenerates + uploads the transcript from the full message history so
 * the stored transcript reflects everything up to deletion. The upload route
 * replaces the ticket's transcript in place (same public URL).
 *
 * Only meaningful while the ticket is still open (reopened, not re-closed) — a
 * closed ticket already has a complete transcript. The caller gates on that.
 *
 * @returns {Promise<string|null>} the transcript URL, or null
 */
async function captureFinalTranscript(client, channel, ticket, deleter) {
  const cfg = client.config.closeOption ?? {};
  if (!cfg.createTranscript) return null;

  // Treat the delete as the close moment (the ticket is still open here), so the
  // transcript header shows the closer/time.
  ticket.closed_at    = ticket.closed_at    ?? Date.now();
  ticket.closed_by    = ticket.closed_by    ?? deleter?.id ?? null;
  ticket.close_reason = ticket.close_reason ?? null;

  let transcriptHtml = null;
  let transcriptUrl  = null;
  try {
    const attachments    = await collectAttachments(channel, client);
    const attachmentUrls = new Map(
      attachments.map(a => [a.discordId, `attachments/${a.id}.${a.ext}`]),
    );
    transcriptHtml = await generateTranscript(
      channel, ticket, channel.guild.name,
      client.config.transcriptDesign, attachmentUrls, client.config.transcriptLang,
      client.config.mainColor,
    );
    if (transcriptHtml) {
      const result = await uploadTranscript({ ticketId: ticket.id, transcriptHtml, attachments });
      if (result.success) {
        transcriptUrl = result.url;
        client.logger.info(`[Delete] Final transcript uploaded (replaced in place): ${transcriptUrl}`);
      } else {
        client.logger.error(`[Delete] Final transcript upload failed: ${result.error}`);
      }
    }
  } catch (err) {
    client.logger.error('[Delete] Final transcript error:', err);
  }

  // Record the close so the (about-to-be-deleted) ticket isn't left as "open".
  db.closeTicket(channel.id, deleter?.id ?? client.user.id, ticket.close_reason, transcriptHtml);

  // Post to the log channel with the (replaced) transcript link.
  if (transcriptUrl && client.config.logs && client.config.logsChannelId) {
    const logChannel = await channel.guild.channels.fetch(client.config.logsChannelId).catch(() => null);
    if (logChannel) {
      const updated  = db.getTicketByChannel(channel.id) ?? ticket;
      const duration = (updated.closed_at ?? Date.now()) - updated.created_at;
      await logChannel.send({
        embeds: [ticketLogEmbed(client, { ticket: updated, closer: deleter, reason: ticket.close_reason, duration, transcriptUrl })],
      }).catch(() => null);
    }
  }

  return transcriptUrl;
}

function buildRatingRow(ticketId) {
  return new ActionRowBuilder().addComponents(
    [1, 2, 3, 4, 5].map(n =>
      new ButtonBuilder()
        // Encode the ticket id directly so the handler never has to parse it out
        // of a (translatable) embed description.
        .setCustomId(`tb_rate:${n}:${ticketId}`)
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
  performReopen,
  performMove,
  captureFinalTranscript,
  buildTicketButtons,
  refreshTicketMessage,
  updateChannelTopic,
  getEffectiveStaffRoles,
};
