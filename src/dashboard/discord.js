/**
 * Minimal Discord REST client for the dashboard process.
 *
 * The bot itself runs as a CHILD process, so the dashboard has no discord.js
 * Client to borrow. Spinning up a second Client would open a second gateway
 * session for the same bot — so we talk plain REST with the bot token instead.
 *
 * Bonus: this keeps working while the bot is stopped or crashed, so an operator
 * can still inspect roles, channels and config in exactly the situation where
 * they need the dashboard most.
 *
 * Uses global fetch (Node >= 18) — no extra dependency.
 */

const API = 'https://discord.com/api/v10';

/** Message content is only populated if the app has the (privileged) MESSAGE_CONTENT
 *  intent enabled. That intent applies "across the APIs", i.e. to REST too — not
 *  just to gateway events — so a missing intent shows up as empty `content` here.
 *  Reading history additionally needs VIEW_CHANNEL + READ_MESSAGE_HISTORY on the
 *  channel; without the latter Discord returns an EMPTY LIST rather than an error. */

class DiscordApiError extends Error {
  constructor(status, body) {
    super(`Discord API ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * One REST call with the bot token.
 *
 * Discord's per-route limits are dynamic and delivered via headers, so we do not
 * hard-code any numbers — we simply honour a 429's Retry-After and try again.
 */
async function request(pathname, { method = 'GET', body, token = process.env.TOKEN, retries = 2 } = {}) {
  if (!token) throw new Error('TOKEN is not set — cannot talk to the Discord API.');

  // Resolve and pin the target host. Path segments are Discord snowflake IDs from
  // the DB or route params; concatenating them cannot change the host, but we
  // verify the origin anyway so a request can never be steered off discord.com.
  const url = new URL(`${API}${pathname}`);
  if (url.protocol !== 'https:' || url.host !== 'discord.com') {
    throw new Error(`Refusing request to unexpected host: ${url.host}`);
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 429 && retries > 0) {
    const retryAfter = Number(res.headers.get('retry-after') ?? 1);
    await new Promise(r => setTimeout(r, Math.min(retryAfter, 10) * 1000));
    return request(pathname, { method, body, token, retries: retries - 1 });
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }

  if (!res.ok) throw new DiscordApiError(res.status, parsed);
  return parsed;
}

// ── Guild ────────────────────────────────────────────────────────────────────

const getGuild        = (guildId) => request(`/guilds/${guildId}`);
const getGuildRoles   = (guildId) => request(`/guilds/${guildId}/roles`);
const getGuildChannels = (guildId) => request(`/guilds/${guildId}/channels`);

/** The member object, including their role ids. Returns null if they are not in the guild. */
async function getGuildMember(guildId, userId) {
  try {
    return await request(`/guilds/${guildId}/members/${userId}`);
  } catch (err) {
    if (err instanceof DiscordApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Everything the permission layer needs about one member, resolved server-side
 * via the bot. Deliberately NOT taken from the user's OAuth token: that would
 * mean trusting the client about their own roles, and it would force the extra
 * `guilds.members.read` scope on every login.
 */
async function resolveMemberContext(guildId, userId) {
  const [guild, member] = await Promise.all([
    getGuild(guildId),
    getGuildMember(guildId, userId),
  ]);
  return {
    inGuild: member !== null,
    isOwner: guild?.owner_id === userId,
    roleIds: member?.roles ?? [],
    nickname: member?.nick ?? null,
  };
}

// ── Messages ─────────────────────────────────────────────────────────────────

/**
 * Fetch a page of channel history (newest first). `limit` is capped at 100 by
 * Discord; paginate backwards with `before`.
 */
function getChannelMessages(channelId, { limit = 50, before = null } = {}) {
  const params = new URLSearchParams({ limit: String(Math.min(Math.max(limit, 1), 100)) });
  if (before) params.set('before', before);
  return request(`/channels/${channelId}/messages?${params}`);
}

// ── Name resolution (closes the "raw snowflake IDs" gap) ─────────────────────

/**
 * User names, cached.
 *
 * The database only ever stores snowflakes (`creator_id`, `closed_by`, …), so
 * without this every screen shows a 18-digit number where a human expects a
 * name. There is no bulk endpoint for "give me these N users", so we resolve
 * one by one and cache — a ticket list of 25 rows would otherwise hammer the
 * API on every single render.
 */
const USER_TTL_MS = 5 * 60 * 1000;
const USER_CACHE_MAX = 500;
const userCache = new Map(); // id → { value, at }

const avatarUrl = (user) =>
  user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : null;

/** A user who may not be in the guild (they can leave; their tickets remain). */
async function getUser(userId) {
  try {
    return await request(`/users/${userId}`);
  } catch (err) {
    if (err instanceof DiscordApiError && err.status === 404) return null;
    throw err;
  }
}

function cacheUser(id, value) {
  // Crude bound. A dashboard never sees enough distinct users for an LRU to be
  // worth the code; dropping everything is fine because it is only a cache.
  if (userCache.size >= USER_CACHE_MAX) userCache.clear();
  userCache.set(id, { value, at: Date.now() });
}

/**
 * Resolve display names for a batch of user ids → `{ [id]: {...} | null }`.
 *
 * `allowNonMembers` gates the fallback to `GET /users/{id}`, which resolves ANY
 * Discord account, not just members of this guild. Staff need it (a ticket
 * creator who has since left must still be identifiable); an end user must not
 * get it, or the dashboard would become a snowflake→name lookup service for the
 * whole platform.
 */
async function resolveUsers(guildId, ids, { allowNonMembers = false } = {}) {
  const unique = [...new Set(ids.filter(Boolean))];
  const now = Date.now();
  const out = {};

  await Promise.all(unique.map(async (id) => {
    const hit = userCache.get(id);
    if (hit && now - hit.at < USER_TTL_MS) {
      if (hit.value) {
        // A guild member is public info (anyone in the server sees their name).
        // A NON-member identity was resolved via GET /users/{id} and is staff-only
        // — serving it to an unprivileged caller is exactly the platform-wide
        // lookup the allowNonMembers flag exists to prevent.
        if (hit.value.inGuild || allowNonMembers) { out[id] = hit.value; return; }
        out[id] = null; return; // hide it, but keep the cached value intact
      }
      // Cached miss. Fine for an unprivileged caller (they would get null anyway);
      // a privileged caller must re-attempt, since the miss may predate the
      // /users fallback they are allowed to use.
      if (!allowNonMembers) { out[id] = null; return; }
    }

    const member = await getGuildMember(guildId, id).catch(() => null);
    let value = null;

    if (member?.user) {
      value = {
        id,
        name: member.nick || member.user.global_name || member.user.username,
        username: member.user.username ?? null,
        avatar: avatarUrl(member.user),
        inGuild: true,
      };
    } else if (allowNonMembers) {
      const user = await getUser(id).catch(() => null);
      if (user) {
        value = {
          id,
          name: user.global_name || user.username,
          username: user.username ?? null,
          avatar: avatarUrl(user),
          inGuild: false,
        };
      }
    }

    // Never let an unprivileged null miss overwrite a good value a privileged
    // caller resolved earlier — that would erase the name for everyone.
    if (value !== null || !hit?.value) cacheUser(id, value);
    out[id] = value;
  }));

  return out;
}

/** Maps of id → name for the pickers in the config UI. */
async function getGuildLookups(guildId) {
  const [roles, channels] = await Promise.all([
    getGuildRoles(guildId),
    getGuildChannels(guildId),
  ]);

  // Channel types: 0 = text, 4 = category. Everything else is irrelevant here.
  const isText     = (c) => c.type === 0;
  const isCategory = (c) => c.type === 4;

  return {
    roles: (roles ?? [])
      .filter(r => r.name !== '@everyone')
      .map(r => ({ id: r.id, name: r.name, color: r.color }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    channels: (channels ?? [])
      .filter(isText)
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    categories: (channels ?? [])
      .filter(isCategory)
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

module.exports = {
  request, DiscordApiError,
  getGuild, getGuildRoles, getGuildChannels, getGuildMember, getUser,
  resolveMemberContext, getChannelMessages, getGuildLookups, resolveUsers,
};
