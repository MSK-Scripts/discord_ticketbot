# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **How releases work:** the section matching the released tag (e.g. `## [2.2.0]`)
> is automatically lifted to the top of the GitHub Release notes by
> `.github/workflows/release.yml`. Keep this file up to date before tagging.

## [Unreleased]

### Fixed

- **`qs` bumped from 6.15.3 to 6.16.0** (lockfile only), closing two moderate
  advisories that came in through `express` 5: GHSA-4mjr-xmp4-gh2g (denial of
  service via an attacker-controlled `isBuffer`) and GHSA-x5fp-wj9c-mxmx
  (array-limit bypass through comma parsing in bracket keys). `express` and
  `body-parser` both declare a range that already allows 6.16.0, so no
  dependency in `package.json` changed. Neither advisory was reachable here:
  the package only ships with the optional dashboard stack, `express` 5 parses
  query strings with the simple parser by default, and the dashboard mounts no
  `express.urlencoded()` middleware, so nothing in this project hands user
  input to `qs`.
- `package-lock.json` carried version `2.16.0` while `package.json` was already
  on `2.17.0`; the release commit had only touched the manifest. Both files are
  in sync again.

## [2.17.0] - 2026-09-02

### Added

- **"Report content" link in every transcript**, in both the modern and the
  classic design. MSK Scripts hosts the finished transcript, on
  msk-scripts.de or on the guild's own domain, and Art. 16 DSA obliges a
  hosting provider to offer a notice-and-action mechanism for the content it
  hosts. The link points at the reporting form on
  `https://www.msk-scripts.de/report`.
- The transcript does not know its own address while it is generated, msk-shop
  assigns that on upload, so a small inline script fills the `url` parameter
  from the address the reader is on. Without JavaScript the link still opens
  the form and the reader pastes the address. A transcript opened from disk is
  left alone so a local file path never reaches our server.
- The label is translated in all seven bundled languages
  (`transcript.report`); missing languages fall back to English as usual.

## [2.16.0] - 2026-08-29

### Added

- **Docker.** Official images for `linux/amd64` and `linux/arm64` at
  `ghcr.io/msk-scripts/discord_ticketbot`, plus `Dockerfile`, `docker-compose.yml`
  and an entrypoint. Two mounts, `data/` and `config/`, so an image update never
  touches the database or the configuration.
- The entrypoint seeds `config.jsonc` and `snippets.jsonc` on the first start.
  A bind mount over `/app/config` hides the examples shipped in the image, so
  they are additionally kept outside the mount where the entrypoint can reach
  them. Existing files are never overwritten.
- New documentation page **Docker** on docu.msk-scripts.de, covering volume
  permissions for uid 1000, the dashboard behind a reverse proxy, updating by
  image, and running MariaDB or PostgreSQL alongside.
- New tier **Business** (€9.99/month): 200 MB per transcript, 500 MB of
  attachments per ticket and ten years of storage.

### Changed

- **The attachment budget follows the tier instead of a fixed 100 MB.**
  `/api/verify/status` now reports the tier's limits, the bot keeps them on the
  client and `resolveAttachmentBudget()` derives the budget from them. The
  numbers stay in one place on the server; the bot no longer holds a copy.
  Without a reachable server or on an older one the previous 100 MB still apply,
  so nothing changes until the service is updated.
- **The additional licence term is now an attribution requirement.** `LICENSE.md`
  carries the verbatim AGPL-3.0 text and the additional term moved to `NOTICE`.
  Forbidding the removal of the transcript integration was a further restriction
  that AGPL section 7 does not permit; it is replaced by the attribution term
  under 7(b) that the licence does allow. Servers with a paid subscription are
  exempt for as long as it runs. `license` in `package.json` is now the SPDX
  identifier `AGPL-3.0-only`, and GitHub recognises the licence again.
- The ticket panel footer names the project website instead of claiming all
  rights reserved, which sat oddly next to a copyleft licence. Updated in all 8
  languages.
- Both readmes lead the installation with Docker and state Node.js 24, matching
  `engines` in `package.json`.
- The example config ships with a dynamic bot status (`🎫 {open} open / {total}
  total tickets`) instead of the static text, and shows the shape of
  `ratingSystem.commentRoles` rather than an empty list. Both only affect fresh
  installs; an existing `config.jsonc` is never touched.

### Fixed

- **A single attachment could cost a Basic guild its hosted transcript.** The bot
  uploaded attachments regardless of tier, and the service answers 413 for the
  whole request once the tier's cap is exceeded. Basic allows no attachments at
  all, so one screenshot in a ticket was enough. The bot now collects none when
  the tier permits none.
- Premium+ and Business could never use the attachment volume they pay for. Both
  were capped at the same 100 MB as Premium.
- The Hungarian locale shipped an attribution to another server in the panel
  footer.

## [2.15.0] - 2026-08-28

### Added

- The bot now announces a new release in the log channel, not just in the console
  at boot. An unattended self-host never sees the console notice, which is where
  it mattered least.
- New config block `updateNotification` with `enabled` (default `true`) and
  `intervalHours` (default `1`, minimum `0.25`). Both are editable in the
  dashboard config form under Logging.
- The notice needs `logsChannelId`. Without a log channel there is nowhere to post
  and the check does not run at all.
- The same version is never announced twice, not even across restarts: the last
  announced version is persisted to `data/update-notice.json`, and the marker is
  only written after the message really went out.
- New locale keys `embeds.updateAvailable.*` in all 8 languages.

### Changed

- `versionCheck.js` gained `fetchLatestRelease()`, so the boot check and the
  recurring notice share one place that knows the GitHub API shape. The console
  output at boot is unchanged.

## [2.14.0] - 2026-08-28

### Added

- Rating posts now show the ticket category and the rater's avatar. The category
  is resolved from `ticketTypes[].name` and falls back to the raw code name when a
  type was removed from the config, so an old ticket still renders.
- New message context menu **Comment Feedback**: right-click a rating post, pick
  Apps, and write a reply that is added to the rating embed itself. One field per
  commenter, so commenting again replaces your own text instead of stacking up.
- New config key `ratingSystem.commentRoles` (role IDs). Empty falls back to the
  normal staff roles, administrators always may comment. Editable in the dashboard
  config form.
- New locale keys in all 8 languages: `embeds.ratingPost.categoryField`,
  `ratings.staffCommentField`, `modals.feedbackComment.*` and six
  `messages.feedback*` strings.

### Changed

- The command handler registers context menu commands alongside slash commands and
  no longer prints them with a leading slash. `interactionCreate` routes
  `isContextMenuCommand()` through the same registry.

## [2.13.3] - 2026-08-25

### Fixed
- **The bot console no longer yanks you back to the bottom while you are reading.**
  The console polls `GET /bot/logs` every 3 seconds, and every response scrolled
  the pane to the very bottom. Scrolling up to read a stack trace therefore lasted
  at most three seconds. The console now only follows new output while you are
  already at the bottom (within 24px); scroll up and it stays where you put it. A
  "Jump to latest" button appears while you are scrolled up, and clicking it both
  returns you to the end and resumes following. Polling and the 3s interval are
  unchanged.
- **The console no longer re-renders when nothing changed.** Each poll handed React
  a fresh array even when the lines were identical, which re-rendered the whole
  console and dropped any text selection you had made in it.

## [2.13.2] - 2026-08-25

### Changed
- **`mysql2` 3.23.3 -> 3.23.4.** A patch release from upstream: leading
  zeros are kept in the fractional seconds of `TIME` values, and the callback
  `Pool`/`PoolConnection` typings were aligned with the runtime. Neither of the
  two touches this project in practice (no TypeScript, and timestamps are stored
  as `Date.now()` integers rather than `TIME` columns), so this is pure hygiene.
- **`better-sqlite3` 12 -> 13.** Version 13 moves the native addon to N-API,
  which is what makes its prebuilt binaries independent of the Node major
  version. This is the direct fix for the `ERR_DLOPEN_FAILED`
  (`NODE_MODULE_VERSION 115` vs `127`) that took a hosted bot down after the
  Node 20 to 22 upgrade and had to be repaired by hand with
  `npm rebuild better-sqlite3`. A future Node upgrade can no longer break the
  database layer this way. The upgrade also drops the deprecated
  `prebuild-install` dependency, removing 55 transitive packages from the tree.
  No API changes, all queries are untouched.
- **`dotenv` 16 -> 17.** Version 17 flipped the `quiet` default from `true` to
  `false`, so dotenv prints an informational line about the loaded file and key
  count on every start. All four `config()` call sites (`index.js`,
  `dashboard.js`, `scripts/dashboard-setup.js`, `scripts/migrate-db.js`) now
  pass `{ quiet: true }`, keeping that line from appearing above the startup
  banner.

### Removed
- **The `undici` override is gone.** It was added in 2.5.1 because
  `discord.js@14` pulled in a vulnerable `undici@6.24.1` transitively. Current
  `discord.js` (14.27.0) asks for `undici: ^6.27.0` itself, which resolves to
  the same 6.28.0 the override pinned, so the override no longer changed
  anything. `npm audit` stays at 0 vulnerabilities without it.

## [2.13.1] - 2026-08-16

### Fixed
- **Transcript attachments that weren't images couldn't be downloaded.** Files
  such as `.lua`, `.cfg`, `.rar` or `.log` were not on the allow-list, so they
  were never copied to the transcript server and the transcript kept pointing at
  the Discord CDN. Those links are signed and expire roughly a day after the
  ticket closes, so exactly the attachments a support case is about went dead
  while the screenshots kept working. The allow-list went from 10 to 77
  extensions and now covers what tickets actually carry:
  - **GTA / FiveM resources**: `meta`, `ymap`, `ytyp`, `ytd`, `yft`, `ydr`,
    `ydd`, `ybn`, `ycd`, `ynv`, `rpf`, `fxap`
  - **code and configuration**: `lua`, `js`, `ts`, `css`, `json`, `xml`, `sql`,
    `cfg`, `ini`, `toml`, `yml`, `yaml`, `conf`, `properties`, `patch`, `diff`
  - **archives**: `zip`, `rar`, `7z`, `tar`, `gz`, `tgz`, `bz2`, `xz`, `zst`
  - **text, logs, data**: `txt`, `log`, `md`, `csv`, `db`, `sqlite`
  - **phone photos and screen recordings**: `heic`, `heif`, `jfif`, `tif`,
    `tiff`, `ico`, `bmp`, `avif`, `mkv`, `avi`, `wmv`, `mpg`, `mpeg`, `m4v`,
    `webm`, `mov`, `m4a`, `flac`, `opus`, `wav`, `ogg`
  - **documents**: `docx`, `xlsx`, `pptx`, `odt`, `ods`
  *(Requires the matching `msk-shop` and Apache update, see below.)*
- **A single oversized attachment can no longer cost the whole hosted
  transcript.** The upload is rejected as a whole once the tier's attachment cap
  is exceeded, which now became reachable because archives are collected too.
  Attachments are budgeted while collecting (using the size Discord reports, so
  an oversized file isn't even downloaded); anything that doesn't fit is skipped
  and keeps its Discord link, instead of taking the transcript down with it.

### Security
- Non-media attachments are served as `application/octet-stream` with
  `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`, so
  user-supplied file content is downloaded and never interpreted in the origin
  serving the transcript. `html`, `htm`, `svg` and executable types
  (`exe`, `bat`, `cmd`, `ps1`, `sh`, `jar`, `msi`, `apk`) remain rejected.

> **Upgrade order matters.** Widen the server side first (Apache `FilesMatch` in
> the main vhost *and* every custom-domain vhost, then the `msk-shop` upload
> route), then update the bot. The upload route answers `400` for the entire
> request over one unknown extension, so a bot that runs ahead of the server
> loses the hosted transcript instead of gaining attachments. Existing
> transcripts are snapshots and are not rewritten, so their expired CDN links stay
> dead, because the files were never uploaded in the first place.

## [2.13.0] - 2026-07-25

### Added
- **The dashboard is translated and every user picks their own language.** A
  language selector sits at the bottom of the sidebar, offering English, German,
  French, Spanish, Portuguese, Polish and Hungarian. The choice is personal to the
  person using it (stored in their browser), so switching the panel to German does
  not change it for anyone else, and it needs no permission. On a first visit the
  dashboard follows the browser's language and falls back to English.
- Language files are picked up automatically: dropping a
  `web/src/locales/<code>.json` into place and rebuilding adds that language to the
  selector, with the name taken from the file itself. There is no list to maintain
  in the code.
- Dates and times now follow the selected language instead of the browser's.

### Notes
- This is the dashboard's own interface language. It is separate from `lang` in
  `config.jsonc`, which still controls what the bot writes into Discord.
- The structured `config.jsonc` form (field labels and their help texts) stays in
  English for now, everything else in the dashboard is translated.

## [2.12.0] - 2026-07-25

### Added
- **The "Dashboard settings" tab has its own `settings.view` and `settings.edit`
  permissions.** The accent colour and favicon used to be owner-only. Because they
  carry no secrets and only re-brand the panel, they can now be delegated to
  trusted staff through two dedicated permissions, granted like any other under
  **Permissions**. `settings.view` shows the current branding with every control
  disabled; `settings.edit` allows changing it. The server owner keeps both
  automatically, and the `.env` file (bot token and secrets) stays owner-only as
  before.

### Changed
- The dashboard settings API and navigation item are now gated by the new
  `settings.view` / `settings.edit` permissions instead of an owner-only check.
  Existing owners are unaffected (owners hold every permission); no configuration
  change is needed.

## [2.11.0] - 2026-07-21

### Added
- **`/autoclose pause` and `/autoclose resume` to hold a ticket's inactivity
  handling.** Staff can pause the inactivity warning, the auto-closing and the
  staff-inactivity reminder for a single ticket, useful when a ticket is
  deliberately parked (waiting on a third party) and must not be nagged or closed.
  Resuming refreshes the ticket's activity, so it gets a full fresh inactivity
  window instead of closing immediately for the time it was paused. Backed by a
  new `auto_close_paused` column that both background loops skip.
- **Optional public end-user portal for the dashboard
  (`DASHBOARD_PUBLIC_PORTAL`).** When switched on, any server member can sign in
  with Discord and gets a "My tickets" view that shows only their own tickets:
  they can follow the live conversation and reply to an open ticket (posted in
  Discord under their own name), and download the transcript of a closed one
  (plus, on premium, an "Open transcript" link). A member without permissions can
  never see other people's tickets, statistics, the config, or the bot controls,
  and every reply is re-checked server-side (ticket open, not locked, member not
  blacklisted, really their own ticket) before it reaches Discord. The guided
  setup (`npm run dashboard:setup`) now offers this as a yes/no step.
- **The dashboard's `.env` form now covers the dashboard settings.** It is grouped
  into a "Bot" and a "Web Dashboard" section and exposes `DASHBOARD_ENABLED`,
  `DASHBOARD_PUBLIC_PORTAL`, `DASHBOARD_HOST`/`PORT`/`PUBLIC_URL`,
  `CLIENT_SECRET`, `SESSION_SECRET`, `DASHBOARD_ALLOW_INSECURE` and the
  trusted-proxy secret. Booleans are toggles; secrets stay masked with
  "leave blank to keep" (the `.env` form is owner-only).
- **A "Dashboard settings" tab to brand the dashboard (owner-only).** You can set
  the accent colour (buttons, highlights, the active menu item and focus rings;
  it previews live and reverts to the built-in MSK green with one click) and
  upload a custom favicon (PNG or ICO, up to 256 KB; the type is taken from the
  file's magic bytes, not its name). Both apply to everyone who opens the
  dashboard and are served publicly so the login page is themed too. Like the
  `.env` editor, this tab is limited to the server owner. Settings live in
  `data/dashboard-settings.json` (plus the favicon file). This is dashboard-only
  state, not bot data, so no database change.
- **The dashboard now has real URLs and survives a reload.** Each view has its
  own path (`/tickets`, `/stats`, `/config`, `/permissions`, …) and an open
  ticket is a deep link (`/tickets/123`, `/mine/9`). Pressing F5 keeps you on the
  same page instead of dropping you on the first one, and links are shareable. The
  view a path resolves to is still gated client-side by your permissions (and the
  API re-checks everything server-side), so an off-limits URL simply falls back to
  a view you may open. Implemented with a tiny history router
  (`web/src/router.js`), no new dependency; the server already serves the SPA for
  these paths.
- **Clearer messaging that `.env` is owner-only.** Opening the `.env` file now
  shows a notice that it is restricted to the server owner (it holds the bot
  token and secrets), and the Permissions tab spells out that "View/Edit
  configuration" covers `config.jsonc`, snippets and locales but never the
  `.env`. This was already enforced on the server and in the file tabs; the
  notices just make the boundary visible.

### Changed
- **The dashboard is now staff-only by default.** Previously any guild member who
  logged in reached the "My tickets" portal; now only the owner and members with
  at least one granted permission can sign in unless you opt the portal in with
  `DASHBOARD_PUBLIC_PORTAL=true`. This makes enabling the dashboard for your team
  a deliberate choice that does not also open a login to your whole member base.
  A member turned away is shown a clear "limited to staff" message. The gate is
  enforced live on every request, so flipping the flag off (or revoking someone's
  last permission) locks them out immediately.

## [2.10.0] - 2026-07-21

### Added
- **The guided dashboard setup now detects the operating system and prints
  matching guidance.** On Linux it prints the Apache vhost plus the
  `certbot`/`a2enmod`/`systemctl` commands as before; on Windows it prints an IIS
  `web.config` (URL Rewrite + ARR) and a Caddy alternative, a win-acme TLS note,
  and a Windows service hint (NSSM / Task Scheduler) instead of systemd. Remote
  access guidance is platform-aware too. The dashboard polls for logs (no SSE)
  and reads the client IP from the rightmost `X-Forwarded-For`, which both
  proxies add, so no special streaming or header configuration is needed; HTTPS
  detection comes from `DASHBOARD_PUBLIC_URL`. The dashboard runtime already runs
  on Windows unchanged (`fork()` plus `shell: true` for `npm.cmd`/`git`).
- **German dashboard documentation** (`docs/dashboard-de.md`), alongside the
  existing English `docs/dashboard-en.md`; the two are cross-linked.

## [2.9.2] - 2026-07-19

### Changed
- **Transcript upload now retries transient failures before falling back.** A
  brief backend blip (e.g. a deploy or load spike where the reverse proxy is up
  but the app is momentarily unreachable) returned an HTTP 502/503/504 and sent
  the close straight to the local `.html` fallback, so no hosted transcript link
  was created. `uploadTranscript` now retries a network error or a 502/503/504 up
  to two more times with a short backoff (1s, then 3s) before giving up.
  Permanent failures (4xx such as a bad API key or size limit, and a genuine app
  500) still return on the first attempt, so nothing that a retry cannot fix is
  delayed. Behaviour without `MSK_API_KEY` is unchanged.

## [2.9.1] - 2026-07-17

### Fixed
- **Closing a ticket on MySQL/MariaDB failed when the transcript exceeded 64 KB.**
  The full HTML transcript is stored in `tickets.transcript`, but on MySQL that
  column was `TEXT` (64 KB max), so a real transcript (base64 avatars and
  attachments push it well past that) overflowed with "data too long for column
  'transcript'" and the close aborted. The column is now `LONGTEXT` on MySQL:
  fresh installs get it from the schema, and existing MySQL databases are widened
  in place by an idempotent migration on startup (`ALTER TABLE tickets MODIFY
  transcript LONGTEXT`). SQLite and PostgreSQL were never affected (their `TEXT`
  is unbounded). Tickets that failed to close for this reason can simply be closed
  again after updating.

## [2.9.0] - 2026-07-15

### Added
- **Four new languages: French (`fr`), Spanish (`es`), Portuguese (`pt`) and
  Polish (`pl`).** Each ships as a complete `locales/<code>.json` with all 229
  keys translated (bot messages, embeds, buttons, modals, menus, priorities,
  ratings and the HTML transcript section), so both `lang` and `transcriptLang`
  can now be set to any of them. Set `lang` in `config.jsonc` to switch the bot,
  and `transcriptLang` for the transcript. The dashboard's language dropdowns
  pick the new files up automatically (they list the locale files that actually
  exist), and their static fallback option lists were extended to match. Any
  missing key still falls back to English, as before.

## [2.8.0] - 2026-07-15

### Added
- **Trusted-proxy authentication for the dashboard** (`DASHBOARD_TRUST_PROXY_SECRET`,
  optional, off by default). This is the foundation for running a hosted bot's
  dashboard behind an authenticated gateway (the MSK hosting layer) instead of the
  bot's own Discord OAuth login. When the secret is set, the dashboard also accepts
  requests that carry the secret plus a verified Discord user id, and treats them as
  that user without a browser session. The proxy vouches for identity only;
  permissions are still resolved live from the database per request, so a proxied
  request never gets more access than the same user would in a browser. Origin and
  CSRF checks are skipped only for these requests (the gateway performs its own),
  while the per-user write rate limit still applies. In a pure proxy setup
  `CLIENT_ID`/`CLIENT_SECRET` become optional, since nobody logs in through the bot
  directly. A normal self-hosted dashboard is unaffected: with the secret unset the
  path is completely inert.

## [2.7.2] - 2026-07-15

### Security
- **Hardened the dashboard against a batch of CodeQL findings.** No exploitable
  bug was confirmed, but several checks were tightened as defense in depth:
  - Cookie parsing now uses a null-prototype object, so a cookie named
    `__proto__` or `constructor` can no longer reach `Object.prototype`
    (prototype-pollution guard).
  - The dashboard's Discord REST client resolves and pins the target host to
    `discord.com` before every request, so a call can never be steered off host.
  - Config and locale file access is now resolved from a fixed allow-list (a
    switch for the three config files, the actual directory listing for locales)
    instead of building a path from the request. This also removes a read/write
    race on the locale editor, since existence is proven by membership rather than
    a separate check that could race the write.
  - Removed two unused declarations flagged by the scanner.

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
