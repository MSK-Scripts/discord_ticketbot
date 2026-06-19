/**
 * Generates a self-contained HTML transcript from a Discord channel's messages.
 * Avatars are fetched and embedded as Base64 data URIs so the HTML works
 * without any external CDN requests (Discord blocks cross-origin avatar loads).
 */

const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Neutral grey silhouette — always visible, zero external requests.
// Used whenever an avatar cannot be fetched/embedded.
const PLACEHOLDER_AVATAR = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='20' fill='%2336393f'/><text x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' font-size='18' fill='%2372767d'>?</text></svg>`;

// Inline clipboard icon for the code-block copy button (no external requests).
const COPY_ICON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

// Transcript UI strings live in the bot's locale files (locales/<lang>.json)
// under the "transcript" key, so every language's strings sit in one place next
// to the rest of its translations. English (en.json) is the fallback for any
// missing language or individual key.
const LOCALES_DIR = path.resolve(__dirname, '../../locales');
const _stringCache = new Map();

function loadEnglishTranscript() {
  try {
    return require(path.join(LOCALES_DIR, 'en.json')).transcript || {};
  } catch {
    return {};
  }
}

/**
 * Returns the transcript UI strings for a language, merged over the English
 * defaults so any missing key falls back to English. Unknown/invalid langs
 * resolve to English. Results are cached per language.
 * @param {string} lang
 * @returns {object}
 */
function getTranscriptStrings(lang) {
  const key = (typeof lang === 'string' && /^[a-z]{2,5}$/.test(lang)) ? lang : 'en';
  if (_stringCache.has(key)) return _stringCache.get(key);

  const en = loadEnglishTranscript();
  let chosen = en;
  if (key !== 'en') {
    try {
      const loc = require(path.join(LOCALES_DIR, `${key}.json`));
      if (loc && loc.transcript) chosen = loc.transcript;
    } catch { /* unknown/missing locale file → English fallback */ }
  }

  const merged = { ...en, ...chosen };
  _stringCache.set(key, merged);
  return merged;
}

/**
 * Whether a language has its own transcript translation (used for the
 * <html lang> attribute — falls back to "en" when it doesn't).
 * @param {string} lang
 * @returns {boolean}
 */
function hasTranscriptLocale(lang) {
  if (typeof lang !== 'string' || !/^[a-z]{2,5}$/.test(lang)) return false;
  if (lang === 'en') return true;
  try {
    const loc = require(path.join(LOCALES_DIR, `${lang}.json`));
    return !!(loc && loc.transcript);
  } catch {
    return false;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Custom Discord emoji syntax (in the raw, pre-escaped text): <:name:id> / <a:name:id>
const EMOJI_RE = /<(a)?:(\w+):(\d+)>/g;

function parseMarkdown(text, emojiMap, nameMap, roleMap, channelMap) {
  if (!text) return '';
  let html = escapeHtml(text);

  // Fenced code blocks — capture optional language label, strip the leading
  // newline (otherwise the block renders with an empty first line) and trim
  // trailing blank lines. The language is shown as a small tag (no colouring).
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_full, lang, code) => {
    const body   = code.replace(/^\n+/, '').replace(/\n+$/, '');
    const label  = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
    const copyBn = `<button class="copy-btn" type="button">${COPY_ICON}</button>`;
    return `<pre>${label}${copyBn}<code>${body}</code></pre>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
  // Custom emojis (matched in escaped form, e.g. "&lt;:name:123&gt;").
  // Embedded as Base64 data URIs (offline-safe); falls back to ":name:" text.
  html = html.replace(/&lt;(a)?:(\w+):(\d+)&gt;/g, (_full, _animated, name, id) => {
    const uri = emojiMap && emojiMap.get(id);
    return uri
      ? `<img class="emoji" src="${uri}" alt=":${name}:" title=":${name}:">`
      : `:${name}:`;
  });
  // User mentions — resolve to the display name when known, else keep the id.
  html = html.replace(/&lt;@!?(\d+)&gt;/g, (_full, id) => {
    const name = nameMap && nameMap.get(id);
    return `<span class="mention">@${name ? escapeHtml(name) : id}</span>`;
  });
  // Channel mentions — resolve to the channel name when known, else keep the id.
  html = html.replace(/&lt;#(\d+)&gt;/g, (_full, id) => {
    const name = channelMap && channelMap.get(id);
    return `<span class="mention">#${name ? escapeHtml(name) : id}</span>`;
  });
  // Role mentions — resolve to the role name when known, else a neutral "@role".
  html = html.replace(/&lt;@&amp;(\d+)&gt;/g, (_full, id) => {
    const name = roleMap && roleMap.get(id);
    return `<span class="mention">@${name ? escapeHtml(name) : 'role'}</span>`;
  });
  html = html.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function formatDate(date, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

async function fetchAllMessages(channel) {
  const messages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    messages.push(...batch.values());
    lastId = batch.last().id;

    if (batch.size < 100) break;
  }

  return messages.reverse();
}

/**
 * Fetches a remote image URL and returns a Base64 data URI string.
 * Returns a neutral SVG placeholder on failure so the transcript never
 * shows broken-image icons.
 *
 * Discord's CDN blocks cross-origin <img> loads when the HTML is served
 * from a third-party domain, so we embed avatars directly at generation time.
 *
 * @param {string} url
 * @returns {Promise<string>}  data URI or SVG placeholder
 */
async function fetchAsDataUri(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MSK-TicketBot/1.0 transcript-generator' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer      = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return PLACEHOLDER_AVATAR;
  }
}

/**
 * Build a map of { userId → base64DataUri } for every unique author
 * in the message list. Fetches are run in parallel.
 *
 * @param {import('discord.js').Message[]} messages
 * @returns {Promise<Map<string, string>>}
 */
async function buildAvatarMap(messages) {
  // Collect unique authors (id → avatarURL)
  const authorMap = new Map();
  for (const msg of messages) {
    if (!authorMap.has(msg.author.id)) {
      authorMap.set(
        msg.author.id,
        msg.author.displayAvatarURL({ extension: 'png', size: 64, forceStatic: true })
      );
    }
  }

  // Fetch all in parallel
  const entries = [...authorMap.entries()];
  const results = await Promise.allSettled(
    entries.map(([, url]) => fetchAsDataUri(url))
  );

  const avatarMap = new Map();
  entries.forEach(([id], i) => {
    const result = results[i];
    avatarMap.set(
      id,
      result.status === 'fulfilled' ? result.value : PLACEHOLDER_AVATAR
    );
  });

  return avatarMap;
}

/**
 * Build a map of { emojiId → base64DataUri } for every unique custom emoji
 * used in the messages (content + embed title/description). Custom emojis are
 * embedded just like avatars so the transcript stays fully offline-safe.
 * Failed fetches are dropped from the map (parseMarkdown then falls back to
 * ":name:" text).
 *
 * @param {import('discord.js').Message[]} messages
 * @returns {Promise<Map<string, string>>}
 */
async function buildEmojiMap(messages) {
  // Collect unique emoji ids → CDN url
  const urls = new Map();
  const scan = (text) => {
    if (!text) return;
    EMOJI_RE.lastIndex = 0;
    let m;
    while ((m = EMOJI_RE.exec(text)) !== null) {
      const [, animated, , id] = m;
      if (!urls.has(id)) {
        const ext = animated ? 'gif' : 'png';
        urls.set(id, `https://cdn.discordapp.com/emojis/${id}.${ext}?size=48`);
      }
    }
  };

  for (const msg of messages) {
    scan(msg.content);
    for (const e of msg.embeds) { scan(e.title); scan(e.description); }
  }

  if (urls.size === 0) return new Map();

  const entries = [...urls.entries()];
  const results = await Promise.allSettled(
    entries.map(([, url]) => fetchAsDataUri(url))
  );

  const emojiMap = new Map();
  entries.forEach(([id], i) => {
    const result = results[i];
    // fetchAsDataUri returns the SVG placeholder on failure — treat that as
    // "no emoji" so we render the ":name:" text fallback instead of a grey box.
    if (result.status === 'fulfilled' && result.value && !result.value.startsWith('data:image/svg')) {
      emojiMap.set(id, result.value);
    }
  });

  return emojiMap;
}

/**
 * Build a map of { userId → displayName } so that mentions and the header
 * fields (Created/Claimed/Closed by) show a readable name instead of a raw id.
 *
 * Seeded for free from the messages (authors + resolved mentions); only the
 * extra header ids that aren't covered are fetched from the guild/API. Any id
 * that stays unresolved is simply left out (callers fall back to the id).
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {import('discord.js').Message[]} messages
 * @param {string[]} [extraIds]  header ids to resolve even if they never posted
 * @returns {Promise<Map<string, string>>}
 */
async function buildNameMap(channel, messages, extraIds = []) {
  const map = new Map();
  const put = (id, name) => { if (id && name && !map.has(String(id))) map.set(String(id), name); };

  // Free: authors + anyone Discord already resolved as a mention.
  for (const msg of messages) {
    put(msg.author.id, msg.member?.displayName ?? msg.author.displayName ?? msg.author.username);
    if (msg.mentions?.members) {
      for (const m of msg.mentions.members.values()) put(m.id, m.displayName ?? m.user?.username);
    }
    if (msg.mentions?.users) {
      for (const u of msg.mentions.users.values()) put(u.id, u.displayName ?? u.username);
    }
  }

  // Resolve remaining header ids (creator/claimer/closer who may not have posted).
  for (const id of extraIds) {
    if (!id || map.has(String(id))) continue;
    try {
      const member = await channel.guild.members.fetch(id);
      put(id, member.displayName ?? member.user?.username);
    } catch {
      try {
        const user = await channel.client.users.fetch(id);
        put(id, user.displayName ?? user.username);
      } catch { /* leave unresolved → caller falls back to the id */ }
    }
  }

  return map;
}

/**
 * Build a map of { roleId → roleName } so that role mentions (`<@&id>`) render
 * the actual role name instead of a hardcoded "@role". Role mentions Discord
 * already resolved are taken for free; any remaining ids are looked up once from
 * the guild role cache/API. Unresolved ids fall back to the neutral "@role" text.
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {import('discord.js').Message[]} messages
 * @returns {Promise<Map<string, string>>}
 */
async function buildRoleMap(channel, messages) {
  const map = new Map();
  const ids = new Set();

  const scan = (text) => {
    if (!text) return;
    const re = /<@&(\d+)>/g;
    let m;
    while ((m = re.exec(text)) !== null) ids.add(m[1]);
  };

  for (const msg of messages) {
    // Free: roles Discord already resolved on the message.
    if (msg.mentions?.roles) {
      for (const r of msg.mentions.roles.values()) map.set(r.id, r.name);
    }
    scan(msg.content);
    for (const e of msg.embeds) { scan(e.title); scan(e.description); }
  }

  const missing = [...ids].filter(id => !map.has(id));
  if (missing.length > 0) {
    try {
      const roles = await channel.guild.roles.fetch();
      for (const id of missing) {
        const role = roles.get(id);
        if (role) map.set(id, role.name);
      }
    } catch { /* leave unresolved → parseMarkdown falls back to "@role" */ }
  }

  return map;
}

/**
 * Build a map of { channelId → channelName } so that channel mentions (`<#id>`)
 * render the channel name instead of the raw id. Channels Discord already
 * resolved on the message are taken for free; remaining ids are looked up from
 * the guild channel cache/API. Unresolved ids fall back to the raw id.
 *
 * @param {import('discord.js').TextChannel} channel
 * @param {import('discord.js').Message[]} messages
 * @returns {Promise<Map<string, string>>}
 */
async function buildChannelMap(channel, messages) {
  const map = new Map();
  const ids = new Set();

  const scan = (text) => {
    if (!text) return;
    const re = /<#(\d+)>/g;
    let m;
    while ((m = re.exec(text)) !== null) ids.add(m[1]);
  };

  for (const msg of messages) {
    // Free: channels Discord already resolved on the message.
    if (msg.mentions?.channels) {
      for (const c of msg.mentions.channels.values()) {
        if (c?.id && c?.name) map.set(c.id, c.name);
      }
    }
    scan(msg.content);
    for (const e of msg.embeds) { scan(e.title); scan(e.description); }
  }

  const missing = [...ids].filter(id => !map.has(id));
  for (const id of missing) {
    const cached = channel.guild.channels.cache.get(id);
    if (cached?.name) { map.set(id, cached.name); continue; }
    try {
      const fetched = await channel.guild.channels.fetch(id);
      if (fetched?.name) map.set(id, fetched.name);
    } catch { /* leave unresolved → parseMarkdown falls back to the id */ }
  }

  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Build the shared message markup (identical for both designs — the renderers
 * only differ in surrounding chrome/CSS, the per-message DOM stays the same).
 * @param {import('discord.js').Message[]} messages
 * @param {Map<string,string>} avatarMap
 * @param {Map<string,string>} emojiMap
 * @param {Map<string,string>} nameMap
 * @param {Map<string,string>} [attachmentUrls]  Discord attachment id → relative
 *        URL of the locally-stored copy (e.g. "attachments/<uuid>.png"). When an
 *        id is present the transcript links the persistent local file instead of
 *        the Discord CDN URL (those are signed and expire after ~24h). Missing
 *        ids fall back to the Discord URL.
 * @returns {string}
 */
function buildMessageRows(messages, avatarMap, emojiMap, nameMap, roleMap, channelMap, attachmentUrls, locale) {
  return messages.map(msg => {
    const avatarSrc = avatarMap.get(msg.author.id) ?? '';
    const isBot     = msg.author.bot ? '<span class="badge bot">BOT</span>' : '';
    const timestamp = formatDate(msg.createdAt, locale);

    const content = msg.content
      ? `<div class="msg-content">${parseMarkdown(msg.content, emojiMap, nameMap, roleMap, channelMap)}</div>`
      : '';

    const attachments = msg.attachments.size > 0
      ? [...msg.attachments.values()].map(att => {
          // Prefer the locally-stored copy (permanent); fall back to the Discord
          // CDN URL (signed, expires ~24h) only when the file wasn't uploaded.
          const url = attachmentUrls?.get(att.id) ?? att.url;
          if (att.contentType?.startsWith('image/')) {
            return `<img class="attachment-img" src="${escapeHtml(url)}" alt="${escapeHtml(att.name)}" loading="lazy">`;
          }
          return `<a class="attachment-file" href="${escapeHtml(url)}" target="_blank">📎 ${escapeHtml(att.name)}</a>`;
        }).join('')
      : '';

    const embeds = msg.embeds.map(e => {
      const title = e.title       ? `<div class="embed-title">${escapeHtml(e.title)}</div>`             : '';
      const desc  = e.description ? `<div class="embed-desc">${parseMarkdown(e.description, emojiMap, nameMap, roleMap, channelMap)}</div>`    : '';
      const color = e.color != null
        ? `border-left: 4px solid #${e.color.toString(16).padStart(6, '0')}`
        : '';
      return `<div class="embed" style="${color}">${title}${desc}</div>`;
    }).join('');

    return `
      <div class="message">
        <img class="avatar" src="${avatarSrc}" alt="">
        <div class="message-body">
          <div class="message-header">
            <span class="username">${escapeHtml(msg.author.displayName ?? msg.author.username)}</span>
            ${isBot}
            <time class="timestamp">${timestamp}</time>
          </div>
          ${content}${attachments}${embeds}
        </div>
      </div>`;
  }).join('');
}

/**
 * Inline, self-contained script that wires up the code-block copy buttons.
 * Uses the Clipboard API with an execCommand fallback, and reads the localized
 * button labels from the <body data-copy/data-copied> attributes. No external
 * requests; degrades gracefully (transcript still renders) if blocked by CSP.
 */
function copyScript() {
  return `<script>
(function(){
  var C=(document.body.dataset.copy||'Copy'), K=(document.body.dataset.copied||'Copied!');
  var CHECK='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  document.querySelectorAll('.copy-btn').forEach(function(b){ b.title=C; b.setAttribute('aria-label',C); });
  function flash(b){ var o=b.innerHTML; b.innerHTML=CHECK; b.classList.add('copied'); b.title=K; setTimeout(function(){ b.innerHTML=o; b.classList.remove('copied'); b.title=C; },1500); }
  function fallback(text){ try{ var ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.top='-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); var ok=document.execCommand('copy'); document.body.removeChild(ta); return ok; }catch(e){ return false; } }
  document.addEventListener('click', function(e){
    var b=e.target.closest?e.target.closest('.copy-btn'):null; if(!b) return;
    var pre=b.closest('pre'); var code=pre&&pre.querySelector('code'); if(!code) return;
    var text=code.innerText;
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(function(){flash(b);},function(){ if(fallback(text)) flash(b); }); }
    else { if(fallback(text)) flash(b); }
  });
})();
</script>`;
}

/**
 * Classic design — the original Discord-inspired dark transcript.
 */
function renderClassic({ ticketInfo, channel, guildName, t, locale, lang, messageRows, messageCount, openedAt, closedAt, createdBy, claimedBy, closedBy, closeReason }) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket #${ticketInfo.id} – ${escapeHtml(channel.name)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1e1f22; color: #dcddde;
      font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 14px; line-height: 1.5;
    }
    a { color: #00aff4; }
    code { background: #2b2d31; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 13px; }
    pre { position: relative; background: #2b2d31; padding: 32px 12px 12px; border-radius: 6px; overflow-x: auto; margin: 6px 0; }
    pre code { background: none; padding: 0; }
    .code-lang { position: absolute; top: 8px; left: 12px; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #72767d; }
    .copy-btn { position: absolute; top: 6px; right: 8px; display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 22px; padding: 0; background: #1e1f22; color: #b9bbbe; border: 1px solid #4f545c; border-radius: 5px; cursor: pointer; }
    .copy-btn:hover { color: #fff; border-color: #72767d; }
    .copy-btn.copied { color: #57f287; border-color: #57f287; }
    .emoji { width: 1.375em; height: 1.375em; vertical-align: bottom; object-fit: contain; }
    blockquote { border-left: 4px solid #4f545c; padding: 0 12px; margin: 4px 0; color: #b9bbbe; }
    .spoiler { background: #202225; color: transparent; border-radius: 3px; cursor: pointer; }
    .spoiler:hover { color: inherit; }
    .header {
      background: #2b2d31; padding: 20px 32px;
      border-bottom: 2px solid #1e1f22;
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 12px;
    }
    .header h1 { font-size: 20px; color: #fff; }
    .header h1 span { color: #5865f2; }
    .meta-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; }
    .meta-item { font-size: 12px; color: #b9bbbe; }
    .meta-item strong { color: #dcddde; display: block; }
    .badge { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-left: 4px; vertical-align: middle; }
    .badge.bot { background: #5865f2; color: #fff; }
    .messages { padding: 16px 32px; max-width: 900px; margin: 0 auto; }
    .message {
      display: flex; gap: 14px; padding: 8px 4px;
      border-radius: 4px; transition: background .1s;
    }
    .message:hover { background: #2e3035; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; background: #36393f; }
    .message-body { flex: 1; min-width: 0; }
    .message-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
    .username { font-weight: 600; color: #fff; }
    .timestamp { font-size: 11px; color: #72767d; }
    .msg-content { word-break: break-word; }
    .attachment-img { max-width: 400px; max-height: 300px; border-radius: 6px; margin-top: 6px; display: block; }
    .attachment-file { display: inline-block; background: #2b2d31; padding: 6px 12px; border-radius: 4px; margin-top: 6px; font-size: 13px; }
    .embed { background: #2b2d31; border-left: 4px solid #4f545c; border-radius: 0 4px 4px 0; padding: 10px 14px; margin-top: 6px; max-width: 520px; }
    .embed-title { font-weight: 600; color: #fff; margin-bottom: 4px; }
    .embed-desc { color: #b9bbbe; font-size: 13px; }
    .mention { background: rgba(88,101,242,.3); color: #dee0fc; border-radius: 3px; padding: 0 3px; font-weight: 500; }
    .footer { text-align: center; padding: 20px; color: #72767d; font-size: 12px; border-top: 1px solid #2b2d31; margin-top: 20px; }
  </style>
</head>
<body data-copy="${escapeHtml(t.copy)}" data-copied="${escapeHtml(t.copied)}">
  <div class="header">
    <div>
      <h1>🎫 ${escapeHtml(t.ticket)} <span>#${ticketInfo.id}</span></h1>
      <div style="color:#b9bbbe;margin-top:4px;">${escapeHtml(channel.name)} — ${escapeHtml(guildName)}</div>
      <div class="meta-grid">
        <div class="meta-item"><strong>${escapeHtml(t.type)}</strong>${escapeHtml(ticketInfo.type)}</div>
        <div class="meta-item"><strong>${escapeHtml(t.createdBy)}</strong>${createdBy}</div>
        <div class="meta-item"><strong>${escapeHtml(t.createdOn)}</strong>${openedAt}</div>
        <div class="meta-item"><strong>${escapeHtml(t.closedOn)}</strong>${closedAt}</div>
        ${closedBy ? `<div class="meta-item"><strong>${escapeHtml(t.closedBy)}</strong>${closedBy}</div>` : ''}
        ${claimedBy ? `<div class="meta-item"><strong>${escapeHtml(t.claimedBy)}</strong>${claimedBy}</div>` : ''}
        <div class="meta-item"><strong>${escapeHtml(t.priority)}</strong>${escapeHtml(ticketInfo.priority)}</div>
        <div class="meta-item"><strong>${escapeHtml(t.messages)}</strong>${messageCount}</div>
        ${closeReason ? `<div class="meta-item"><strong>${escapeHtml(t.closeReason)}</strong>${closeReason}</div>` : ''}
      </div>
    </div>
  </div>
  <div class="messages">
    ${messageRows || `<p style="color:#72767d;text-align:center;padding:40px 0;">${escapeHtml(t.empty)}</p>`}
  </div>
  <div class="footer">
    ${escapeHtml(t.generatedOn)} ${formatDate(new Date(), locale)} · Discord Ticket Bot
  </div>
  ${copyScript()}
</body>
</html>`;
}

/**
 * Modern design — minimal MSK-branded layout. Self-contained (no external
 * requests / offline-safe), system + monospace fonts only.
 */
function renderModern({ ticketInfo, channel, guildName, t, locale, lang, messageRows, messageCount, openedAt, closedAt, createdBy, claimedBy, closedBy, closeReason }) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket #${ticketInfo.id} – ${escapeHtml(channel.name)}</title>
  <style>
    /* ─── MSK Scripts — Ticket Transcript (modern) ──────────────────────── */
    :root {
      --bg:          #1c1f26;
      --bg-2:        #21252e;
      --panel:       #272c37;
      --panel-2:     #2e333f;
      --line:        rgba(255,255,255,.10);
      --line-strong: rgba(255,255,255,.16);
      --accent:      #2ee676;
      --accent-dim:  rgba(46,230,118,.16);
      --text:        #f3f4f7;
      --text-2:      #c7cad3;
      --muted:       #8b909c;
      --radius:      14px;
      --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", "Segoe UI Mono", Consolas, monospace;
      --sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      background:
        radial-gradient(1100px 460px at 50% -240px, rgba(46,230,118,.14), transparent 70%),
        var(--bg);
      background-attachment: fixed;
      color: var(--text);
      font-family: var(--sans);
      font-size: 15px; line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding: 0 20px 80px;
    }
    .wrap { max-width: 880px; margin: 0 auto; }

    a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; }
    a:hover { border-bottom-color: rgba(46,230,118,.5); }
    code { background: var(--bg-2); padding: 1.5px 6px; border-radius: 5px; font-family: var(--mono); font-size: .85em; border: 1px solid var(--line); }
    pre { position: relative; background: var(--bg-2); padding: 40px 16px 14px; border-radius: 10px; overflow-x: auto; margin: 8px 0; border: 1px solid var(--line); }
    pre code { background: none; padding: 0; border: 0; }
    .code-lang { position: absolute; top: 10px; left: 14px; font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
    .copy-btn { position: absolute; top: 8px; right: 10px; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 24px; padding: 0; background: var(--panel-2); color: var(--text-2); border: 1px solid var(--line); border-radius: 7px; cursor: pointer; transition: color .12s, border-color .12s; }
    .copy-btn:hover { color: var(--text); border-color: var(--line-strong); }
    .copy-btn.copied { color: var(--accent); border-color: rgba(46,230,118,.5); }
    .emoji { width: 1.375em; height: 1.375em; vertical-align: bottom; object-fit: contain; }
    blockquote { border-left: 3px solid var(--accent); padding: 2px 14px; margin: 6px 0; color: var(--text-2); }
    strong { color: #fff; }
    .spoiler { background: #14161b; color: transparent; border-radius: 4px; cursor: pointer; padding: 0 3px; }
    .spoiler:hover { color: inherit; background: var(--bg-2); }
    .mention { background: var(--accent-dim); color: var(--accent); border-radius: 5px; padding: 0 5px; font-weight: 500; }

    /* ─── Header card ─────────────────────────────────────────────────── */
    .header {
      position: relative; overflow: hidden;
      background: linear-gradient(180deg, var(--panel) 0%, var(--bg-2) 100%);
      border: 1px solid var(--line); border-radius: var(--radius);
      padding: 30px 32px 26px; margin: 40px 0 14px;
      box-shadow: 0 18px 50px rgba(0,0,0,.32);
    }
    .header::before {
      content: ""; position: absolute; inset: 0 auto 0 0; width: 3px;
      background: linear-gradient(180deg, var(--accent), transparent);
    }
    .eyebrow {
      font-family: var(--mono); font-size: 11px; letter-spacing: .22em;
      text-transform: uppercase; color: var(--muted); margin-bottom: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
    .header h1 { font-size: 30px; font-weight: 800; letter-spacing: -.02em; color: #fff; line-height: 1.1; }
    .header h1 span { color: var(--accent); font-family: var(--mono); font-weight: 700; }
    .subtitle { color: var(--text-2); margin-top: 6px; font-size: 14px; }
    .subtitle b { color: var(--text); font-weight: 600; }

    /* Flex chips so the last row stretches to fill — no empty grid cells. */
    .meta-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .meta-item {
      flex: 1 1 150px; min-width: 140px;
      background: var(--panel-2); border: 1px solid var(--line);
      border-radius: 10px; padding: 12px 14px;
    }
    .meta-item .k {
      font-family: var(--mono); font-size: 10px; letter-spacing: .14em;
      text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 4px;
    }
    .meta-item .v { color: var(--text); font-size: 14px; font-weight: 500; word-break: break-word; }
    .meta-item--wide { flex-basis: 100%; }

    .badge {
      font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: .08em;
      padding: 2px 6px; border-radius: 5px; margin-left: 6px; vertical-align: middle; text-transform: uppercase;
    }
    .badge.bot { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(46,230,118,.35); }

    /* ─── Messages ────────────────────────────────────────────────────── */
    .section-label {
      font-family: var(--mono); font-size: 11px; letter-spacing: .2em; text-transform: uppercase;
      color: var(--muted); padding: 26px 6px 12px; display: flex; align-items: center; gap: 12px;
    }
    .section-label::after { content: ""; flex: 1; height: 1px; background: var(--line); }

    .messages { display: flex; flex-direction: column; }
    .message {
      display: flex; gap: 16px; padding: 11px 14px;
      border-radius: 12px; transition: background .12s ease;
    }
    .message:hover { background: var(--panel); }
    .avatar {
      width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
      background: var(--panel-2); border: 1px solid var(--line-strong);
    }
    .message-body { flex: 1; min-width: 0; }
    .message-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
    .username { font-weight: 600; color: #fff; font-size: 15px; }
    .timestamp { font-family: var(--mono); font-size: 11px; color: var(--muted); letter-spacing: .02em; }
    .msg-content { word-break: break-word; color: var(--text); }

    .attachment-img {
      max-width: 420px; max-height: 320px; border-radius: 10px; margin-top: 8px;
      display: block; border: 1px solid var(--line);
    }
    .attachment-file {
      display: inline-flex; align-items: center; gap: 6px; background: var(--panel-2);
      padding: 8px 14px; border-radius: 8px; margin-top: 8px; font-size: 13px;
      border: 1px solid var(--line); color: var(--text-2);
    }
    .embed {
      background: var(--panel-2); border-left: 3px solid var(--accent); border-radius: 0 10px 10px 0;
      padding: 12px 16px; margin-top: 8px; max-width: 540px; border: 1px solid var(--line); border-left-width: 3px;
    }
    .embed-title { font-weight: 600; color: #fff; margin-bottom: 4px; }
    .embed-desc { color: var(--text-2); font-size: 14px; }

    .empty { color: var(--muted); text-align: center; padding: 60px 0; font-family: var(--mono); letter-spacing: .04em; }

    /* ─── Footer ──────────────────────────────────────────────────────── */
    .footer {
      text-align: center; padding: 34px 0 0; margin-top: 30px;
      border-top: 1px solid var(--line); color: var(--muted); font-size: 12px;
    }
    .footer .brand { color: var(--text-2); font-weight: 600; }
    .footer .brand b { color: var(--accent); }
    .footer .gen { font-family: var(--mono); font-size: 11px; margin-top: 6px; letter-spacing: .03em; }

    @media (max-width: 560px) {
      body { padding: 0 12px 60px; font-size: 14px; }
      .header { padding: 24px 20px; margin-top: 24px; }
      .header h1 { font-size: 24px; }
      .message { gap: 12px; padding: 10px 8px; }
      .avatar { width: 36px; height: 36px; }
    }
  </style>
</head>
<body data-copy="${escapeHtml(t.copy)}" data-copied="${escapeHtml(t.copied)}">
  <div class="wrap">
    <header class="header">
      <div class="eyebrow"><span class="dot"></span> ${escapeHtml(t.eyebrow)}</div>
      <h1>${escapeHtml(t.ticket)} <span>#${ticketInfo.id}</span></h1>
      <div class="subtitle"><b>${escapeHtml(channel.name)}</b> — ${escapeHtml(guildName)}</div>
      <div class="meta-grid">
        <div class="meta-item"><span class="k">${escapeHtml(t.type)}</span><span class="v">${escapeHtml(ticketInfo.type)}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.createdBy)}</span><span class="v">${createdBy}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.createdOn)}</span><span class="v">${openedAt}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.closedOn)}</span><span class="v">${closedAt}</span></div>
        ${closedBy ? `<div class="meta-item"><span class="k">${escapeHtml(t.closedBy)}</span><span class="v">${closedBy}</span></div>` : ''}
        ${claimedBy ? `<div class="meta-item"><span class="k">${escapeHtml(t.claimedBy)}</span><span class="v">${claimedBy}</span></div>` : ''}
        <div class="meta-item"><span class="k">${escapeHtml(t.priority)}</span><span class="v">${escapeHtml(ticketInfo.priority)}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.messages)}</span><span class="v">${messageCount}</span></div>
        ${closeReason ? `<div class="meta-item meta-item--wide"><span class="k">${escapeHtml(t.closeReason)}</span><span class="v">${closeReason}</span></div>` : ''}
      </div>
    </header>

    <div class="section-label">${escapeHtml(t.conversation)}</div>
    <main class="messages">
      ${messageRows || `<p class="empty">${escapeHtml(t.empty)}</p>`}
    </main>

    <footer class="footer">
      <div class="brand">MSK <b>Scripts</b> · Discord Ticket Bot</div>
      <div class="gen">${escapeHtml(t.generatedOn)} ${formatDate(new Date(), locale)}</div>
    </footer>
  </div>
  ${copyScript()}
</body>
</html>`;
}

/**
 * Generate a self-contained HTML transcript.
 * @param {import('discord.js').TextChannel} channel
 * @param {object} ticketInfo  DB ticket row
 * @param {string} guildName
 * @param {string} [design]  "modern" (default) or "classic"
 * @param {Map<string,string>} [attachmentUrls]  Discord attachment id → relative
 *        URL of the locally-stored copy. See buildMessageRows.
 * @param {string} [lang]  Transcript UI language ("en", "de", "hu", …) — read
 *        from the matching locales/<lang>.json "transcript" section. Falls back
 *        to English for any language without a transcript translation.
 * @returns {Promise<string>} Full HTML string
 */
async function generateTranscript(channel, ticketInfo, guildName, design = 'modern', attachmentUrls = null, lang = 'en') {
  const t      = getTranscriptStrings(lang);
  const locale = t.dateLocale || 'en-GB';

  const messages  = await fetchAllMessages(channel);
  const avatarMap = await buildAvatarMap(messages);
  const emojiMap  = await buildEmojiMap(messages);
  const nameMap   = await buildNameMap(channel, messages,
    [ticketInfo.creator_id, ticketInfo.claimed_by, ticketInfo.closed_by]);
  const roleMap    = await buildRoleMap(channel, messages);
  const channelMap = await buildChannelMap(channel, messages);

  const messageRows = buildMessageRows(messages, avatarMap, emojiMap, nameMap, roleMap, channelMap, attachmentUrls, locale);
  const openedAt    = formatDate(new Date(ticketInfo.created_at), locale);
  const closedAt    = ticketInfo.closed_at ? formatDate(new Date(ticketInfo.closed_at), locale) : '—';

  // Resolve user ids to names for the header; fall back to the raw mention if
  // the name can't be resolved. Closed-by / reason only when present.
  const nameOf = (id) => {
    if (id == null || id === '') return '—';
    const n = nameMap.get(String(id));
    return n ? escapeHtml(n) : `&lt;@${escapeHtml(String(id))}&gt;`;
  };
  const reasonRaw   = (ticketInfo.close_reason ?? '').toString().trim();
  const ctx = {
    ticketInfo, channel, guildName, t, locale,
    lang: hasTranscriptLocale(lang) ? lang : 'en',
    messageRows, messageCount: messages.length, openedAt, closedAt,
    createdBy:   nameOf(ticketInfo.creator_id),
    claimedBy:   ticketInfo.claimed_by ? nameOf(ticketInfo.claimed_by) : null,
    closedBy:    ticketInfo.closed_by  ? nameOf(ticketInfo.closed_by)  : null,
    closeReason: reasonRaw ? escapeHtml(reasonRaw) : null,
  };

  return design === 'classic' ? renderClassic(ctx) : renderModern(ctx);
}

module.exports = { generateTranscript };
