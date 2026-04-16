/**
 * Generates a self-contained HTML transcript from a Discord channel's messages.
 * No external dependencies — pure Node.js + Discord.js.
 */

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert basic Discord markdown to HTML.
 * Handles: **bold**, *italic*, __underline__, ~~strikethrough~~, `code`, ```codeblock```, > quote
 * @param {string} text
 * @returns {string}
 */
function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // Code blocks (must come before inline code)
  html = html.replace(/```(?:\w+\n)?([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  // Underline
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // Spoiler
  html = html.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
  // User mentions
  html = html.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@$1</span>');
  // Channel mentions
  html = html.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#$1</span>');
  // Role mentions
  html = html.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention">@role</span>');
  // URLs
  html = html.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  // Newlines
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Format a Date to a readable string.
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

/**
 * Fetch all messages from a channel (handles pagination).
 * @param {import('discord.js').TextChannel} channel
 * @returns {Promise<import('discord.js').Message[]>}
 */
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

  return messages.reverse(); // Oldest first
}

/**
 * Generate an HTML transcript string from a channel.
 * @param {import('discord.js').TextChannel} channel
 * @param {object} ticketInfo  – ticket DB row
 * @param {string} guildName
 * @returns {Promise<string>} HTML string
 */
async function generateTranscript(channel, ticketInfo, guildName) {
  const messages = await fetchAllMessages(channel);

  const messageRows = messages.map(msg => {
    const avatar = msg.author.displayAvatarURL({ extension: 'png', size: 64 });
    const isBot = msg.author.bot
      ? '<span class="badge bot">BOT</span>'
      : '';
    const timestamp = formatDate(msg.createdAt);

    const content = msg.content ? `<div class="msg-content">${parseMarkdown(msg.content)}</div>` : '';

    const attachments = msg.attachments.size > 0
      ? [...msg.attachments.values()].map(att => {
          if (att.contentType?.startsWith('image/')) {
            return `<img class="attachment-img" src="${att.url}" alt="${escapeHtml(att.name)}" loading="lazy">`;
          }
          return `<a class="attachment-file" href="${att.url}" target="_blank">📎 ${escapeHtml(att.name)}</a>`;
        }).join('')
      : '';

    const embeds = msg.embeds.map(e => {
      const title = e.title ? `<div class="embed-title">${escapeHtml(e.title)}</div>` : '';
      const desc  = e.description ? `<div class="embed-desc">${parseMarkdown(e.description)}</div>` : '';
      const color = e.color != null ? `border-left: 4px solid #${e.color.toString(16).padStart(6, '0')}` : '';
      return `<div class="embed" style="${color}">${title}${desc}</div>`;
    }).join('');

    return `
      <div class="message">
        <img class="avatar" src="${avatar}" alt="">
        <div class="message-body">
          <div class="message-header">
            <span class="username">${escapeHtml(msg.author.displayName ?? msg.author.username)}</span>
            ${isBot}
            <span class="timestamp">${timestamp}</span>
          </div>
          ${content}${attachments}${embeds}
        </div>
      </div>`;
  }).join('');

  const openedAt = formatDate(new Date(ticketInfo.created_at));
  const closedAt = ticketInfo.closed_at ? formatDate(new Date(ticketInfo.closed_at)) : '—';

  return `<!DOCTYPE html>
<html lang="de">
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
    pre { background: #2b2d31; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 6px 0; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #4f545c; padding: 0 12px; margin: 4px 0; color: #b9bbbe; }
    .spoiler { background: #202225; color: transparent; border-radius: 3px; cursor: pointer; }
    .spoiler:hover { color: inherit; }
    /* Header */
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
    /* Messages */
    .messages { padding: 16px 32px; max-width: 900px; margin: 0 auto; }
    .message {
      display: flex; gap: 14px; padding: 8px 4px;
      border-radius: 4px; transition: background .1s;
    }
    .message:hover { background: #2e3035; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; }
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
<body>
  <div class="header">
    <div>
      <h1>🎫 Ticket <span>#${ticketInfo.id}</span></h1>
      <div style="color:#b9bbbe;margin-top:4px;">${escapeHtml(channel.name)} — ${escapeHtml(guildName)}</div>
      <div class="meta-grid">
        <div class="meta-item"><strong>Typ</strong>${escapeHtml(ticketInfo.type)}</div>
        <div class="meta-item"><strong>Erstellt von</strong><@${ticketInfo.creator_id}></div>
        <div class="meta-item"><strong>Erstellt am</strong>${openedAt}</div>
        <div class="meta-item"><strong>Geschlossen am</strong>${closedAt}</div>
        ${ticketInfo.claimed_by ? `<div class="meta-item"><strong>Beansprucht von</strong><@${ticketInfo.claimed_by}></div>` : ''}
        <div class="meta-item"><strong>Priorität</strong>${escapeHtml(ticketInfo.priority)}</div>
        <div class="meta-item"><strong>Nachrichten</strong>${messages.length}</div>
      </div>
    </div>
  </div>
  <div class="messages">
    ${messageRows || '<p style="color:#72767d;text-align:center;padding:40px 0;">Keine Nachrichten</p>'}
  </div>
  <div class="footer">
    Generiert am ${formatDate(new Date())} · Discord Ticket Bot
  </div>
</body>
</html>`;
}

module.exports = { generateTranscript };
