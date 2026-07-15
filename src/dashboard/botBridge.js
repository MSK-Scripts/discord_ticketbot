/**
 * Bot-side end of the dashboard IPC bridge.
 *
 * Only active when the bot was started BY the supervisor (fork() gives us
 * process.send). Running `node index.js` standalone leaves this completely
 * inert, so the plain bot is unaffected.
 *
 * Everything that touches Discord has to happen here, in the bot process: closing
 * a ticket is not a DB update, it is the whole performClose flow (channel
 * permissions, transcript, upload, DM, rating, category move).
 *
 * SECURITY: every action re-validates its preconditions here, even though the
 * HTTP route already checked them. The bridge is the last gate before Discord,
 * and it must not trust its caller.
 */

const { escapeMarkdown } = require('discord.js');
const db = require('../database');
const { performClose, performReopen, performMove, performClaim, performUnclaim } = require('../utils/ticketActions');

/** Discord hard-caps a message at 2000 characters (bots do not get the Nitro 4000). */
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Mention policy for UNTRUSTED, user-supplied text.
 *
 * parse: [] means: parse no mention type at all out of the content. "@everyone"
 * still shows up as text but pings nobody. The empty roles/users arrays matter
 * too — a non-empty list would be an explicit allow-list that pings despite
 * parse: []. Filtering the string for "@everyone" would be useless: role
 * (<@&id>) and user (<@id>) mentions bypass any such text filter.
 */
const ZERO_PING = { parse: [], roles: [], users: [], repliedUser: false };

/** 1 << 2 — suppress link previews, so pasted URLs cannot render an embed. */
const SUPPRESS_EMBEDS = 1 << 2;

/**
 * Escape options for UNTRUSTED text.
 *
 * These are NOT the defaults, and the difference matters:
 * discord.js leaves `maskedLink`, `heading`, `bulletedList` and `numberedList`
 * OFF unless you ask for them. So a bare escapeMarkdown() happily lets
 * `[Free Nitro](https://evil.example)` through as a real, clickable link — which
 * is precisely the phishing vector that matters most here, because the message is
 * posted under ANOTHER USER'S name and avatar via a webhook.
 */
const ESCAPE_UNTRUSTED = {
  maskedLink: true,    // [text](url) — the phishing vector
  heading: true,       // "# " — lets a user shout in a ticket
  bulletedList: true,
  numberedList: true,
};

/**
 * Make user-supplied text safe to post into a Discord channel.
 * Escaping is only half of it — the caller must ALSO send ZERO_PING and
 * SUPPRESS_EMBEDS, since markdown escaping does nothing about mentions.
 */
function sanitizeUserText(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  return escapeMarkdown(text, ESCAPE_UNTRUSTED).slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Shared precondition check for anything that writes into a ticket channel.
 * Closes the three gaps that exist in the bot today:
 *   • `locked` is currently checked by NOBODY (it is only a Discord permission
 *     overwrite, which a web reply would bypass entirely)
 *   • the blacklist is only checked when OPENING a ticket, never when replying
 *   • Discord verifies the bot's permissions, never the end user's
 */
async function assertCanWrite(ticket, actorId, { requireCreator = false } = {}) {
  if (!ticket) return 'Ticket not found.';
  if (ticket.status !== 'open') return 'This ticket is closed.';
  if (ticket.locked) return 'This ticket is locked.';
  if (await db.isBlacklisted(actorId, ticket.guild_id)) return 'You are blacklisted.';
  if (requireCreator && ticket.creator_id !== actorId) return 'This is not your ticket.';
  return null;
}

/**
 * A closed ticket is READ-ONLY. Reopening it is the only state change allowed.
 *
 * Enforced centrally rather than per handler: the status check was originally
 * missing from priority, lock, move and unclaim, so a closed ticket could still
 * be re-prioritised or moved. Listing the exceptions in one place makes it
 * obvious when a new action forgets the rule.
 */
const ALLOWED_WHEN_CLOSED = new Set(['ticket.reopen']);

function assertMutable(action, ticket) {
  if (!ticket) return 'Ticket not found.';
  if (ticket.status !== 'open' && !ALLOWED_WHEN_CLOSED.has(action)) {
    return 'This ticket is closed. Reopen it first.';
  }
  return null;
}

function registerBotBridge(client) {
  // Not forked by the supervisor → no dashboard, nothing to do.
  if (typeof process.send !== 'function') return false;

  const handlers = {
    /**
     * Post a message into a ticket channel.
     *
     * `asUser`         — post under the actor's own name/avatar (webhook) instead
     *                    of the bot's identity. Every dashboard reply uses this so
     *                    the person who typed it is the one shown in Discord.
     * `requireCreator` — the actor may only write into their OWN ticket. This is
     *                    the end-user portal guard and is INDEPENDENT of `asUser`:
     *                    staff also post under their own name but may reply in any
     *                    ticket, so the two flags must not be conflated.
     */
    async 'ticket.reply'({ ticketId, actorId, content, asUser, requireCreator }) {
      const ticket = await db.getTicketById(ticketId);
      const problem = await assertCanWrite(ticket, actorId, { requireCreator: requireCreator === true });
      if (problem) return { ok: false, error: problem };

      const text = sanitizeUserText(content);
      if (!text) return { ok: false, error: 'The message is empty.' };

      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) return { ok: false, error: 'The ticket channel no longer exists.' };

      if (asUser) {
        // Post under the user's name/avatar via a webhook. Discord offers no way
        // to post AS a user (that would be impersonation) — a webhook message
        // still carries webhook_id and shows an APP badge, which is exactly what
        // we want: staff can tell the reply came from the web.
        //
        // The username is derived from the VERIFIED identity resolved server-side,
        // never from client input — otherwise a user could name themselves "Admin".
        const member = await channel.guild.members.fetch(actorId).catch(() => null);
        if (!member) return { ok: false, error: 'You are not a member of this server.' };

        const hook = await getOrCreateWebhook(channel, client.user.id);
        if (!hook) return { ok: false, error: 'The bot is missing the "Manage Webhooks" permission.' };

        await hook.send({
          content: text,
          username: member.displayName,
          avatarURL: member.displayAvatarURL(),
          allowedMentions: ZERO_PING,
          flags: SUPPRESS_EMBEDS,
        });
      } else {
        await channel.send({
          content: text,
          allowedMentions: ZERO_PING,
          flags: SUPPRESS_EMBEDS,
        });
      }

      return { ok: true };
    },

    async 'ticket.close'({ ticketId, actorId, reason }) {
      const ticket = await db.getTicketById(ticketId);
      if (!ticket) return { ok: false, error: 'Ticket not found.' };
      if (ticket.status !== 'open') return { ok: false, error: 'This ticket is already closed.' };

      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) return { ok: false, error: 'The ticket channel no longer exists.' };

      const closer = await client.users.fetch(actorId).catch(() => client.user);
      await performClose(client, channel, ticket, closer, reason || null);
      return { ok: true };
    },

    async 'ticket.reopen'({ ticketId, actorId }) {
      const ticket = await db.getTicketById(ticketId);
      if (!ticket) return { ok: false, error: 'Ticket not found.' };
      if (ticket.status !== 'closed') return { ok: false, error: 'This ticket is not closed.' };

      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) return { ok: false, error: 'The ticket channel no longer exists.' };

      const reopener = await client.users.fetch(actorId).catch(() => client.user);
      await performReopen(client, channel, ticket, reopener);
      return { ok: true };
    },

    async 'ticket.move'({ ticketId, actorId, type }) {
      const ticket = await db.getTicketById(ticketId);
      if (!ticket) return { ok: false, error: 'Ticket not found.' };

      const newType = (client.config.ticketTypes ?? []).find(t => t.codeName === type);
      if (!newType) return { ok: false, error: `Unknown ticket type: ${type}` };

      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) return { ok: false, error: 'The ticket channel no longer exists.' };

      const mover = await client.users.fetch(actorId).catch(() => client.user);
      await performMove(client, channel, ticket, newType, mover);
      return { ok: true };
    },

    async 'ticket.claim'({ ticketId, actorId }) {
      const ticket = await db.getTicketById(ticketId);
      if (!ticket) return { ok: false, error: 'Ticket not found.' };
      if (ticket.status !== 'open') return { ok: false, error: 'This ticket is closed.' };
      if (ticket.claimed_by) return { ok: false, error: 'This ticket is already claimed.' };

      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      await performClaim(client, channel, ticket, actorId);
      return { ok: true };
    },

    async 'ticket.unclaim'({ ticketId }) {
      const ticket = await db.getTicketById(ticketId);
      if (!ticket) return { ok: false, error: 'Ticket not found.' };
      if (!ticket.claimed_by) return { ok: false, error: 'This ticket is not claimed.' };

      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      await performUnclaim(client, channel, ticket);
      return { ok: true };
    },

    async 'ticket.priority'({ ticketId, priority }) {
      const valid = ['low', 'medium', 'high', 'urgent'];
      if (!valid.includes(priority)) return { ok: false, error: `Invalid priority: ${priority}` };

      const ticket = await db.getTicketById(ticketId);
      if (!ticket) return { ok: false, error: 'Ticket not found.' };

      await db.setPriority(ticket.channel_id, priority);
      return { ok: true };
    },

    async 'ticket.lock'({ ticketId, locked }) {
      const ticket = await db.getTicketById(ticketId);
      if (!ticket) return { ok: false, error: 'Ticket not found.' };

      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) return { ok: false, error: 'The ticket channel no longer exists.' };

      // The DB flag alone locks nothing — the actual effect is the channel
      // permission overwrite. Both must be kept in sync.
      await channel.permissionOverwrites.edit(ticket.creator_id, { SendMessages: !locked }).catch(() => null);
      if (locked) await db.lockTicket(ticket.channel_id);
      else        await db.unlockTicket(ticket.channel_id);

      return { ok: true };
    },
  };

  // process.send throws if the IPC channel is gone (supervisor died). That must
  // never bubble up as an unhandled rejection and take the bot down with it — the
  // whole point of the supervisor split is to keep the bot alive.
  const reply = (id, result) => {
    try { process.send({ __tb: 'reply', id, result }); }
    catch (err) { client.logger?.warn?.(`[Bridge] could not send reply: ${err.message}`); }
  };

  process.on('message', async (msg) => {
    if (!msg || msg.__tb !== 'command') return;

    const handler = handlers[msg.action];
    let result;
    try {
      if (!handler) {
        reply(msg.id, { ok: false, error: `Unknown action: ${msg.action}` });
        return;
      }

      // Central read-only gate for closed tickets. Done here, before dispatch, so
      // a handler physically cannot forget it — including any added later.
      const ticketId = msg.payload?.ticketId;
      if (ticketId !== undefined) {
        const ticket = await db.getTicketById(ticketId);
        const problem = assertMutable(msg.action, ticket);
        if (problem) {
          reply(msg.id, { ok: false, error: problem });
          return;
        }
      }

      result = await handler(msg.payload ?? {});
    } catch (err) {
      client.logger?.error?.(`[Bridge] ${msg.action} failed: ${err.stack ?? err.message}`);
      // Never leak internals to the browser.
      result = { ok: false, error: 'The action failed. Check the bot log for details.' };
    }
    reply(msg.id, result);
  });

  client.logger?.info?.('[Bridge] Dashboard IPC bridge active');
  return true;
}

/**
 * Reuse one webhook per channel. Discord caps a channel at 15 webhooks
 * (error 30007), so creating a fresh one per message would break quickly.
 *
 * In-flight creations are coalesced per channel: two concurrent "reply as user"
 * requests to the same channel would otherwise both find no webhook and both
 * create one, burning two of the 15 slots.
 */
const webhookInFlight = new Map(); // channelId → Promise<webhook|null>

function getOrCreateWebhook(channel, botUserId) {
  const pending = webhookInFlight.get(channel.id);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const hooks = await channel.fetchWebhooks();
      const existing = hooks.find(h => h.owner?.id === botUserId && h.token);
      if (existing) return existing;
      return await channel.createWebhook({ name: 'Ticket Dashboard' });
    } catch {
      return null; // missing MANAGE_WEBHOOKS
    } finally {
      webhookInFlight.delete(channel.id);
    }
  })();

  webhookInFlight.set(channel.id, promise);
  return promise;
}

module.exports = {
  registerBotBridge, sanitizeUserText, assertCanWrite,
  assertMutable, ALLOWED_WHEN_CLOSED,
  ZERO_PING, SUPPRESS_EMBEDS, MAX_MESSAGE_LENGTH,
};
