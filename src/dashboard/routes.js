/**
 * Dashboard API routes.
 *
 * Every route is mounted behind the auth + CSRF + rate-limit chain from
 * server.js and additionally declares the permission it needs. Any mutation
 * writes an audit row.
 *
 * Note where the work happens:
 *   • reads (tickets, stats, config, roles/channels) are done by the DASHBOARD
 *     process directly — they keep working while the bot is stopped or crashed.
 *   • anything that touches Discord state (close, reply, move, …) is delegated
 *     to the BOT over IPC, because it needs the live discord.js client.
 */

const fs = require('fs/promises');
const path = require('path');

const db = require('../database');
const { validateConfig, stripJsonComments } = require('../config');
const { getGuildLookups, getChannelMessages, resolveUsers } = require('./discord');
const { getTranscriptUrl } = require('../utils/mskApi');
const { PERMISSIONS, PERMISSION_LABELS, isPermission, isSubjectType, parsePermissions, checkSelfEdit } = require('./permissions');

const ROOT = path.resolve(__dirname, '../..');

// Explicit map: the URL key is user input, the filename never is.
const CONFIG_FILES = {
  config:   'config/config.jsonc',
  snippets: 'config/snippets.jsonc',
  env:      '.env',
};

// The .env file holds SESSION_SECRET, TOKEN, CLIENT_SECRET and DATABASE_URL.
// Reading it means being able to forge any session and take over the bot, so it
// is gated on the guild OWNER — never on config.view/edit, which are meant for
// day-to-day staff. The owner already controls the bot outright.
const OWNER_ONLY_FILES = new Set(['env']);

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Fire-and-forget audit entry for a mutation. */
const audit = (req, action, target, detail) =>
  db.writeDashboardAudit({
    guildId: req.auth.guildId,
    actorId: req.auth.userId,
    action,
    target: target ?? null,
    detail: detail ?? null,
  });

function registerRoutes(api, { config, supervisor, requirePermission, invalidateMemberCache }) {
  const guildId = config.guildId;

  // ── Tickets ────────────────────────────────────────────────────────────────

  api.get('/tickets', requirePermission('tickets.view'), asyncRoute(async (req, res) => {
    const filters = {
      status:    req.query.status || null,
      type:      req.query.type || null,
      priority:  req.query.priority || null,
      claimedBy: req.query.claimedBy || null,
      limit:     req.query.limit,
      offset:    req.query.offset,
    };
    const [items, total] = await Promise.all([
      db.listTickets(guildId, filters),
      db.countTickets(guildId, filters),
    ]);
    res.json({ items, total });
  }));

  /** My own tickets — needs no permission at all. This is the end-user portal
   *  case: a member with zero dashboard permissions still sees their own tickets. */
  api.get('/tickets/mine', asyncRoute(async (req, res) => {
    const items = await db.getTicketsByUser(req.auth.userId, guildId, req.query.status || null);
    res.json({ items });
  }));

  api.get('/tickets/:id', asyncRoute(async (req, res) => {
    const ticket = await db.getTicketById(req.params.id);
    if (!ticket || ticket.guild_id !== guildId) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // You may look at a ticket if you can view tickets in general, OR if it is
    // your own. Ownership is checked against the DB, never against a claim made
    // by the client.
    const isMine = ticket.creator_id === req.auth.userId;
    if (!isMine && !req.auth.permissions.includes('tickets.view')) {
      return res.status(403).json({ error: 'You do not have permission to view this ticket.' });
    }

    const [notes, rating] = await Promise.all([
      req.auth.permissions.includes('tickets.view') ? db.getNotes(ticket.id) : [],
      db.getRating(ticket.id),
    ]);

    res.json({ ticket, notes, rating, isMine });
  }));

  /** Live conversation, fetched from Discord (the bot stores no message content). */
  api.get('/tickets/:id/messages', asyncRoute(async (req, res) => {
    const ticket = await db.getTicketById(req.params.id);
    if (!ticket || ticket.guild_id !== guildId) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    const isMine = ticket.creator_id === req.auth.userId;
    if (!isMine && !req.auth.permissions.includes('tickets.view')) {
      return res.status(403).json({ error: 'You do not have permission to view this ticket.' });
    }

    // A closed ticket's channel is usually gone — serve the stored transcript.
    // Also ask the MSK server for the hosted URL (premium) so the dashboard can
    // offer an "Open in new tab" link. Best-effort: a failure just means the URL
    // link is absent and only the download stays available.
    if (ticket.status === 'closed' && ticket.transcript) {
      const transcriptUrl = await getTranscriptUrl(ticket.id).catch(() => null);
      return res.json({ closed: true, transcript: ticket.transcript, transcriptUrl });
    }

    const messages = await getChannelMessages(ticket.channel_id, {
      limit: Number(req.query.limit) || 50,
      before: req.query.before || null,
    }).catch(() => []);

    res.json({
      closed: false,
      messages: (messages ?? []).map(m => ({
        id: m.id,
        content: m.content,
        author: {
          id: m.author?.id,
          name: m.author?.global_name || m.author?.username,
          bot: !!m.author?.bot,
          avatar: m.author?.avatar
            ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png?size=64`
            : null,
        },
        attachments: (m.attachments ?? []).map(a => ({ name: a.filename, url: a.url })),
        timestamp: m.timestamp,
        webhookId: m.webhook_id ?? null,
        // Discord resolves mentioned users for us, so the UI can show "@Name"
        // instead of the raw "<@123456…>" that would otherwise be unreadable.
        mentions: (m.mentions ?? []).map(u => ({
          id: u.id,
          name: u.global_name || u.username,
        })),
        mentionRoles: m.mention_roles ?? [],
      })).reverse(),
    });
  }));

  /**
   * Reply into a ticket. Two callers share this route:
   *   • staff with tickets.reply → may reply in ANY ticket
   *   • the ticket's creator with no permissions → may reply only in their OWN
   *     ticket (end-user portal case)
   * Both post under their OWN name/avatar via a webhook, so the reply in Discord
   * shows the person who actually wrote it, not the bot. The difference is only
   * WHICH tickets each may write into (requireCreator), not the identity shown.
   * The bot re-validates everything (open, not locked, not blacklisted, really
   * the creator) before anything reaches Discord.
   */
  api.post('/tickets/:id/reply', asyncRoute(async (req, res) => {
    const ticket = await db.getTicketById(req.params.id);
    if (!ticket || ticket.guild_id !== guildId) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const canStaffReply = req.auth.permissions.includes('tickets.reply');
    const isMine = ticket.creator_id === req.auth.userId;
    if (!canStaffReply && !isMine) {
      return res.status(403).json({ error: 'You do not have permission to reply here.' });
    }

    const result = await supervisor.command('ticket.reply', {
      ticketId: ticket.id,
      actorId: req.auth.userId,
      content: req.body?.content,
      asUser: true,                    // everyone posts under their own name/avatar
      requireCreator: !canStaffReply,  // non-staff may only reply in their own ticket
    });
    if (!result.ok) return res.status(400).json(result);

    audit(req, 'ticket.reply', String(ticket.id));
    res.json({ ok: true });
  }));

  const ticketAction = (action, permission, build) =>
    api.post(`/tickets/:id/${action}`, requirePermission(permission), asyncRoute(async (req, res) => {
      const ticket = await db.getTicketById(req.params.id);
      if (!ticket || ticket.guild_id !== guildId) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }
      const result = await supervisor.command(`ticket.${action}`, {
        ticketId: ticket.id,
        actorId: req.auth.userId,
        ...build(req),
      });
      if (!result.ok) return res.status(400).json(result);

      audit(req, `ticket.${action}`, String(ticket.id), build(req));
      res.json({ ok: true });
    }));

  ticketAction('close',    'tickets.act', (req) => ({ reason: req.body?.reason ?? null }));
  ticketAction('reopen',   'tickets.act', () => ({}));
  ticketAction('move',     'tickets.act', (req) => ({ type: req.body?.type }));
  ticketAction('claim',    'tickets.act', () => ({}));
  ticketAction('unclaim',  'tickets.act', () => ({}));
  ticketAction('priority', 'tickets.act', (req) => ({ priority: req.body?.priority }));
  ticketAction('lock',     'tickets.act', (req) => ({ locked: req.body?.locked !== false }));

  // ── Stats ──────────────────────────────────────────────────────────────────

  api.get('/stats', requirePermission('stats.view'), asyncRoute(async (req, res) => {
    res.json(await db.getStats(guildId));
  }));

  api.get('/stats/user/:userId', requirePermission('stats.view'), asyncRoute(async (req, res) => {
    res.json(await db.getUserStats(req.params.userId, guildId));
  }));

  // ── Discord lookups (turns raw snowflakes into names in the config UI) ──────

  api.get('/lookups', requirePermission(['config.view', 'config.edit', 'tickets.view']), asyncRoute(async (req, res) => {
    res.json(await getGuildLookups(guildId));
  }));

  /**
   * id → display name for the users the caller already sees (ticket creators,
   * staff who closed a ticket, note authors, …). Needs no permission: without it
   * even the end-user portal would show bare snowflakes.
   *
   * Two things keep this from becoming a Discord-wide name lookup service:
   *   • ids are capped and must look like snowflakes, and
   *   • only staff (tickets.view) get the fallback that resolves users OUTSIDE
   *     this guild. Everyone else can only resolve fellow guild members, whose
   *     names they can read in Discord anyway.
   */
  api.get('/users', asyncRoute(async (req, res) => {
    const ids = String(req.query.ids ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(id => /^\d{17,20}$/.test(id))
      .slice(0, 50);

    if (ids.length === 0) return res.json({ users: {} });

    const allowNonMembers = req.auth.isOwner || req.auth.permissions.includes('tickets.view');
    res.json({ users: await resolveUsers(guildId, ids, { allowNonMembers }) });
  }));

  // ── Config files ───────────────────────────────────────────────────────────

  // config.edit implies read: without it a user granted only "edit" would get a
  // 403 on GET and stare at an empty editor they are supposedly allowed to change.
  api.get('/config/:file', requirePermission(['config.view', 'config.edit']), asyncRoute(async (req, res) => {
    const rel = CONFIG_FILES[req.params.file];
    if (!rel) return res.status(400).json({ error: 'Unknown file.' });
    if (OWNER_ONLY_FILES.has(req.params.file) && !req.auth.isOwner) {
      return res.status(403).json({ error: 'Only the server owner can access the .env file.' });
    }

    const content = await fs.readFile(path.join(ROOT, rel), 'utf-8').catch(() => null);
    if (content === null) return res.status(404).json({ error: 'File not found.' });
    res.json({ content });
  }));

  api.put('/config/:file', requirePermission('config.edit'), asyncRoute(async (req, res) => {
    const key = req.params.file;
    const rel = CONFIG_FILES[key];
    if (!rel) return res.status(400).json({ error: 'Unknown file.' });
    if (OWNER_ONLY_FILES.has(key) && !req.auth.isOwner) {
      return res.status(403).json({ error: 'Only the server owner can edit the .env file.' });
    }

    const content = req.body?.content;
    if (typeof content !== 'string') return res.status(400).json({ error: 'Invalid body.' });
    if (content.length > 1_000_000) return res.status(413).json({ error: 'File exceeds the 1 MB limit.' });

    // Validate with the SAME parser and the SAME rules the bot boots with, so
    // the dashboard can never write a file that makes the bot exit(1) on restart.
    if (key === 'config' || key === 'snippets') {
      let parsed;
      try {
        parsed = JSON.parse(stripJsonComments(content));
      } catch (err) {
        return res.status(400).json({ error: `Syntax error: ${err.message}` });
      }
      if (key === 'config') {
        const errors = validateConfig(parsed);
        // TOKEN/CLIENT_ID/GUILD_ID live in .env and are already set for a running
        // bot — validateConfig also checks them, so drop those three here.
        const relevant = errors.filter(e => !e.startsWith('Environment variable'));
        if (relevant.length > 0) {
          return res.status(400).json({ error: 'Invalid configuration', detail: relevant.join('\n') });
        }
      }
    } else if (key === 'env') {
      const bad = content.split('\n').some((line) => {
        const t = line.trim();
        return t !== '' && !t.startsWith('#') && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(t);
      });
      if (bad) return res.status(400).json({ error: 'Invalid .env format (expected KEY=VALUE).' });
    }

    const target = path.join(ROOT, rel);
    await fs.copyFile(target, `${target}.bak`).catch(() => {}); // best-effort backup
    await fs.writeFile(target, content, 'utf-8');

    audit(req, 'config.edit', rel);
    res.json({ ok: true });
  }));

  // ── Locale files ─────────────────────────────────────────────────────────────
  // The translation JSON files in locales/. Edited as raw JSON (no form — they are
  // hundreds of flat keys). The name is validated against a strict pattern and the
  // resolved path is checked to stay inside LOCALES_DIR, so ":name" can never
  // traverse out of the folder.

  const LOCALES_DIR = path.join(ROOT, 'locales');
  const LOCALE_NAME_RE = /^[a-z0-9_-]+\.json$/i;

  const resolveLocale = (name) => {
    if (!LOCALE_NAME_RE.test(name)) return null;
    const target = path.join(LOCALES_DIR, name);
    // Defense in depth: the regex already forbids slashes and dots, but verify the
    // resolved path is a direct child of LOCALES_DIR anyway.
    if (path.dirname(target) !== LOCALES_DIR) return null;
    return target;
  };

  api.get('/locales', requirePermission(['config.view', 'config.edit']), asyncRoute(async (req, res) => {
    const files = await fs.readdir(LOCALES_DIR).catch(() => []);
    res.json({ files: files.filter(f => LOCALE_NAME_RE.test(f)).sort() });
  }));

  api.get('/locales/:name', requirePermission(['config.view', 'config.edit']), asyncRoute(async (req, res) => {
    const target = resolveLocale(req.params.name);
    if (!target) return res.status(400).json({ error: 'Invalid locale file name.' });
    const content = await fs.readFile(target, 'utf-8').catch(() => null);
    if (content === null) return res.status(404).json({ error: 'File not found.' });
    res.json({ content });
  }));

  api.put('/locales/:name', requirePermission('config.edit'), asyncRoute(async (req, res) => {
    const target = resolveLocale(req.params.name);
    if (!target) return res.status(400).json({ error: 'Invalid locale file name.' });

    // Must already exist — this route edits translations, it does not create files.
    const exists = await fs.access(target).then(() => true).catch(() => false);
    if (!exists) return res.status(404).json({ error: 'File not found.' });

    const content = req.body?.content;
    if (typeof content !== 'string') return res.status(400).json({ error: 'Invalid body.' });
    if (content.length > 1_000_000) return res.status(413).json({ error: 'File exceeds the 1 MB limit.' });
    try {
      JSON.parse(content); // locale files are plain JSON, no comments
    } catch (err) {
      return res.status(400).json({ error: `Syntax error: ${err.message}` });
    }

    await fs.copyFile(target, `${target}.bak`).catch(() => {});
    await fs.writeFile(target, content, 'utf-8');
    audit(req, 'locale.edit', req.params.name);
    res.json({ ok: true });
  }));

  // ── Bot control ────────────────────────────────────────────────────────────

  api.get('/bot/status', requirePermission(['bot.control', 'tickets.view']), (req, res) => {
    res.json(supervisor.getState());
  });

  api.get('/bot/logs', requirePermission('bot.control'), (req, res) => {
    res.json({ lines: supervisor.getLogs() });
  });

  api.post('/bot/:action', requirePermission('bot.control'), asyncRoute(async (req, res) => {
    const { action } = req.params;
    const allowed = ['start', 'stop', 'restart', 'update'];
    if (!allowed.includes(action)) return res.status(400).json({ error: 'Unknown action.' });

    const result = await supervisor[action]();
    audit(req, `bot.${action}`);

    if (result && result.ok === false) return res.status(400).json(result);
    res.json({ ok: true, ...(result ?? {}) });
  }));

  // ── Access control (the permission management itself) ───────────────────────

  api.get('/access', requirePermission('access.manage'), asyncRoute(async (req, res) => {
    const rows = await db.listDashboardAccess(guildId);
    res.json({
      permissions: PERMISSIONS,
      labels: PERMISSION_LABELS,
      entries: rows.map(r => ({
        subjectType: r.subject_type,
        subjectId: r.subject_id,
        permissions: parsePermissions(r.permissions),
        active: !!r.active,
        createdAt: r.created_at,
      })),
    });
  }));

  api.put('/access', requirePermission('access.manage'), asyncRoute(async (req, res) => {
    const { subjectType, subjectId, permissions, active = true } = req.body ?? {};

    if (!isSubjectType(subjectType)) return res.status(400).json({ error: 'subjectType must be "user" or "role".' });
    if (!/^\d{17,20}$/.test(String(subjectId ?? ''))) return res.status(400).json({ error: 'subjectId must be a Discord ID.' });
    if (!Array.isArray(permissions) || !permissions.every(isPermission)) {
      return res.status(400).json({ error: 'permissions contains an unknown entry.' });
    }

    // Guards against wrecking or escalating your own access. Granting permissions
    // to OTHER people stays allowed — only self-edits are constrained.
    const problem = checkSelfEdit({
      actorId: req.auth.userId,
      actorIsOwner: req.auth.isOwner,
      actorPermissions: req.auth.permissions,
      targetType: subjectType,
      targetId: subjectId,
      nextPermissions: permissions,
      nextActive: active,
    });
    if (problem) return res.status(403).json({ error: problem });

    await db.upsertDashboardAccess({
      guildId, subjectType, subjectId, permissions,
      active: active ? 1 : 0,
      createdBy: req.auth.userId,
    });
    invalidateMemberCache();

    audit(req, 'access.update', `${subjectType}:${subjectId}`, { permissions, active });
    res.json({ ok: true });
  }));

  api.delete('/access/:subjectType/:subjectId', requirePermission('access.manage'), asyncRoute(async (req, res) => {
    const { subjectType, subjectId } = req.params;
    if (!isSubjectType(subjectType)) return res.status(400).json({ error: 'Invalid subject type.' });

    // You cannot delete your own access — that is the self-lockout guard again,
    // just via a different verb.
    if (subjectType === 'user' && subjectId === req.auth.userId && !req.auth.isOwner) {
      return res.status(403).json({ error: 'You cannot remove your own access.' });
    }

    await db.deleteDashboardAccess(guildId, subjectType, subjectId);
    invalidateMemberCache();

    audit(req, 'access.delete', `${subjectType}:${subjectId}`);
    res.json({ ok: true });
  }));

  api.get('/access/audit', requirePermission('access.manage'), asyncRoute(async (req, res) => {
    res.json({ entries: await db.getDashboardAudit(guildId, req.query.limit) });
  }));

  // ── Blacklist ──────────────────────────────────────────────────────────────

  api.get('/blacklist', requirePermission('blacklist.manage'), asyncRoute(async (req, res) => {
    res.json({ entries: await db.getBlacklist(guildId) });
  }));

  api.post('/blacklist', requirePermission('blacklist.manage'), asyncRoute(async (req, res) => {
    const { userId, reason } = req.body ?? {};
    if (!/^\d{17,20}$/.test(String(userId ?? ''))) return res.status(400).json({ error: 'userId must be a Discord ID.' });

    await db.addToBlacklist({ userId, guildId, reason: reason ?? null, addedBy: req.auth.userId });
    audit(req, 'blacklist.add', userId, { reason: reason ?? null });
    res.json({ ok: true });
  }));

  api.delete('/blacklist/:userId', requirePermission('blacklist.manage'), asyncRoute(async (req, res) => {
    await db.removeFromBlacklist(req.params.userId, guildId);
    audit(req, 'blacklist.remove', req.params.userId);
    res.json({ ok: true });
  }));
}

module.exports = { registerRoutes, CONFIG_FILES };
