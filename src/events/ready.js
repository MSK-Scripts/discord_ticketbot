const { ActivityType } = require('discord.js');
const { getInactiveTickets, getTicketsNeedingStaffReminder, setStaffReminded, getStats, getPanelMessage, deletePanelMessage } = require('../database');
const { buildTicketPanel } = require('../utils/panel');
const { performClose } = require('../utils/ticketActions');
const { registerBotBridge } = require('../dashboard/botBridge');
const { checkBotPermissions } = require('../utils/permissionCheck');
const { startUpdateNotifier } = require('../utils/updateNotice');

const ACTIVITY_TYPE_MAP = {
  PLAYING:   ActivityType.Playing,
  WATCHING:  ActivityType.Watching,
  LISTENING: ActivityType.Listening,
  STREAMING: ActivityType.Streaming,
  COMPETING: ActivityType.Competing,
};

module.exports = {
  name: 'clientReady', // renamed from 'ready' in Discord.js v14 to avoid conflict with gateway READY
  once: true,

  async execute(client) {
    client.logger.success(`[Ready] Logged in as ${client.user.tag}`);
    client.logger.info(`[Ready] Serving ${client.guilds.cache.size} guild(s).`);

    // Tell the operator NOW if the bot lacks a permission it needs, instead of
    // letting them discover it as a bare 403 on their first ticket.
    checkBotPermissions(client);

    // Listen for dashboard commands — but only when the supervisor forked us.
    // A standalone `node index.js` has no IPC channel, so this is a no-op there.
    registerBotBridge(client);

    const reset  = '\x1b[0m';
    const gray   = '\x1b[90m';
    const green  = '\x1b[38;2;94;177;49m';

    // ── Bot status ────────────────────────────────────────────────────────────
    const { status: statusCfg } = client.config;
    if (statusCfg?.enabled) {
      if (statusCfg.dynamic) {
        // Dynamic: update periodically with live ticket count
        const intervalMin = statusCfg.dynamicInterval ?? 5;
        setInterval(() => updateDynamicStatus(client), intervalMin * 60_000);
        setTimeout(() => updateDynamicStatus(client), 2_000); // initial update after cache is ready
        client.logger.info(`[Ready] Dynamic status enabled — updates every ${intervalMin}min`);
      } else {
        // Static status
        client.user.setPresence({
          status: statusCfg.status ?? 'online',
          activities: [{
            name: statusCfg.text ?? 'Support Tickets',
            type: ACTIVITY_TYPE_MAP[statusCfg.type] ?? ActivityType.Watching,
            url:  statusCfg.url || undefined,
          }],
        });
        client.logger.info(`[Ready] Status set: ${statusCfg.type} "${statusCfg.text}"`);
      }
    }

    // ── Auto-close loop ───────────────────────────────────────────────────────
    const autoCfg = client.config.autoClose;
    if (autoCfg?.enabled) {
      const thresholdMs    = (autoCfg.inactiveHours   ?? 48) * 3_600_000;
      const warnMs         = (autoCfg.warnBeforeHours ?? 6)  * 3_600_000;
      const excludeClaimed = autoCfg.excludeClaimed ?? true;

      client.logger.info(`[AutoClose] Enabled — threshold: ${autoCfg.inactiveHours}h`);
      setInterval(() => runAutoClose(client, thresholdMs, warnMs, excludeClaimed), 30 * 60_000);
      runAutoClose(client, thresholdMs, warnMs, excludeClaimed);
    }

    // ── Auto-refresh ticket panel ─────────────────────────────────────────────
    // Re-renders the already-sent /setup panel with the current config & locale,
    // so changes to the embed/text after an update apply automatically — no need
    // to re-run /setup. Controlled via panel.autoUpdateOnStart (default: true).
    if (client.config.panel?.autoUpdateOnStart ?? true) {
      refreshTicketPanel(client);
    }

    // ── Staff-reminder loop ───────────────────────────────────────────────────
    const reminderCfg = client.config.staffReminder;
    if (reminderCfg?.enabled) {
      const reminderMs = (reminderCfg.afterHours ?? 4) * 3_600_000;

      client.logger.info(`[StaffReminder] Enabled — after ${reminderCfg.afterHours}h without response`);
      setInterval(() => runStaffReminder(client, reminderMs), 15 * 60_000);
      runStaffReminder(client, reminderMs);
    }

    // ── Update notice in the log channel ──────────────────────────────────────
    // Same information as the console check at boot, but where an unattended
    // self-host actually sees it. Default on, hourly; no-op without a log channel.
    startUpdateNotifier(client);

    // ── Startup summary (always last) ─────────────────────────────────────────
    console.log('\x1b[0m');
    console.log(`${green}  ✔ MSK Ticket Bot successfully started!${reset}`);
    console.log(`${gray}  ──────────────────────────────────────────${reset}`);
    console.log(`${gray}  Bot       ${reset}${client.user.tag}`);
    console.log(`${gray}  Guilds    ${reset}${client.guilds.cache.size}`);
    console.log(`${gray}  Commands  ${reset}${client.commands.size}`);
    console.log('\x1b[0m');
  },
};

// ─── Panel auto-refresh ─────────────────────────────────────────────────────────

async function refreshTicketPanel(client) {
  let record;
  try {
    record = await getPanelMessage(process.env.GUILD_ID);
  } catch (err) {
    client.logger.error('[Panel] DB error:', err);
    return;
  }

  // No panel sent yet — operator still has to run /setup once.
  if (!record) return;

  const channel = await client.channels.fetch(record.channel_id).catch(() => null);
  if (!channel) {
    client.logger.warn('[Panel] Saved panel channel no longer exists — clearing record. Run /setup again.');
    await deletePanelMessage(process.env.GUILD_ID);
    return;
  }

  const message = await channel.messages.fetch(record.message_id).catch(() => null);
  if (!message) {
    client.logger.warn('[Panel] Saved panel message no longer exists — clearing record. Run /setup again.');
    await deletePanelMessage(process.env.GUILD_ID);
    return;
  }

  const { embeds, components, files } = buildTicketPanel(client);

  // attachments: [] clears the old logo/banner so re-attached files don't pile up.
  await message.edit({ embeds, components, files, attachments: [] })
    .then(() => client.logger.info('[Panel] Ticket panel refreshed on startup.'))
    .catch(err => client.logger.warn(`[Panel] Failed to refresh panel: ${err.message}`));
}

// ─── Auto-close ───────────────────────────────────────────────────────────────

async function runAutoClose(client, thresholdMs, warnMs, excludeClaimed) {
  const warnThreshold = thresholdMs - warnMs;
  let tickets;

  // Tracks which channels already received the "will be auto-closed" warning.
  // A Set (instead of dynamic client[...] properties) prevents an unbounded
  // memory leak and lets us reset the flag when a ticket becomes active again
  // (see messageCreate.js) so a re-inactive ticket gets warned a second time.
  if (!client.autoCloseWarned) client.autoCloseWarned = new Set();

  try {
    tickets = await getInactiveTickets(warnThreshold, excludeClaimed, process.env.GUILD_ID);
  } catch (err) {
    client.logger.error('[AutoClose] DB error:', err);
    return;
  }

  for (const ticket of tickets) {
    try {
      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) continue;

      const idleMs      = Date.now() - ticket.last_activity;
      const shouldClose = idleMs >= thresholdMs;

      if (shouldClose) {
        const reason = client.t('messages.autoCloseReason');

        // Run the full manual-close flow (transcript upload, permission removal,
        // closed embed + delete/reopen buttons, log channel, DM, rating, category
        // move + rename) with the bot itself as the closer.
        await performClose(client, channel, ticket, client.user, reason);

        // Ticket is closed — drop its warn flag so the Set never grows unbounded.
        client.autoCloseWarned.delete(ticket.channel_id);

        client.logger.info(`[AutoClose] Closed ticket #${ticket.id}`);
      } else {
        // Send warning once when entering the warn window
        if (!client.autoCloseWarned.has(ticket.channel_id)) {
          client.autoCloseWarned.add(ticket.channel_id);
          const hoursLeft = Math.ceil((thresholdMs - idleMs) / 3_600_000);
          await channel.send(
            client.t('messages.autoCloseWarning', { hours: String(hoursLeft) })
          ).catch(() => null);
        }
      }
    } catch (err) {
      client.logger.error(`[AutoClose] Error on ticket ${ticket.id}:`, err);
    }
  }
}

// ─── Dynamic Status ─────────────────────────────────────────────────────────────

async function updateDynamicStatus(client) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) return;
  try {
    const stats        = await getStats(guildId);
    const statusCfg    = client.config.status;
    const textTemplate = statusCfg.dynamicText ?? '🎫 {open} open tickets';
    const text         = textTemplate
      .replace(/\{open\}/g,   String(stats.open))
      .replace(/\{total\}/g,  String(stats.total))
      .replace(/\{closed\}/g, String(stats.closed));

    client.user.setPresence({
      status: statusCfg.status ?? 'online',
      activities: [{
        name: text,
        type: ACTIVITY_TYPE_MAP[statusCfg.type] ?? ActivityType.Watching,
        url:  statusCfg.url || undefined,
      }],
    });
  } catch (err) {
    client.logger.warn(`[DynamicStatus] Failed to update: ${err.message}`);
  }
}

// ─── Staff reminder ───────────────────────────────────────────────────────────

async function runStaffReminder(client, reminderMs) {
  let tickets;

  try {
    tickets = await getTicketsNeedingStaffReminder(reminderMs, process.env.GUILD_ID);
  } catch (err) {
    client.logger.error('[StaffReminder] DB error:', err);
    return;
  }

  const reminderCfg = client.config.staffReminder;
  const staffRoles  = client.config.rolesWhoHaveAccessToTheTickets ?? [];

  const pingStr = reminderCfg.pingRoles && staffRoles.length > 0
    ? staffRoles.map(id => `<@&${id}>`).join(' ')
    : '';

  for (const ticket of tickets) {
    try {
      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) continue;

      const hoursIdle = Math.floor((Date.now() - ticket.last_activity) / 3_600_000);

      const content = [
        pingStr,
        client.t('messages.staffReminderTitle', { hours: String(hoursIdle) }),
        client.t('messages.staffReminderBody', {
          channel:  ticket.channel_id,
          type:     ticket.type,
          priority: ticket.priority,
        }),
      ].filter(Boolean).join('\n');

      await channel.send({ content }).catch(() => null);

      await setStaffReminded(ticket.channel_id);

      client.logger.info(`[StaffReminder] Reminded ticket #${ticket.id} (${hoursIdle}h idle)`);
    } catch (err) {
      client.logger.error(`[StaffReminder] Error on ticket ${ticket.id}:`, err);
    }
  }
}
