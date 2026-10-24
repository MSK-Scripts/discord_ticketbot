# Development

Project layout, database schema and scripts, for anyone working on the code. Coding conventions, i18n rules and the pull request process are in [CONTRIBUTING](../CONTRIBUTING.md). Back to the [README](../README.md)

## Scripts

| Command | What it does |
|---|---|
| `npm start` | The plain bot (`index.js`) |
| `npm run dev` | The bot with `node --watch` |
| `npm run dashboard` | Supervisor plus web dashboard; starts the bot as a child process (`dashboard.js`) |
| `npm run dashboard:setup` | Guided dashboard setup: secret, `.env`, reverse-proxy config |
| `npm run db:migrate` | Copy a SQLite database into the `DATABASE_URL` backend |
| `npm test` | All tests (`node:test`, no extra dependencies) |

The dashboard UI lives in `web/` (React and Vite). `web/dist` is committed so servers need no build step; after UI changes run `npm run build` in `web/` and commit `web/dist`.

## Project layout

```
discord_ticketbot/
├── index.js                 # the plain bot
├── dashboard.js             # supervisor + web dashboard, forks index.js
├── config/                  # *.example.jsonc templates; active configs are gitignored
├── locales/                 # bot strings: main.json (source), en, de, fr, es, pt, pl, hu
├── assets/                  # panel logo and banner
├── data/                    # runtime data, SQLite database (gitignored)
├── docs/                    # this documentation
├── scripts/                 # migrate-db.js, dashboard-setup.js
├── tests/                   # node:test suites
├── web/                     # dashboard UI (React + Vite), web/dist is committed
└── src/
    ├── client.js            # TicketClient: boot flow, staff checks
    ├── config.js            # JSONC parser + validation
    ├── commands/            # slash commands and the "Comment Feedback" context menu
    ├── components/          # buttons/, menus/, modals/ (custom ids start with tb_)
    ├── events/              # ready, interactionCreate, messageCreate, channelDelete
    ├── handlers/            # loaders for commands, components, events
    ├── database/            # async DB layer: index.js, url.js, schema.js, drivers/
    ├── dashboard/           # web server, supervisor, auth, permissions, bot bridge
    └── utils/               # ticketActions (lifecycle), transcript, embeds, mskApi, …
```

Shared ticket logic (open, close, reopen, move, claim) lives in `src/utils/ticketActions.js`; commands, buttons and the dashboard call into it instead of duplicating it.

## Database

One schema for SQLite, MySQL/MariaDB and PostgreSQL in `src/database/schema.js`. Tables are created on start; new columns are added by inline migrations, so existing databases upgrade themselves.

| Table | Contents |
|---|---|
| `tickets` | One row per ticket: status, type, priority, claim, lock, notifications, reminder, auto-close pause, transcript |
| `blacklist` | Blocked users per guild |
| `staff_notes` | Private notes per ticket |
| `ratings` | One rating per ticket (1 to 5) with optional comment |
| `panel_messages` | Where the `/setup` panel was posted, for the refresh on start |
| `dashboard_access` | Dashboard permissions per role or user |
| `dashboard_audit` | Append-only log of every dashboard change |

All queries use `?` placeholders and every DB function is `async`. Timestamps are millisecond integers, booleans are `0`/`1`. When you add a column, add it to the `CREATE TABLE` statement **and** to `getMigrations()`.
