# Installation and operation

Install with Docker or Node.js, choose a database, run it as a service and keep it up to date. Back to the [README](../README.md) · [Deutsch](installation-de.md)

## Docker

Images are published for `linux/amd64` and `linux/arm64` at `ghcr.io/msk-scripts/discord_ticketbot`. No Node install, no build tools for the native SQLite module.

```bash
mkdir -p ticketbot/config ticketbot/data && cd ticketbot
sudo chown -R 1000:1000 config data     # the container runs as uid 1000
curl -O https://raw.githubusercontent.com/MSK-Scripts/discord_ticketbot/main/docker-compose.yml
# create .env with TOKEN, CLIENT_ID and GUILD_ID, then:
docker compose up -d
```

The first start writes the example config into `config/` and comes up with its ticket flow closed, naming every placeholder you still have to replace. Fill them in and restart; until then the bot answers commands and buttons with a configuration notice.

Full guide, including the dashboard and an external database: [docu.msk-scripts.de → Docker](https://docu.msk-scripts.de/discord/discord_ticketbot/docker/)

## Node.js

**Requirements:** Node.js 24 or newer and a bot from the [Discord developer portal](https://discord.com/developers/applications).

```bash
git clone https://github.com/MSK-Scripts/discord_ticketbot.git
cd discord_ticketbot
npm install
cp .env.example .env
cp config/config.example.jsonc config/config.jsonc
cp config/snippets.example.jsonc config/snippets.jsonc   # optional, canned responses
npm start
```

Fill in `.env` before the first start:

```env
# Required
TOKEN="your_bot_token"
CLIENT_ID="your_application_id"
GUILD_ID="your_server_id"

# Optional: MSK transcript service, see setup-en.md
MSK_API_KEY=""
MSK_API_URL="https://www.msk-scripts.de"

# Optional: external database, leave empty for SQLite
DATABASE_URL=""

# Optional: web dashboard, see dashboard-en.md
DASHBOARD_ENABLED="false"
```

Then edit `config/config.jsonc` (see [Configuration](configuration-en.md)) and run `/setup` on your server to post the ticket panel.

`npm start` runs the plain bot. `npm run dashboard` runs it together with the web dashboard, see [Dashboard](dashboard-en.md).

## Database

By default everything is stored in a local SQLite file, `data/tickets.db`, with nothing to set up. For MySQL, MariaDB or PostgreSQL set `DATABASE_URL`:

```env
DATABASE_URL="mysql://user:pass@host:3306/ticketbot"
DATABASE_URL="postgres://user:pass@host:5432/ticketbot"
```

Append `?ssl=true` for managed databases that need TLS. The schema is created and migrated automatically on start. To move an existing SQLite database into the new backend, run `npm run db:migrate`; it keeps your ticket history and statistics. Credentials belong in `.env` only, never in `config.jsonc`, because the dashboard can edit that file.

## systemd (Linux)

```bash
sudo cp -r discord_ticketbot /opt/discord_ticketbot
sudo useradd -r -s /bin/false discord
sudo chown -R discord:discord /opt/discord_ticketbot
sudo cp /opt/discord_ticketbot/ticketbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ticketbot.service
```

Check the Node path with `which node` and adjust `ExecStart` in the unit if it is not `/usr/bin/node`. The shipped unit starts `index.js`; to run the dashboard as well, point `ExecStart` at `dashboard.js`.

| Command | Description |
|---|---|
| `sudo systemctl start ticketbot` | Start |
| `sudo systemctl stop ticketbot` | Stop |
| `sudo systemctl restart ticketbot` | Restart |
| `sudo systemctl status ticketbot` | Status |
| `sudo journalctl -u ticketbot -f --output=cat` | Follow the log with colors |

## Updating

The bot checks for new releases on start and posts them to the log channel (`updateNotification` in the config).

```bash
git pull && npm install
sudo systemctl restart ticketbot
```

With Docker: `docker compose pull && docker compose up -d`. Read the [CHANGELOG](../CHANGELOG.md) for the versions you skip, especially entries marked **Breaking**. Database migrations run automatically on the next start.
