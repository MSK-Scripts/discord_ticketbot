# Contributing to Discord Ticket Bot

First off — thank you for taking the time to contribute! 🎫

This project is a **self-hosted Discord ticket bot** built with [Discord.js v14](https://discord.js.org)
and [better-sqlite3](https://github.com/WiseLibs/better-sqlite3). It is intentionally
lightweight: no external database, no telemetry, no build step. Please keep that
spirit in mind when proposing changes.

By participating in this project you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).

---

## Table of Contents

- [Contributing to Discord Ticket Bot](#contributing-to-discord-ticket-bot)
  - [Table of Contents](#table-of-contents)
  - [Ways to Contribute](#ways-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Requesting Features](#requesting-features)
  - [Reporting Security Issues](#reporting-security-issues)
  - [Development Setup](#development-setup)
    - [Requirements](#requirements)
    - [Steps](#steps)
  - [Project Structure](#project-structure)
  - [Coding Conventions](#coding-conventions)
  - [Internationalization (i18n)](#internationalization-i18n)
  - [Database Changes](#database-changes)
  - [Commit \& Pull Request Guidelines](#commit--pull-request-guidelines)
    - [Commits](#commits)
    - [Pull Requests](#pull-requests)
  - [Licensing](#licensing)

---

## Ways to Contribute

- 🐛 **Report bugs** — open a [Bug Report](https://github.com/MSK-Scripts/discord_ticketbot/issues/new?template=bug_report.md)
- 💡 **Suggest features** — open a [Feature Request](https://github.com/MSK-Scripts/discord_ticketbot/issues/new?template=feature_request.md)
- 🌍 **Add or improve translations** — see [Internationalization](#internationalization-i18n)
- 📖 **Improve documentation** — README, [`docs/`](docs/), or the
  [online docs](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started)
- 🔧 **Fix bugs / build features** — pick an open issue or propose one first

> 💬 Questions are welcome on our [Support Discord](https://discord.gg/5hHSBRHvJE).

---

## Reporting Bugs

Before opening a bug report:

1. **Search existing issues** to avoid duplicates.
2. Make sure you are on the **latest release** — check the
   [releases page](https://github.com/MSK-Scripts/discord_ticketbot/releases).
3. Confirm you are running **Node.js 22 or newer** (`node --version`).

A good bug report includes:

- Bot version (`package.json` → `version`) and Node.js version
- Steps to reproduce
- Expected vs. actual behavior
- Relevant console output (with `showLog` enabled in `config.jsonc`)
- **Never** paste your bot token, API keys, or other secrets

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).

---

## Requesting Features

Open a [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) and describe:

- The problem you are trying to solve (not just the proposed solution)
- How it fits a **self-hosted, dependency-light** bot
- Whether it should be configurable via `config.jsonc`

For larger features, please open an issue **before** writing code so we can agree
on the approach. This avoids wasted effort on changes that may not be merged.

---

## Reporting Security Issues

**Do not open public issues for security vulnerabilities.** Please follow the
process described in [SECURITY.md](SECURITY.md) instead.

---

## Development Setup

### Requirements

- **Node.js** ≥ 22 (the project uses no transpiler — it runs directly via `node`)
- A Discord bot token — [discord.com/developers/applications](https://discord.com/developers/applications)
- A separate **test Discord server** you own (never test on production servers)

### Steps

```bash
# 1. Fork & clone
git clone https://github.com/<your-username>/discord_ticketbot.git
cd discord_ticketbot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in TOKEN, CLIENT_ID, GUILD_ID (MSK_API_* is optional)

# 4. Run
npm start        # node index.js
npm run dev      # node --watch index.js (auto-restart on file changes)
```

On first start the bot copies `config/config.example.jsonc` → `config/config.jsonc`
and exits. Edit `config.jsonc` to match your test server, then start again.

> The bot works **fully without** `MSK_API_KEY`. Premium features (transcript
> hosting via the MSK API) degrade gracefully — transcripts are sent as `.html`
> file attachments instead of links. Please make sure your changes preserve this.

---

## Project Structure

A short orientation — see [`README.md`](README.md) for the full, always-current map.

```
index.js                ← entry point (dotenv + TicketClient.start())
src/
├── client.js           ← boot flow (banner, version/API check, config, login)
├── config.js           ← JSONC parser + validateConfig()
├── database/           ← engine-agnostic async DB layer (SQLite/MySQL/PostgreSQL)
├── commands/           ← slash commands ({ data, execute })
├── components/         ← buttons / menus / modals (convention-based loader)
├── events/             ← interactionCreate, messageCreate, ready
├── handlers/           ← command/component/event loaders
└── utils/              ← embeds, logger, mskApi, snippets, ticketActions, transcript
locales/                ← de.json, en.json, main.json
config/                 ← *.example.jsonc templates + active (gitignored) configs
```

---

## Coding Conventions

This is **plain Node.js, CommonJS, no TypeScript**. Match the surrounding style.

- ✅ `require()` / `module.exports` — **no** `import` / `export`, no `.ts` / `.mjs`.
- ✅ Resolve paths with `path.resolve(__dirname, '../...')`, not bare relative strings.
- ✅ Buttons & selects always wrapped in `ActionRowBuilder` — never bare builder arrays.
- ✅ Ephemeral replies via `{ flags: MessageFlags.Ephemeral }` (**not** the deprecated `ephemeral: true`).
- ✅ Non-critical Discord API calls use `.catch(() => null)`.
- ✅ Log through `client.logger.{info,warn,error,success,debug}` — `console.log` is
  reserved for the startup banner. Log strings are English, prefixed with the module,
  e.g. `client.logger.info('[AutoClose] Closed ticket #5')`.
- ✅ Component custom IDs start with **`tb_`**; dynamic args are appended with `:`
  (e.g. `tb_rate:{rating}:{ticketId}`).
- ✅ Permission checks go through `client.isStaff(member, ticketType?)`.
- ✅ Shared ticket lifecycle logic lives in `src/utils/ticketActions.js` — don't
  duplicate it inside command/button files.

**Please do not** add a build step, bundler, or TypeScript, and **do not add new
production dependencies** without discussing it first — the bot currently ships with
only three (`discord.js`, `better-sqlite3`, `dotenv`). Keeping it lean is a feature.

Avoid large, unprompted refactors (e.g. restructuring the locale system or DB layer)
without opening an issue first. Focused bug fixes and feature additions in the existing
style are always welcome.

---

## Internationalization (i18n)

User-facing strings must **never** be hardcoded — they go through
`client.t('path.to.key', { placeholder: 'value' })`.

When you add or change a user-facing string, update **all three** locale files at the
same key path:

| File | Role |
|---|---|
| `locales/main.json` | Master template (English) — source of truth for the structure |
| `locales/en.json` | English variant |
| `locales/de.json` | German translation |

Missing keys fall back to the raw path string (e.g. `messages.foo` shows up in the
UI), which makes gaps easy to spot. New translations for additional languages are
very welcome.

---

## Database Changes

The schema lives in `src/database/schema.js` and uses **inline migrations** — no
external migration tool. The layer is engine-agnostic (SQLite by default, MySQL/
MariaDB and PostgreSQL via `DATABASE_URL`), so changes must work across all three.

- **New column:** add it to the matching `CREATE TABLE` (for fresh installs) **and**
  to `getMigrations()` (which `ALTER TABLE`s it onto existing databases). Use the
  per-dialect type tokens (`ts`, `bool`, `id`, …), never a hardcoded SQL type.
- **New table:** add a `CREATE TABLE IF NOT EXISTS` to `getCreateStatements()` for
  all three dialects.
- **Queries** go in `src/database/index.js`, are `async`, and use `?` placeholders
  (the PostgreSQL driver rewrites them to `$1, $2, …`). Coerce `COUNT()`/`AVG()`
  results with `Number()`. Upserts branch on `activeDriver.family`.

This keeps existing users' databases upgradeable without manual steps. Closed
tickets are kept in the DB for statistics — the lifecycle ends at channel rename +
move, not deletion.

---

## Commit & Pull Request Guidelines

### Commits

- Write commit messages in **English**.
- Prefer [Conventional Commits](https://www.conventionalcommits.org/) prefixes
  (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`) — this matches the existing
  history and feeds the auto-generated release notes (`.github/release.yml`).
- Keep commits focused; one logical change per commit where practical.

### Pull Requests

When you open a PR, GitHub automatically pre-fills the description from our
[Pull Request template](.github/PULL_REQUEST_TEMPLATE.md) — please fill it in
completely rather than deleting it.

1. Branch off `main` (e.g. `feat/ticket-tags` or `fix/autoclose-flag`).
2. Make sure the bot **starts cleanly** (`npm start`) and your change works on a
   real test server.
3. Keep the relevant docs in sync — update `README.md` / `README_GER.md`,
   `config.example.jsonc`, and `CLAUDE.md` when you change behavior, config keys,
   commands, or the schema.
4. Add a `CHANGELOG.md` entry describing your change.
5. Open the PR against `main` with a clear description of **what** and **why**.
   Link any related issue.
6. Be responsive to review feedback — maintainers may request changes before merge.

There is no automated test suite; please manually verify the affected flows
(opening, claiming, closing, reopening, transcripts) and describe what you tested
in the PR.

---

## Licensing

This project is licensed under the **GNU Affero General Public License v3.0 only**,
with one **additional term** under Section 7(b): the notice identifying the software
as MSK Ticket Bot has to stay visible to the people using the bot, unless the server
holds a Premium or Premium+ subscription. See
[LICENSE.md](LICENSE.md) for the full license text and [NOTICE](NOTICE) for the
additional term.

By submitting a contribution, you agree that your contribution is licensed under the
same terms. Make sure you have the right to submit any code you contribute and that
it does not violate third-party licenses.

---

Thanks again for contributing! If anything here is unclear, ask on the
[Support Discord](https://discord.gg/5hHSBRHvJE) or open an issue. 💚
