![Discord Ticketbot](assets/msk-ticket-bot-banner.png)

<div align="center">

# 🎫 Discord Ticket Bot

[![Version](https://img.shields.io/github/v/release/MSK-Scripts/discord_ticketbot?style=flat-square&label=Version&color=5eb131)](https://github.com/MSK-Scripts/discord_ticketbot/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blueviolet?style=flat-square)](LICENSE.md)
[![Node.js](https://img.shields.io/badge/Node.js-v24%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord)](https://discord.js.org)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io-2496ED?style=flat-square&logo=docker&logoColor=white)](https://github.com/MSK-Scripts/discord_ticketbot/pkgs/container/discord_ticketbot)
[![Dokumentation](https://img.shields.io/badge/Docs-docu.msk--scripts.de-5eb131?style=flat-square)](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started/)

**Selbst gehosteter Discord-Ticket-Bot mit HTML-Transkripten, Web-Dashboard und 7 Sprachen.**

[English](README.md) · Deutsch · [Website](https://www.msk-scripts.de/ticketbot)

</div>

Ein vollständiges Ticket-System für deinen Discord-Server: Ticket-Typen mit eigenem Team und eigenen Fragen, Claimen, Prioritäten, Sperren, Auto-Close, Bewertungen, Textbausteine und eigenständige HTML-Transkripte. Es ist ein reiner Discord-Bot auf Basis von Discord.js v14. Er braucht nur Node.js oder Docker und einen Bot-Token; keinen Gameserver, kein Framework, keine Telemetrie.

Die Daten bleiben bei dir, in einer lokalen SQLite-Datei oder in deiner eigenen MySQL-, MariaDB- oder PostgreSQL-Datenbank. Ein optionales Web-Dashboard lässt dein Team Tickets bearbeiten, die Konfiguration ändern und den Bot im Browser steuern. Gehostete Transkript-Links und komplett gehostete Bots gibt es über den optionalen [MSK-Transkript-Service](docs/setup-de.md).

## Schnellstart

```bash
mkdir -p ticketbot/config ticketbot/data && cd ticketbot
sudo chown -R 1000:1000 config data
curl -O https://raw.githubusercontent.com/MSK-Scripts/discord_ticketbot/main/docker-compose.yml
# .env mit TOKEN, CLIENT_ID und GUILD_ID anlegen, dann:
docker compose up -d
```

Der erste Start legt `config/config.jsonc` an und nennt jeden Platzhalter, der noch ausgefüllt werden muss. Danach neu starten und auf dem Server `/setup` ausführen, um das Ticket-Panel zu posten. Ohne Docker: `npm install`, `.env.example` und `config/config.example.jsonc` kopieren, `npm start`. Details in [Installation](docs/installation-de.md).

## Dokumentation

| Thema | Wo |
|---|---|
| Funktionen, Slash-Befehle und Buttons | [docs/features-de.md](docs/features-de.md) |
| Installation, Datenbank, systemd, Aktualisieren | [docs/installation-de.md](docs/installation-de.md) |
| Konfiguration | [docs/configuration-de.md](docs/configuration-de.md) |
| Web-Dashboard | [docs/dashboard-de.md](docs/dashboard-de.md) |
| Transkript-Service, Abo-Stufen, eigene Domain, gehostete Bots | [docs/setup-de.md](docs/setup-de.md) |
| Projektaufbau und Datenbankschema (Englisch) | [docs/development-en.md](docs/development-en.md) |
| Änderungen je Version | [CHANGELOG.md](CHANGELOG.md) |
| Ausführliche Anleitung mit Screenshots | [docu.msk-scripts.de](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started/) |

## Hilfe und Mitmachen

- Fragen und Support: [Discord](https://discord.gg/5hHSBRHvJE)
- Fehler und Wünsche: [GitHub Issues](https://github.com/MSK-Scripts/discord_ticketbot/issues)
- Sicherheitslücken bitte vertraulich melden: [SECURITY.md](SECURITY.md)
- Pull Requests und neue Sprachen sind willkommen: [CONTRIBUTING.md](CONTRIBUTING.md) und der [Verhaltenskodex](CODE_OF_CONDUCT.md)

## Lizenz

AGPL-3.0-only, siehe [LICENSE.md](LICENSE.md). Wer eine veränderte Fassung weitergibt oder hostet, muss den Quellcode unter derselben Lizenz veröffentlichen.

Eine zusätzliche Bedingung nach Abschnitt 7(b): Der Hinweis, dass es sich um den MSK Ticket Bot handelt, muss für die Nutzer des Bots sichtbar bleiben. Server mit aktivem Premium- oder Premium+-Abo sind davon ausgenommen. Der genaue Wortlaut steht in [NOTICE](NOTICE).
