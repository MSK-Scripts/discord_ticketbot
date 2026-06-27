# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **How releases work:** the section matching the released tag (e.g. `## [2.2.0]`)
> is automatically lifted to the top of the GitHub Release notes by
> `.github/workflows/release.yml`. Keep this file up to date before tagging.

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
