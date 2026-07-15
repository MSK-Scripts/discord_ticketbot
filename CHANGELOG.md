# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **How releases work:** the section matching the released tag (e.g. `## [2.2.0]`)
> is automatically lifted to the top of the GitHub Release notes by
> `.github/workflows/release.yml`. Keep this file up to date before tagging.

## [2.7.1] - 2026-07-15

### Fixed
- **Dashboard replies now show the person who wrote them, not the bot.** A staff
  reply sent from the dashboard was posted under the bot's name and avatar, while
  an end-user reply was correctly posted under the user's own identity. The reply
  handler had conflated two separate concerns into one flag: whose identity to
  post under, and whether the sender may only write in their own ticket. They are
  now independent. Every dashboard reply is posted under the sender's own name and
  avatar via the existing webhook path, and the "own ticket only" rule applies just
  to end users without permissions. All security checks are unchanged (ticket open,
  not locked, not blacklisted, verified identity, zero-ping, markdown escaping), and
  the reply still carries Discord's `APP` badge, which cannot be removed.

## [2.7.0] - 2026-07-15

### Added
- **Web dashboard** (optional, disabled by default). Manage tickets, statistics
  and the bot configuration in a browser instead of over SSH. Start it with
  `npm run dashboard`; `npm start` still runs the plain bot with no web server.
  See [docs/dashboard-en.md](docs/dashboard-en.md).
  - **Tickets**: filterable list, ticket detail with the conversation fetched live
    from Discord, and claim / close / reopen / move / lock / priority actions.
  - **My tickets**: any member — even with no dashboard permissions at all — sees
    the tickets they opened and can reply to the open ones. The reply is posted
    into the Discord channel under their own name via a webhook.
  - **Closed tickets** offer both a transcript **download** (the stored HTML) and,
    when the transcript is hosted on the MSK server (premium), an **Open transcript**
    link that opens the hosted page in a new tab. The URL is fetched live from the
    MSK server by ticket id — the bot never stores it, so it also works for tickets
    that were closed before this existed. Needs the corresponding `msk-shop` deploy
    (`app/api/transcript/url`).
  - **Statistics** including team performance (tickets closed per staff member).
  - **Configuration editor** with two modes, switchable per file: a structured
    **Form** view (default) and the raw **File** view. The form covers all of
    `config.jsonc` (including a ticket-types builder for up to 25 types with a
    nested questions builder up to 5), `snippets.jsonc` and `.env`. Every field
    change is a comment-preserving patch of the underlying file, so the `//` help
    comments survive editing, and the form validates with the same rules the bot
    boots with (errors block Save). The File view has line numbers and lightweight
    syntax highlighting (no heavy editor dependency). Switching mode or file with
    unsaved changes is guarded. A side panel resolves Discord role/channel/category
    **names**, so raw snowflake IDs no longer have to be looked up by hand, and the
    bot/transcript language dropdowns list the locale files that actually exist.
  - **Names instead of IDs everywhere**: ticket creators, staff who claimed or
    closed a ticket, note authors, the team ranking and the audit log all show
    the Discord display name and avatar rather than an 18-digit snowflake. Users
    who have left the server are still resolved, and marked as gone. Only staff
    can resolve users outside the server, so the dashboard cannot be abused as a
    snowflake-to-name lookup for arbitrary Discord accounts.
  - **Bot control**: start / stop / restart / update, plus a live console.
  - **Permission management**: grant dashboard access to roles or single users.
    A **user entry overrides that person's role entries**, which is what makes it
    possible to revoke a single permission that a role grants. The server owner
    always has every permission and cannot lock themselves out. Every change is
    written to an audit log.
- **Guided setup** (`npm run dashboard:setup`): generates the signing secret,
  walks through the Discord OAuth setup, prints a ready-to-use Apache + certbot
  configuration, and refuses to write an insecure combination.
- **Test suite** (`npm test`) covering sessions, CSRF, rate limiting, client-IP
  resolution and the permission model. Uses Node's built-in test runner, so it
  adds no dependencies.
- **Locale editing** in the dashboard. The translation files in `locales/` can now
  be edited (and validated as JSON) from the Configuration screen, gated on the
  same `config.view` / `config.edit` permissions. The file name is validated and
  the path is confined to `locales/`, so it cannot be used to read or write
  anywhere else.

### Changed
- **Dashboard UI rebuilt on Tailwind CSS v4 + shadcn/ui**, and made fully
  responsive: the sidebar collapses into a drawer on small screens, tables scroll,
  and grids reflow to a single column. Accessible primitives (dialog, select,
  switch, dropdown) replace the hand-rolled ones — e.g. the close confirmation is
  now a real modal. The MSK dark/green look is preserved via theme tokens. Fonts
  (DM Sans / Space Mono / Syne) are **bundled locally** via `@fontsource`, so the
  dashboard loads no external font CDN (which its strict CSP forbids anyway). All
  of this is a frontend build concern only: the committed `web/dist` is what ships,
  so a self-hoster still never runs a build, and the bot's runtime dependencies are
  unchanged.
- **The bot now runs as a child process of the dashboard when the dashboard is
  enabled.** A dashboard inside the bot process could not restart the process it
  is served from, and would be unreachable after a crash — which is exactly when
  it is needed. `index.js` remains the plain, unchanged bot entry point.
- `performClaim` / `performUnclaim` extracted into `src/utils/ticketActions.js`.
  The `/claim` command, the claim button and the dashboard now share one
  implementation instead of three copies that could drift apart.
- New optional dependencies `express` and `helmet`, declared as
  `optionalDependencies` — anyone who does not use the dashboard never installs
  them, and the base bot keeps its five production dependencies.
- New database tables `dashboard_access` and `dashboard_audit` (created
  automatically on all three engines).

### Fixed
- **`@everyone` / `@here` can no longer be pinged by the bot.** A global
  `allowedMentions` policy is now set on the Discord client, so no message — not
  a snippet, not a broadcast, not any future user-supplied text — can trigger a
  server-wide ping, even if a call site forgets to guard against it. Intentional
  staff-role pings (ticket opened, staff reminder) are unaffected.
- **Locked tickets were not actually enforced anywhere in code.** `/lock` only set
  a Discord channel permission overwrite; the `locked` database flag was never
  checked. Any write path that does not go through Discord's own permission check
  — such as a dashboard reply — would have bypassed the lock entirely. It is now
  enforced.
- **The blacklist was only checked when opening a ticket, never when replying.** A
  blacklisted user with an open ticket could keep writing. Replies are now checked
  as well.
- **Example placeholders in `config.jsonc` passed validation.** A fresh install
  with `"ROLE_ID_TEAM"` or `"CHANNEL_ID_HERE"` still left over started up fine and
  then failed on the *first ticket* with a discord.js error that named neither the
  field nor the file (`Supplied parameter is not a cached User or Role`).
  `validateConfig` now checks every Discord ID (channels, categories, role lists,
  per ticket type) and refuses to start, naming the exact field — but only for the
  features that are actually switched on, so an unused `logsChannelId` is not a
  boot blocker.
- **A role deleted in Discord broke ticket creation entirely.** Discord.js rejects
  the whole channel creation if a single permission-overwrite id is unknown, so one
  stale role id in the config made *every* ticket fail. Unknown roles are now
  skipped with a clear warning and the ticket is still created.
- **Missing bot permissions produced a bare 403 on the first ticket.** The bot
  started up looking healthy and then failed with
  `DiscordAPIError[50013]: Missing Permissions`, naming neither the permission nor
  the fix. A startup check now lists exactly what is missing and prints a re-invite
  link. It also warns when the bot's role sits below a staff role. Note two
  non-obvious requirements: `Manage Roles` is needed to set channel permission
  overwrites at all, and `Manage Messages` is needed because the bot *grants* that
  permission to staff — Discord only lets you hand out permissions you hold.
- **Closed tickets were not read-only.** `priority`, `lock`, `move` and `unclaim`
  never checked the ticket status, so a closed ticket could still be re-prioritised
  or moved from the dashboard. The rule ("a closed ticket is read-only; only
  `reopen` is allowed") is now enforced centrally before an action is dispatched,
  as a deny-list of exceptions — so an action added later is covered automatically
  instead of silently exempt.
- **Masked links were not escaped, defeating the anti-phishing measure.**
  discord.js leaves `maskedLink` off by default, so `escapeMarkdown()` let
  `[Free Nitro](https://evil.example)` through as a real clickable link — posted
  under *another user's* name and avatar via the webhook. Untrusted text is now
  escaped with `maskedLink`, `heading`, `bulletedList` and `numberedList` enabled.
- **The dashboard's `index.html` was cacheable**, so after an update a browser kept
  loading the previous JavaScript bundle: users would see a stale UI (or a blank
  page once the old bundle was deleted) with no way to recover by reloading.
  `index.html` is now `no-store`; the hashed assets stay immutably cached.
- **`.env` writes duplicated keys on Windows.** With CRLF line endings the patcher
  failed to recognise existing keys and appended duplicates instead of updating
  them (in JS regex, `.` does not match `\r` and `$` does not match before it, so a
  pattern ending in `(.*)$` fails on every line of a CRLF file). Reading and
  patching are now CRLF-safe, the original line endings are preserved, and the
  setup script repairs any duplicates a previous run left behind.
- **The ticket view went stale.** If a ticket was closed in Discord while its
  dashboard page was open, the page kept showing it as open and kept offering
  Close/Reply, which then failed for no visible reason. The view now refreshes
  periodically and on window focus.
- **A multi-tenant audit hardened the dashboard before release** (findings fixed
  in this same version):
  - **`.env` is now owner-only.** It holds `SESSION_SECRET`, `TOKEN`,
    `CLIENT_SECRET` and `DATABASE_URL`; a staff member with only `config.view`
    could read it and then forge an owner session. The `.env` file (read and
    write) is restricted to the guild owner, who already controls the bot outright;
    the tab is hidden for everyone else.
  - **`.env` edits now take effect on restart.** The supervisor forked the bot with
    the environment loaded once at boot, so a rotated `TOKEN`/`DATABASE_URL` was
    silently ignored even after a restart. It now re-reads `.env` from disk before
    every (re)start.
  - **Blacklist is now scoped per guild.** The `UNIQUE` constraint was on `user_id`
    alone, so on a shared external database only the first guild could blacklist a
    given user and every other guild's entry was silently dropped; `removeFromBlacklist`
    likewise ignored the guild and could delete another guild's row. The constraint
    is now `(guild_id, user_id)` (with an automatic migration for existing SQLite
    databases), and both add and remove are guild-scoped everywhere, including the
    dashboard route.
  - **Auto-close and staff-reminder loops are now guild-scoped.** Their queries had
    no `guild_id` filter and were only kept in bounds incidentally; on a shared DB
    they could have acted on another tenant's tickets.
  - **A user-name cache could leak identities across the permission boundary.**
    Staff can resolve users outside the server (a ticket creator who left); that
    result was cached without recording it was privileged, so a permissionless
    member could read it back. The cache now records whether a value is a guild
    member and never serves an outside-user identity to an unprivileged caller.
  - **Robustness:** a dashboard action no longer hangs for 90s when the bot dies
    mid-action (it fails fast); a crash-scheduled restart can be cancelled by an
    explicit Stop; the dashboard reaps the bot on SIGTERM/SIGINT (preventing a
    second gateway connection on the next start); a double close (Discord + dashboard
    + auto-close racing) is prevented, so the creator no longer gets two DMs and two
    rating prompts; concurrent "reply as user" requests reuse one webhook instead of
    burning two of the channel's 15 slots; and an IPC reply on a severed channel can
    no longer crash the bot.
  - **Frontend:** closed tickets now offer a transcript download (the stored
    conversation was fetched but never shown); `config.edit` now implies read
    (an "edit only" grant no longer 403s into an empty editor); the ticket type
    filter is debounced; the permission editor exposes the `active` toggle; a reply
    refreshes the message count immediately; and the remaining `window.confirm()`
    prompts were replaced with inline confirmations.

## [2.6.0] - 2026-06-27

### Added
- **MySQL/MariaDB and PostgreSQL support.** The bot now runs on an external
  MySQL/MariaDB or PostgreSQL database in addition to the bundled SQLite file.
  Pick the backend with a single `DATABASE_URL` in `.env`:
  - `mysql://user:pass@host:3306/ticketbot` (MySQL/MariaDB)
  - `postgres://user:pass@host:5432/ticketbot` (PostgreSQL)
  - unset / empty → SQLite (`data/tickets.db`), unchanged default.

  Append `?ssl=true` (or `?sslmode=require`) for managed databases that require
  TLS. The schema is created automatically on first start for every engine.
- **Data migration script** (`npm run db:migrate`). Copies an existing SQLite
  database into the configured target, primary keys preserved and PostgreSQL id
  sequences reset, so closed-ticket history and stats survive the switch. Refuses
  to write into a non-empty target unless `--force` is passed. Supports
  `--from <path>` and `--to <url>` overrides.

### Changed
- The database layer (`src/database/`) is now engine-agnostic and fully async.
  Queries are written once with `?` placeholders and dispatched to a per-engine
  driver (SQLite/MySQL/PostgreSQL); the public function API is unchanged. SQLite
  installs behave exactly as before — no config change required.

### Notes
- Adds `mysql2` and `pg` as dependencies. `npm audit` reports 0 vulnerabilities.

## [2.5.1] - 2026-06-27

### Changed
- **Auto-close now behaves exactly like a manual `/close`.** Inactivity-closed
  tickets previously used a separate, reduced closing path: the closing message
  had no delete/reopen button (forcing staff to delete the channel manually),
  the creator kept channel access, transcripts were never uploaded to the MSK
  service, and no close DM/rating request was sent. The auto-close loop now calls
  the shared `performClose()` flow with the bot as the closer, so auto-closed
  tickets get the full treatment: delete (and optional reopen) button, creator
  access removal, MSK transcript upload with file fallback, log-channel entry,
  close DM, rating request, closed-category move, and `closed-` rename.

### Added
- Shared `buildClosedButtons()` helper in `src/utils/ticketActions.js` for the
  closed-embed button row (delete + optional reopen), used by `performClose()`.

### Security
- **Patched 4 `undici` advisories (1 high, 3 moderate)** pulled in transitively
  through `discord.js` (via `@discordjs/rest`/`@discordjs/ws`, pinned to the
  vulnerable `undici@6.24.1`): HTTP header injection via `Set-Cookie`
  percent-decoding (GHSA-p88m-4jfj-68fv, high), WebSocket DoS via fragment-count
  bypass (GHSA-vxpw-j846-p89q), HTTP response-queue poisoning via keep-alive
  socket reuse (GHSA-35p6-xmwp-9g52), and `SameSite` attribute downgrade
  (GHSA-g8m3-5g58-fq7m). Resolved with a `package.json` `overrides` entry forcing
  `undici@^6.27.0` across the tree — no `discord.js` downgrade, API-compatible
  within the 6.x line. `npm audit` now reports 0 vulnerabilities.

## [2.5.0] - 2026-06-19

### Changed
- **Modern transcript accent now follows your `mainColor`.** The modern HTML
  transcript previously used a hardcoded green accent; it now derives its accent
  from the configured `mainColor`, so transcripts match your bot's branding.
  Falls back to the previous MSK green (`#2ee676`) when `mainColor` is missing or
  invalid. Both `#rrggbb` and shorthand `#rgb` are accepted. The `classic` design
  is unchanged. No config change needed.

## [2.4.0] - 2026-06-19

### Added
- **Auto-refreshing ticket panel.** The `/setup` panel now updates itself on every
  bot start, so you only have to run `/setup` once — changes to the panel embed or
  text (e.g. after an update) are applied automatically without re-running the
  command. The bot remembers the panel message (channel + message ID) in a new
  `panel_messages` table and re-renders it on boot. Controlled via the new
  `panel.autoUpdateOnStart` config key (default `true`). If the saved channel or
  message no longer exists, the record is cleared and a warning is logged
  (run `/setup` again).
- **Hungarian translation** (`locales/hu.json`) — set `"lang": "hu"` in the config
  to use it. Thanks to @chad50001 ([#7](https://github.com/MSK-Scripts/discord_ticketbot/pull/7)).
- **Hungarian HTML transcript** — `"transcriptLang": "hu"` now renders the
  transcript UI (header labels, section title, footer, copy button) and date
  format in Hungarian.

### Changed
- **Transcript UI strings moved into the locale files.** They were previously
  hardcoded in `src/utils/transcript.js`; each language's transcript strings now
  live under a `transcript` key in its `locales/<lang>.json`, so all of a
  language's translations sit in one file. The transcript loads the strings for
  `transcriptLang` from there, merged over English for any missing key. No config
  change needed.

### Fixed
- **Role mentions in the transcript** now show the actual role name (e.g.
  `@Support`) instead of a hardcoded `@role`. Role names are resolved for free
  from the messages and otherwise looked up once from the guild; unknown roles
  fall back to `@role`.
- **Channel mentions in the transcript** now show the channel name (e.g.
  `#support`) instead of the raw channel id. Resolved from the message or the
  guild channel list; unknown channels fall back to the id.

## [2.3.0] - 2026-06-19

### Added
- **Copy button on code blocks** in the HTML transcript — one click copies the
  block's contents to the clipboard (Clipboard API with an `execCommand`
  fallback; self-contained, works offline). Degrades gracefully if a strict CSP
  blocks inline scripts (the transcript still renders).
- **Configurable transcript language** via the new `transcriptLang` config key
  (`"en"` or `"de"`). All transcript UI strings (header labels, section title,
  footer, copy-button tooltip) and the date format follow it. Falls back to
  **English** when the key is omitted or the language isn't translated.

### Fixed
- **Reopened-then-deleted tickets lost their post-reopen messages.** A transcript
  is a snapshot taken at close, but the Delete button removed the channel without
  regenerating it. Deleting a reopened (still-open) ticket now generates a final
  transcript from the full message history first.
- A ticket's transcript is now **replaced in place** instead of piling up a new
  transcript (and public URL) per close. Re-closing or deleting the same ticket
  keeps the **same transcript link**, always reflecting the latest state; older
  duplicate transcripts for that ticket are cleaned up. *(Requires the matching
  `msk-shop` upload-route update.)*
- The **transcript link label** in the close DM and the log embed was hardcoded
  in German and wrongly implied a download; it is now localized and consistently
  means "open" (English "Open", German "Öffnen").

## [2.2.2] - 2026-06-18

### Fixed
- **Transcript images no longer break over time.** Message image/file
  attachments were embedded using the raw Discord CDN URL, which is signed and
  expires ~24h after the transcript is generated — so every attachment image
  eventually turned into a broken-image icon. Attachments are now linked from the
  permanent copy stored on the MSK server via a relative path that resolves under
  both custom domains and the main site; the Discord URL is kept only as a
  fallback for files that weren't uploaded. (Avatars and emojis were never
  affected — they are embedded as Base64.)
- Unsupported attachment file types are now skipped instead of failing the whole
  transcript upload over a single file.

## [2.2.1] - 2026-06-18

### Fixed
- Transcript **"Closed on"** now shows the actual close time. It was empty
  because the transcript is generated before the close is written to the DB.
- **Custom Discord emojis** (`<:name:id>` / `<a:name:id>`) are now rendered —
  embedded as Base64 (offline-safe), with a `:name:` text fallback if the image
  can't be fetched. Previously they appeared as raw text.
- **Fenced code blocks** no longer start with an empty first line.

### Added
- Code blocks with a language fence show the language as a small label
  (e.g. `LUA`) — top-right of the block. No syntax colouring (kept
  dependency-free).
- Transcript header now shows **"Closed by"** and the **close reason**
  (the reason only appears when one was actually provided).

### Changed
- Header fields (**Created by** / **Claimed by** / **Closed by**) and in-message
  user mentions now show the member's **display name** instead of the raw user
  id. Names are resolved for free from the messages and only fetched from the
  guild for participants who never posted; unresolvable ids fall back to the id.

## [2.2.0] - 2026-06-18

### Added
- New **modern** HTML ticket transcript design — a minimal, MSK-branded layout
  (lighter palette, clean meta cards, fully self-contained / offline-safe).
- New config option `transcriptDesign` to choose the transcript style:
  `"modern"` (default) or `"classic"` (the previous Discord-style layout).

### Changed
- Transcripts are now generated in the **modern** design by default — including
  existing servers without a `transcriptDesign` key. Set
  `"transcriptDesign": "classic"` to keep the old look.

## [2.1.0] - 2026-06-07

### Added
- **Predefined ticket priority per type** — new optional `ticketTypes[].priority`
  field (`"low"` / `"medium"` / `"high"` / `"urgent"`). New tickets of that type
  open with the configured priority (validated, falls back to `"medium"`),
  reflected in the opening embed and channel topic.
- **Ticket reopen** — new `reopenOption` config block
  (`enabled`, `button`, `whoCanReopen`: `EVERYONE` / `STAFFONLY`). Closed tickets
  show a "♻️ Reopen" button next to Delete, plus a `/reopen` slash command. Reopening
  restores the creator's channel access, resets the ticket to `open`, moves it back
  to its type category, strips the `closed-` name prefix and posts a reopened embed.

### Changed
- Both features degrade gracefully: without the new config keys the bot behaves as
  before (reopen stays disabled, priority defaults to `"medium"`).
