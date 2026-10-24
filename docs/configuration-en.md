# Configuration

The bot reads `config/config.jsonc` (JSON with comments). Every key is explained inline in [`config/config.example.jsonc`](../config/config.example.jsonc); this page is the overview. Back to the [README](../README.md) · [Deutsch](configuration-de.md)

A syntax error is reported with line, column and a pointer to the spot. Placeholders that were never replaced keep the ticket flow closed until you fill them in.

## Top-level keys

| Key | Description |
|---|---|
| `showLog` | Show INFO lines in the console (warnings and errors always show) |
| `mainColor` | Embed color and accent color of the modern transcript, `#rrggbb` |
| `lang` | Bot language: `en`, `de`, `fr`, `es`, `pt`, `pl`, `hu` |
| `transcriptDesign` | `modern` (default) or `classic` |
| `transcriptLang` | Language of the transcript, same codes as `lang`, falls back to English |
| `openTicketChannelId` | Channel that `/setup` posts the panel to |
| `panel` | `interactionType` (`BUTTON` or `SELECT_MENU`), `autoUpdateOnStart`, `logo`, `banner` (files from `assets/`) |
| `ticketTypes` | Up to 25 ticket types, see below |
| `ticketNameOption` | Channel name template: `USERNAME`, `USERID`, `TICKETCOUNT` |
| `claimOption` | `claimButton`, `nameWhenClaimed`, `categoryWhenClaimed` |
| `rolesWhoHaveAccessToTheTickets` | Global staff roles, used by types without their own `staffRoles` |
| `rolesWhoCanNotCreateTickets` | Roles that cannot open tickets at all |
| `pingRoleWhenOpened` · `roleToPingWhenOpenedId` | Ping roles when a ticket is opened |
| `logs` · `logsChannelId` | Log channel for closed tickets and update notices |
| `updateNotification` | `enabled` (default on), `intervalHours` (default 1, minimum 0.25) |
| `closeOption` | See below |
| `reopenOption` | `enabled`, `button`, `whoCanReopen` (`EVERYONE` or `STAFFONLY`) |
| `ratingSystem` | `enabled`, `dmUser`, `ratingsChannelId`, `commentRoles` |
| `staffReminder` | `enabled`, `afterHours`, `pingRoles` |
| `autoClose` | `enabled`, `inactiveHours`, `warnBeforeHours`, `excludeClaimed` |
| `maxTicketOpened` | Open tickets per user, `0` = unlimited |
| `status` | Bot presence, static `text` or `dynamic` with `{open}`, `{total}`, `{closed}` |
| `userNotifications` | `enabled`: shows the "Notify me" button in new tickets; at most one DM per ticket every 30 minutes |

## Ticket types

```jsonc
"ticketTypes": [
  {
    "codeName": "support",            // internal id, do not change once tickets exist
    "name": "Support",
    "description": "General questions",
    "emoji": "🎫",
    "color": "#5eb131",
    "categoryId": "CATEGORY_ID",
    "priority": "medium",             // low, medium, high, urgent
    "ticketNameOption": "",           // overrides the global template
    "customDescription": "",
    "cantAccess": [],                 // roles that cannot open this type
    "staffRoles": [],                 // empty = global staff roles
    "askQuestions": true,
    "questions": [ /* up to 5 */ ]
  }
]
```

**`staffRoles` replaces the global roles.** A type with its own `staffRoles` is handled by those roles only: they see the channel, can claim, lock, move and close, and the staff reminder pings them. The global `rolesWhoHaveAccessToTheTickets` do not act on such a ticket. If the global staff role should keep access, add it to the type's `staffRoles`. Administrators always have access.

## Closing

```jsonc
"closeOption": {
  "closeButton": true,
  "dmUser": true,               // send the creator a DM when the ticket closes
  "createTranscript": true,
  "transcriptToUser": true,     // false = transcript only in the log channel, not in the DM
  "askReason": true,
  "whoCanCloseTicket": "EVERYONE",   // or STAFFONLY
  "closeTicketCategoryId": "CATEGORY_ID"
}
```

Both transcript designs show display names instead of IDs, the closer and the close reason in the header, and a copy button on code blocks. Without an MSK API key the transcript is a self-contained HTML file with avatars, custom emojis and images (up to 5 MB) embedded. With a key it is uploaded and shared as a link, see [Service setup](setup-en.md).

## Ratings

```jsonc
"ratingSystem": {
  "enabled": true,
  "dmUser": true,               // ask in the DM instead of the channel
  "ratingsChannelId": "CHANNEL_ID",
  "commentRoles": []            // who may use "Comment Feedback"; empty = staff
}
```

## Auto-close and staff reminder

```jsonc
"autoClose":     { "enabled": true, "inactiveHours": 48, "warnBeforeHours": 6, "excludeClaimed": true },
"staffReminder": { "enabled": true, "afterHours": 4, "pingRoles": true }
```

`/autoclose pause` excludes a single ticket from both, `/autoclose resume` starts a fresh inactivity window.

## Canned responses

Snippets live in their own file, `config/snippets.jsonc` (template: [`snippets.example.jsonc`](../config/snippets.example.jsonc)):

```jsonc
{
  "snippets": [
    {
      "name": "welcome",
      "description": "Welcome message",
      "content": "Hey {user}! Thanks for opening a ticket.",
      "embed": { "title": "👋 Welcome", "color": "#5865F2" }
    }
  ]
}
```

Placeholders: `{user}`, `{staff}`, `{type}`, `{priority}`. Commands: `/snippet send <name>`, `/snippet list`, with autocomplete.

## Secrets and environment

Tokens, the MSK API key, database credentials and dashboard secrets go into `.env`, never into `config.jsonc`. See [Installation](installation-en.md) and [Dashboard](dashboard-en.md).

## Adding a language

1. Copy `locales/en.json` to `locales/<code>.json`, for example `locales/it.json`.
2. Translate every string, including the `transcript` block.
3. Set `"lang": "it"` (and `"transcriptLang": "it"`) in `config.jsonc`.

Missing keys show up as their path (for example `messages.foo`), which makes gaps easy to spot. Pull requests with new languages are welcome, see [CONTRIBUTING](../CONTRIBUTING.md).
