// Declarative description of the bot config form.
//
// CONFIG_SCHEMA drives the generic form renderer for config.jsonc. Each field
// carries its JSONPath, an input kind, a label and (mostly) a help text lifted
// from the comments in config.example.jsonc. The "Ticket Types" section is a
// composite rendered by TicketTypesEditor; snippets.jsonc has its own composite
// (SnippetsEditor) and .env is driven by ENV_SCHEMA.
//
// The dashboard UI is English-only, so labels are plain strings (the msk-shop
// original carried bilingual labels because that site is localized).

const opt = (value, label) => ({ value, label });

// ── Reusable option sets ─────────────────────────────────────────────────────
export const PRIORITY_OPTIONS = [
  opt('low', 'Low'), opt('medium', 'Medium'), opt('high', 'High'), opt('urgent', 'Urgent'),
];
export const QUESTION_STYLE_OPTIONS = [
  opt('SHORT', 'Short (single line)'), opt('PARAGRAPH', 'Paragraph (multi-line)'),
];
const WHO_OPTIONS = [opt('EVERYONE', 'Everyone'), opt('STAFFONLY', 'Staff only')];

// ── config.jsonc ─────────────────────────────────────────────────────────────
export const CONFIG_SCHEMA = [
  {
    id: 'appearance',
    title: 'Startup & Appearance',
    fields: [
      { path: ['showLog'], kind: 'toggle', label: 'Show info logs',
        help: 'Show INFO log messages on startup (commands, events, components).' },
      { path: ['mainColor'], kind: 'color', label: 'Main color',
        help: 'Embed main color and accent of the modern HTML transcript.' },
      { path: ['lang'], kind: 'select', label: 'Bot language', dynamicOptions: 'locales',
        options: [opt('en', 'English'), opt('de', 'German'), opt('fr', 'French'), opt('es', 'Spanish'), opt('pt', 'Portuguese'), opt('pl', 'Polish'), opt('hu', 'Hungarian')] },
      { path: ['transcriptDesign'], kind: 'select', label: 'Transcript design',
        options: [opt('modern', 'Modern (MSK)'), opt('classic', 'Classic (Discord)')],
        help: 'HTML transcript style.' },
      { path: ['transcriptLang'], kind: 'select', label: 'Transcript language', dynamicOptions: 'locales',
        options: [opt('en', 'English'), opt('de', 'German'), opt('fr', 'French'), opt('es', 'Spanish'), opt('pt', 'Portuguese'), opt('pl', 'Polish'), opt('hu', 'Hungarian')],
        help: 'Language of the HTML transcript (falls back to English).' },
    ],
  },
  {
    id: 'panel',
    title: 'Ticket Panel',
    fields: [
      { path: ['openTicketChannelId'], kind: 'text', idKind: 'channel', label: 'Panel channel ID',
        help: 'Channel where /setup posts the ticket panel.' },
      { path: ['panel', 'interactionType'], kind: 'select', label: 'Interaction type',
        options: [opt('BUTTON', 'Button → select menu'), opt('SELECT_MENU', 'Select menu directly')] },
      { path: ['panel', 'autoUpdateOnStart'], kind: 'toggle', label: 'Auto-refresh panel on start',
        help: 'Refresh the existing /setup panel on every bot start (picks up embed/text changes).' },
      { path: ['panel', 'logo', 'enabled'], kind: 'toggle', label: 'Show logo' },
      { path: ['panel', 'logo', 'file'], kind: 'text', label: 'Logo file',
        help: 'Filename inside the assets/ folder.' },
      { path: ['panel', 'banner', 'enabled'], kind: 'toggle', label: 'Show banner' },
      { path: ['panel', 'banner', 'file'], kind: 'text', label: 'Banner file',
        help: 'Filename inside the assets/ folder.' },
    ],
  },
  {
    id: 'ticketTypes',
    title: 'Ticket Types',
    composite: 'ticketTypes',
    fields: [
      { path: ['ticketNameOption'], kind: 'text', label: 'Default channel name template',
        help: 'Placeholders: USERNAME, USERID, TICKETCOUNT.' },
    ],
  },
  {
    id: 'claim',
    title: 'Claim Options',
    fields: [
      { path: ['claimOption', 'claimButton'], kind: 'toggle', label: 'Show claim button' },
      { path: ['claimOption', 'nameWhenClaimed'], kind: 'text', label: 'Name when claimed',
        help: 'S_ = staff, U_ = user (USERNAME, USERID, TICKETCOUNT).' },
      { path: ['claimOption', 'categoryWhenClaimed'], kind: 'text', idKind: 'category', label: 'Category when claimed',
        help: 'Category ID to move the ticket to when claimed, or empty.' },
    ],
  },
  {
    id: 'access',
    title: 'Access Control',
    fields: [
      { path: ['rolesWhoHaveAccessToTheTickets'], kind: 'idList', idKind: 'role', label: 'Staff roles (global)',
        help: 'Roles with access to all tickets (fallback when a type has no staffRoles).' },
      { path: ['rolesWhoCanNotCreateTickets'], kind: 'idList', idKind: 'role', label: 'Roles blocked from creating tickets' },
    ],
  },
  {
    id: 'ping',
    title: 'Ping on Open',
    fields: [
      { path: ['pingRoleWhenOpened'], kind: 'toggle', label: 'Ping staff on new ticket' },
      { path: ['roleToPingWhenOpenedId'], kind: 'idList', idKind: 'role', label: 'Roles to ping' },
    ],
  },
  {
    id: 'logging',
    title: 'Logging',
    fields: [
      { path: ['logs'], kind: 'toggle', label: 'Enable close logs' },
      { path: ['logsChannelId'], kind: 'text', idKind: 'channel', label: 'Log channel ID' },
    ],
  },
  {
    id: 'close',
    title: 'Close Options',
    fields: [
      { path: ['closeOption', 'closeButton'], kind: 'toggle', label: 'Show close button' },
      { path: ['closeOption', 'dmUser'], kind: 'toggle', label: 'DM user on close' },
      { path: ['closeOption', 'createTranscript'], kind: 'toggle', label: 'Create transcript' },
      { path: ['closeOption', 'askReason'], kind: 'toggle', label: 'Ask for close reason' },
      { path: ['closeOption', 'whoCanCloseTicket'], kind: 'select', label: 'Who can close', options: WHO_OPTIONS },
      { path: ['closeOption', 'closeTicketCategoryId'], kind: 'text', idKind: 'category', label: 'Closed-tickets category',
        help: 'Category ID to move closed tickets to, or empty to not move.' },
    ],
  },
  {
    id: 'reopen',
    title: 'Reopen Options',
    fields: [
      { path: ['reopenOption', 'enabled'], kind: 'toggle', label: 'Allow reopening' },
      { path: ['reopenOption', 'button'], kind: 'toggle', label: 'Show reopen button' },
      { path: ['reopenOption', 'whoCanReopen'], kind: 'select', label: 'Who can reopen', options: WHO_OPTIONS },
    ],
  },
  {
    id: 'rating',
    title: 'Rating System',
    fields: [
      { path: ['ratingSystem', 'enabled'], kind: 'toggle', label: 'Ask for rating after close' },
      { path: ['ratingSystem', 'dmUser'], kind: 'toggle', label: 'Send rating request via DM' },
      { path: ['ratingSystem', 'ratingsChannelId'], kind: 'text', idKind: 'channel', label: 'Ratings channel ID' },
    ],
  },
  {
    id: 'staffReminder',
    title: 'Staff Reminder',
    fields: [
      { path: ['staffReminder', 'enabled'], kind: 'toggle', label: 'Enable staff reminder' },
      { path: ['staffReminder', 'afterHours'], kind: 'number', min: 1, label: 'After hours without reply' },
      { path: ['staffReminder', 'pingRoles'], kind: 'toggle', label: 'Mention staff roles' },
    ],
  },
  {
    id: 'autoClose',
    title: 'Auto-Close',
    fields: [
      { path: ['autoClose', 'enabled'], kind: 'toggle', label: 'Enable auto-close' },
      { path: ['autoClose', 'inactiveHours'], kind: 'number', min: 1, label: 'Close after inactive hours' },
      { path: ['autoClose', 'warnBeforeHours'], kind: 'number', min: 0, label: 'Warn hours before' },
      { path: ['autoClose', 'excludeClaimed'], kind: 'toggle', label: 'Exclude claimed tickets' },
    ],
  },
  {
    id: 'limits',
    title: 'Limits',
    fields: [
      { path: ['maxTicketOpened'], kind: 'number', min: 0, label: 'Max open tickets per user', help: '0 = unlimited.' },
    ],
  },
  {
    id: 'status',
    title: 'Bot Status',
    fields: [
      { path: ['status', 'enabled'], kind: 'toggle', label: 'Set a presence' },
      { path: ['status', 'dynamic'], kind: 'toggle', label: 'Dynamic text',
        help: 'Use the dynamic template with live ticket counts instead of the static text.' },
      { path: ['status', 'dynamicText'], kind: 'text', label: 'Dynamic text template',
        help: 'Placeholders: {open}, {total}, {closed}.' },
      { path: ['status', 'dynamicInterval'], kind: 'number', min: 1, label: 'Update interval (min)' },
      { path: ['status', 'text'], kind: 'text', label: 'Static text' },
      { path: ['status', 'type'], kind: 'select', label: 'Activity type',
        options: ['PLAYING', 'WATCHING', 'LISTENING', 'STREAMING', 'COMPETING'].map(v => opt(v, v[0] + v.slice(1).toLowerCase())) },
      { path: ['status', 'url'], kind: 'text', label: 'Stream URL', help: 'Only used for the STREAMING type.' },
      { path: ['status', 'status'], kind: 'select', label: 'Presence',
        options: [opt('online', 'Online'), opt('idle', 'Idle'), opt('dnd', 'Do not disturb'), opt('invisible', 'Invisible')] },
    ],
  },
  {
    id: 'notifications',
    title: 'User Notifications',
    fields: [
      { path: ['userNotifications', 'enabled'], kind: 'toggle', label: 'Show "Notify me" button',
        help: 'Users opt in to a DM when staff first replies (max 1 DM / 30 min).' },
    ],
  },
];

// ── Default literals for new array items ─────────────────────────────────────
export const DEFAULT_QUESTION = { label: '', placeholder: '', style: 'SHORT', maxLength: 100 };

export const DEFAULT_TICKET_TYPE = {
  codeName: '', name: '', description: '', emoji: '', color: '', categoryId: '',
  priority: 'medium', ticketNameOption: '', customDescription: '',
  cantAccess: [], staffRoles: [], askQuestions: false, questions: [],
};

export const DEFAULT_SNIPPET = { name: '', description: '', content: '', embed: null };

// ── .env ─────────────────────────────────────────────────────────────────────
// Grouped into sections mirroring CONFIG_SCHEMA. Each field is either a plain
// text field, a `secret: true` masked field (shown as "•••• set — leave blank to
// keep"), or a `kind: 'toggle'` boolean written as the string "true"/"false".
export const ENV_SCHEMA = [
  {
    id: 'core',
    title: 'Bot',
    fields: [
      { key: 'TOKEN', secret: true, label: 'Bot token',
        help: 'Discord bot token from the developer portal.' },
      { key: 'CLIENT_ID', label: 'Application / Client ID',
        help: 'Your Discord application ID.' },
      { key: 'GUILD_ID', label: 'Server (guild) ID',
        help: 'The Discord server the commands are registered to.' },
      { key: 'MSK_API_KEY', secret: true, label: 'MSK API key',
        help: 'Enables transcript links. Without it transcripts are sent as file attachments.' },
      { key: 'MSK_API_URL', label: 'MSK API URL',
        help: 'Base URL of the MSK API. Do not change unless self-hosting the website.' },
      { key: 'DATABASE_URL', secret: true, optional: true, label: 'Database URL',
        help: 'Optional. Empty = bundled SQLite. Otherwise mysql:// or postgres:// (append ?ssl=true for TLS).' },
    ],
  },
  {
    id: 'dashboard',
    title: 'Web Dashboard',
    help: 'Only used when you run the bot with the dashboard (npm run dashboard). Changes take effect after a restart. Prefer the guided "npm run dashboard:setup" for the first setup.',
    fields: [
      { key: 'DASHBOARD_ENABLED', kind: 'toggle', label: 'Enable the dashboard',
        help: 'Master switch. Off = plain bot only, no web server.' },
      { key: 'DASHBOARD_PUBLIC_PORTAL', kind: 'toggle', label: 'Public end-user portal',
        help: 'Off = staff-only. On = any member may sign in to manage only their own tickets.' },
      { key: 'DASHBOARD_HOST', label: 'Bind address',
        help: 'Keep 127.0.0.1 and put a reverse proxy in front. Only change this if you know exactly why.' },
      { key: 'DASHBOARD_PORT', label: 'Port',
        help: 'The port the dashboard listens on (default 3010).' },
      { key: 'DASHBOARD_PUBLIC_URL', label: 'Public URL',
        help: 'The URL your browser uses. Behind a proxy this is your public https address, not the bind address. Must match the Discord redirect URI.' },
      { key: 'CLIENT_SECRET', secret: true, label: 'OAuth client secret',
        help: 'Discord OAuth2 client secret (Developer Portal → OAuth2). Required for the dashboard login.' },
      { key: 'SESSION_SECRET', secret: true, label: 'Session secret',
        help: 'Cookie signing key. Generated automatically on first start — changing it signs everyone out. Never share or reuse it.' },
      { key: 'DASHBOARD_ALLOW_INSECURE', kind: 'toggle', optional: true, label: 'Allow insecure exposure',
        help: 'Advanced. Only if you terminate TLS somewhere the bot cannot see. Otherwise a public bind without https refuses to start.' },
      { key: 'DASHBOARD_TRUST_PROXY_SECRET', secret: true, optional: true, label: 'Trusted-proxy secret',
        help: 'Advanced, hosted setups only. Leave empty for a normal self-hosted dashboard.' },
    ],
  },
];
