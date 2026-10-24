# Installation und Betrieb

Installation mit Docker oder Node.js, Wahl der Datenbank, Betrieb als Dienst und Aktualisieren. Zurück zur [README](../README_GER.md) · [English](installation-en.md)

## Docker

Images gibt es für `linux/amd64` und `linux/arm64` unter `ghcr.io/msk-scripts/discord_ticketbot`. Kein Node, keine Build-Werkzeuge für das native SQLite-Modul.

```bash
mkdir -p ticketbot/config ticketbot/data && cd ticketbot
sudo chown -R 1000:1000 config data     # der Container läuft als uid 1000
curl -O https://raw.githubusercontent.com/MSK-Scripts/discord_ticketbot/main/docker-compose.yml
# .env mit TOKEN, CLIENT_ID und GUILD_ID anlegen, dann:
docker compose up -d
```

Der erste Start legt die Beispiel-Config in `config/` ab und startet mit geschlossenem Ticket-Ablauf. Er nennt jeden Platzhalter, der noch ersetzt werden muss. Ausfüllen und neu starten; bis dahin antwortet der Bot auf Befehle und Buttons mit einem Konfigurationshinweis.

Ausführliche Anleitung mit Dashboard und externer Datenbank: [docu.msk-scripts.de → Docker](https://docu.msk-scripts.de/discord/discord_ticketbot/docker/)

## Node.js

**Voraussetzungen:** Node.js 24 oder neuer und ein Bot aus dem [Discord Developer Portal](https://discord.com/developers/applications).

```bash
git clone https://github.com/MSK-Scripts/discord_ticketbot.git
cd discord_ticketbot
npm install
cp .env.example .env
cp config/config.example.jsonc config/config.jsonc
cp config/snippets.example.jsonc config/snippets.jsonc   # optional, Textbausteine
npm start
```

Vor dem ersten Start die `.env` ausfüllen:

```env
# Pflicht
TOKEN="dein_bot_token"
CLIENT_ID="deine_application_id"
GUILD_ID="deine_server_id"

# Optional: MSK-Transkript-Service, siehe setup-de.md
MSK_API_KEY=""
MSK_API_URL="https://www.msk-scripts.de"

# Optional: externe Datenbank, leer lassen für SQLite
DATABASE_URL=""

# Optional: Web-Dashboard, siehe dashboard-de.md
DASHBOARD_ENABLED="false"
```

Danach `config/config.jsonc` anpassen (siehe [Konfiguration](configuration-de.md)) und auf dem Server `/setup` ausführen, um das Ticket-Panel zu posten.

`npm start` startet den reinen Bot. `npm run dashboard` startet ihn zusammen mit dem Web-Dashboard, siehe [Dashboard](dashboard-de.md).

## Datenbank

Standardmäßig liegt alles in einer lokalen SQLite-Datei, `data/tickets.db`, ohne Einrichtung. Für MySQL, MariaDB oder PostgreSQL `DATABASE_URL` setzen:

```env
DATABASE_URL="mysql://user:pass@host:3306/ticketbot"
DATABASE_URL="postgres://user:pass@host:5432/ticketbot"
```

Für verwaltete Datenbanken mit TLS `?ssl=true` anhängen. Das Schema wird beim Start automatisch angelegt und migriert. Eine bestehende SQLite-Datenbank übernimmt `npm run db:migrate` in das neue Backend, samt Ticket-Verlauf und Statistiken. Zugangsdaten gehören nur in die `.env`, nie in die `config.jsonc`, denn die kann das Dashboard bearbeiten.

## systemd (Linux)

```bash
sudo cp -r discord_ticketbot /opt/discord_ticketbot
sudo useradd -r -s /bin/false discord
sudo chown -R discord:discord /opt/discord_ticketbot
sudo cp /opt/discord_ticketbot/ticketbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ticketbot.service
```

Den Node-Pfad mit `which node` prüfen und `ExecStart` in der Unit anpassen, falls er nicht `/usr/bin/node` ist. Die mitgelieferte Unit startet `index.js`; soll das Dashboard mitlaufen, `ExecStart` auf `dashboard.js` setzen.

| Befehl | Beschreibung |
|---|---|
| `sudo systemctl start ticketbot` | Starten |
| `sudo systemctl stop ticketbot` | Stoppen |
| `sudo systemctl restart ticketbot` | Neu starten |
| `sudo systemctl status ticketbot` | Status |
| `sudo journalctl -u ticketbot -f --output=cat` | Log mit Farben verfolgen |

## Aktualisieren

Der Bot prüft beim Start auf neue Releases und meldet sie im Log-Kanal (`updateNotification` in der Config).

```bash
git pull && npm install
sudo systemctl restart ticketbot
```

Mit Docker: `docker compose pull && docker compose up -d`. Vorher den [CHANGELOG](../CHANGELOG.md) für alle übersprungenen Versionen lesen, besonders Einträge mit **Breaking**. Datenbank-Migrationen laufen beim nächsten Start automatisch.
