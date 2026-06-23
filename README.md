<img width="1917" height="474" alt="MSK Ticket Bot Banner" src="https://github.com/user-attachments/assets/c656750b-3bca-4fcc-a48e-1d173dec6aa4" />

<div align="center">

# 🎫 Discord Ticket Bot

A modern, self-hosted Discord ticket bot built on **Discord.js v14** and **SQLite** — no external database, no telemetry, full feature set out of the box.

[![Version](https://img.shields.io/github/v/release/MSK-Scripts/discord_ticketbot?style=flat-square&label=Version&color=5eb131)](https://github.com/MSK-Scripts/discord_ticketbot/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blueviolet?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-v22%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=flat-square&logo=discord)](https://discord.js.org)
[![Documentation](https://img.shields.io/badge/Docs-docu.msk--scripts.de-5eb131?style=flat-square)](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started)

📄 [Readme (EN)](README.md) · [Readme (DE)](README_GER.md)

</div>


---

## ✨ Features

| Feature | Description |
|---|---|
| 🎫 Ticket Types | Up to 25 configurable types with individual emoji, color, category & questions |
| 📋 Questionnaires | Modal forms (up to 5 questions) shown when opening a ticket |
| 🙋 Claim System | Staff can claim/unclaim — button toggles, embed & topic update automatically |
| 🔴 Priorities | Low / Medium / High / Urgent — predefined per ticket type or set via `/priority`, shown in channel topic & embed |
| 📝 Staff Notes | Private notes via `/note add` / `/note list` |
| 🔀 Move Ticket | Move to a different type/category via `/move` or button (staff only) |
| 🛡️ Type-specific Staff Roles | Each ticket type can define its own staff roles |
| 🖼️ Panel Logo & Banner | Optional logo thumbnail and/or banner image in the panel embed |
| 🎛️ Panel Interaction Type | Choose between a Button or a direct Select Menu in the panel |
| ⭐ Rating System | 1–5 star feedback after closing, automatically posted to a configured channel |
| ⏰ Staff Reminder | Automatic ping inside the ticket if no staff responds within X hours |
| ⏰ Auto-Close | Automatically close inactive tickets with a configurable warning period |
| ♻️ Reopen Tickets | Reopen a closed ticket via the `♻️` button or `/reopen` — configurable, restores access & moves it back |
| 🔗 Transcript Links | Transcripts stored online and accessible via a public link |
| 📄 HTML Transcript | Self-contained HTML transcript in a **modern or classic** style — avatars & custom emojis embedded as Base64, mentions and Created/Claimed/Closed-by shown as names instead of IDs, no CDN required |
| 🌐 Custom Domain | Premium users can serve transcripts under their own domain |
| 📊 Statistics | Server-wide stats and detailed per-user stats via `/stats` |
| 🚫 Blacklist | `/blacklist add/remove/list` to block users from opening tickets |
| 💬 Canned Responses | Pre-defined snippets sent with one command — configured in `snippets.jsonc` |
| 🔒 Ticket Lock | Lock/unlock a ticket to prevent the user from sending messages |
| 📢 Broadcast | Send a message to all open ticket channels at once |
| 🔔 User Notifications | Optional DM notification for users when a staff member replies |
| 🎮 Dynamic Bot Status | Automatically display the number of open tickets in the bot status |
| 🌍 Multilingual | German and English included, easily extensible |
| 🗄️ SQLite | No external database required — file is created automatically |
| 🔄 Auto-Update Check | Checks for new GitHub releases on startup and notifies with update instructions |

---

## 🔗 MSK Transcript Service

Instead of sending transcripts as file attachments via DM, the bot can upload them to **[www.msk-scripts.de](https://www.msk-scripts.de)** and generate a public link — accessible in any browser, no download required.

### Subscription Tiers

| Feature | Basic (free) | Premium (€3.99/mo) | Premium+ (€6.99/mo) |
|---|---|---|---|
| Transcript as link | ✅ | ✅ | ✅ |
| Max. transcript size | 10 MB | 100 MB | 250 MB |
| File attachments in transcript | ❌ | ✅ | ✅ |
| Max. attachment size per ticket | — | 150 MB | 500 MB |
| Custom domain | ❌ | ✅ | ✅ |
| Storage duration | 30 days | 180 days | 365 days |
| Uploads per hour | 30 | 60 | 300 |
| **Hosted bot management** | ❌ | ✅ | ✅ |

> Premium and Premium+ are subscribed directly in your dashboard via **Stripe** — with a **14-day free trial** for new customers, cancellable anytime.

### Getting your API Key

1. Visit **[www.msk-scripts.de/verify](https://www.msk-scripts.de/verify)**
2. Sign in with your Discord account
3. Select your server → your API key is generated instantly

To upgrade to Premium/Premium+, open your **[dashboard](https://www.msk-scripts.de/dashboard)** and start the free trial — billing is handled by Stripe.

Then add it to your `.env`:
```env
MSK_API_KEY="your_api_key_here"
MSK_API_URL="https://www.msk-scripts.de"
```

### Custom Domain (Premium & Premium+)

Premium users can serve transcripts under their own domain (e.g. `tickets.yourserver.com`).

1. Visit **[www.msk-scripts.de/dashboard](https://www.msk-scripts.de/dashboard)** after verifying
2. Enter your domain and set a DNS **A-Record** pointing to the server IP shown
3. Click **"Check DNS"** once propagation is complete — SSL is set up automatically

> 📖 Full setup guide: [docu.msk-scripts.de](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started)

---

## 🖥️ Hosted Bot Management (Premium & Premium+)

Premium and Premium+ customers can have their bot instance **fully hosted by MSK Scripts** and manage it directly from the dashboard at **[msk-scripts.de/dashboard](https://www.msk-scripts.de/dashboard)** — no SSH access or server knowledge required.

![Dashboard — Hosted Bot Management](assets/dashboard-hosted.png)

### What's included

| Feature | Description |
|---|---|
| **Bot Configuration Editor** | Edit `config.jsonc`, `snippets.jsonc`, `.env` and the active language file (`locales/<lang>.json`) directly in the browser with syntax highlighting. Changes take effect after a restart. |
| **Bot Control** | Start, stop and restart the bot with a single click. |
| **One-click Update** | Downloads the latest version via `git pull`, installs new dependencies and prompts you to restart. |
| **Live Log Console** | Real-time stream of the bot's output directly in the browser — no terminal needed. |

### How to get hosted

Contact MSK Scripts via [Discord](https://discord.gg/5hHSBRHvJE) to arrange a hosted Premium+ plan. Once set up, the hosted management panel appears automatically in your dashboard.

---

## 📁 Project Structure

```
discord_ticketbot/
├── index.js                    # Entry point
├── package.json
├── .env.example                # Environment variable template
├── ticketbot.service           # systemd unit file for Linux servers
├── assets/                     # Static files (logo, banner images)
│   ├── logo.png
│   └── banner.png
├── config/
│   ├── config.example.jsonc    # Configuration template (with comments)
│   └── snippets.example.jsonc  # Canned responses template
├── docs/
│   ├── setup-en.md
│   └── setup-de.md
├── locales/
│   ├── de.json
│   └── en.json
├── data/
│   └── tickets.db              # SQLite database (auto-created)
└── src/
    ├── client.js
    ├── config.js
    ├── database.js
    ├── handlers/
    │   ├── commandHandler.js
    │   ├── eventHandler.js
    │   └── componentHandler.js
    ├── commands/
    │   ├── setup.js            # /setup
    │   ├── close.js            # /close
    │   ├── reopen.js           # /reopen
    │   ├── add.js              # /add
    │   ├── remove.js           # /remove
    │   ├── claim.js            # /claim
    │   ├── unclaim.js          # /unclaim
    │   ├── move.js             # /move
    │   ├── rename.js           # /rename
    │   ├── transcript.js       # /transcript
    │   ├── priority.js         # /priority
    │   ├── note.js             # /note
    │   ├── blacklist.js        # /blacklist
    │   ├── stats.js            # /stats
    │   ├── snippet.js          # /snippet
    │   ├── broadcast.js        # /broadcast
    │   └── lock.js             # /lock
    ├── events/
    │   ├── ready.js            # Bot start, status, auto-close & staff reminder loop
    │   ├── messageCreate.js    # Activity tracking + DM notifications
    │   └── interactionCreate.js
    ├── components/
    │   ├── buttons/
    │   │   ├── openTicket.js
    │   │   ├── closeTicket.js
    │   │   ├── claimTicket.js
    │   │   ├── unclaimTicket.js
    │   │   ├── moveTicket.js
    │   │   ├── deleteTicket.js
    │   │   ├── deleteConfirm.js
    │   │   ├── deleteCancel.js
    │   │   ├── reopenTicket.js     # tb_reopen
    │   │   ├── rateTicket.js       # tb_rate:N
    │   │   └── notifyToggle.js     # tb_notifyToggle
    │   ├── modals/
    │   │   ├── closeReason.js
    │   │   └── ticketQuestions.js
    │   └── menus/
    │       ├── panelSelect.js
    │       ├── ticketType.js
    │       └── moveSelect.js
    └── utils/
        ├── logger.js
        ├── embeds.js
        ├── transcript.js       # Self-contained HTML (avatars embedded as Base64)
        ├── mskApi.js
        ├── ticketActions.js
        ├── versionCheck.js     # Startup update check against GitHub releases
        └── snippets.js         # Snippet loader & placeholder engine
```

---

## 🚀 Installation

### Requirements

- **Node.js** v22 or newer
- A Discord bot token — [discord.com/developers/applications](https://discord.com/developers/applications)

### 1. Install dependencies

```bash
cd discord_ticketbot
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
# Required
TOKEN="your_bot_token"
CLIENT_ID="your_application_id"
GUILD_ID="your_server_id"

# Optional — MSK Transcript Service
MSK_API_KEY="your_msk_api_key"
MSK_API_URL="https://www.msk-scripts.de"
```

### 3. Set up the configuration

```bash
cp config/config.example.jsonc config/config.jsonc
```

### 4. (Optional) Set up canned responses

```bash
cp config/snippets.example.jsonc config/snippets.jsonc
```

Edit `config/snippets.jsonc` to define your team's canned responses. If the file does not exist, `/snippet` commands will show a setup hint.

### 5. Start the bot

```bash
npm start
```

### 6. Set up the panel

Run `/setup` on your Discord server (Administrator permission required).

---

## 🖥️ Autostart with systemd (Linux Server)

### 1. Copy bot files

```bash
sudo cp -r discord_ticketbot /opt/discord_ticketbot
sudo useradd -r -s /bin/false discord
sudo chown -R discord:discord /opt/discord_ticketbot
```

### 2. Set up `.env` on the server

```bash
sudo nano /opt/discord_ticketbot/.env
```

### 3. Verify the Node.js path

```bash
which node
```

Adjust `ExecStart` in `ticketbot.service` if the path differs from `/usr/bin/node`.

### 4. Install the systemd unit

```bash
sudo cp /opt/discord_ticketbot/ticketbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ticketbot.service
```

### 5. Check the status

```bash
sudo systemctl status ticketbot.service
sudo journalctl -u ticketbot.service -f
```

### Useful commands

| Command | Description |
|---|---|
| `sudo systemctl start ticketbot.service` | Start the bot |
| `sudo systemctl stop ticketbot.service` | Stop the bot |
| `sudo systemctl restart ticketbot.service` | Restart the bot |
| `sudo systemctl enable ticketbot.service` | Enable autostart |
| `sudo systemctl disable ticketbot.service` | Disable autostart |
| `sudo journalctl -u ticketbot.service -f --output=cat` | Follow live logs with colors |

---

## ⚙️ Slash Commands

| Command | Permission | Description |
|---|---|---|
| `/setup` | Administrator | Send the ticket panel |
| `/close [reason]` | Configurable | Close the current ticket |
| `/reopen` | Configurable | Reopen a closed ticket |
| `/claim` | Staff | Claim a ticket |
| `/unclaim` | Staff | Release a claimed ticket |
| `/move` | Staff | Move ticket to a different type/category |
| `/add <user>` | Staff | Add a user to the ticket |
| `/remove <user>` | Staff | Remove a user from the ticket |
| `/rename <name>` | Staff | Rename the ticket channel |
| `/transcript` | Staff | Generate an HTML transcript |
| `/priority <level>` | Staff | Set ticket priority |
| `/note add <text>` | Staff | Add a staff note |
| `/note list` | Staff | List all notes for this ticket |
| `/stats [user]` | Staff | Server-wide or per-user statistics |
| `/blacklist add/remove/list` | Manage Guild | Manage the user blacklist |
| `/snippet send <name>` | Staff | Send a canned response into the ticket |
| `/snippet list` | Staff | Show all available snippets |
| `/lock lock [reason]` | Staff | Lock ticket — user cannot send messages |
| `/lock unlock` | Staff | Unlock ticket — restore user message access |
| `/broadcast <message>` | Staff | Send a message to all open ticket channels |

---

## 🔘 Ticket Buttons

| Button | Visible when | Description |
|---|---|---|
| 🔒 Close Ticket | Always (configurable) | Generates transcript, closes & renames channel |
| 🙋 Claim | `claimButton: true`, unclaimed | Claim the ticket |
| 🙌 Unclaim | `claimButton: true`, claimed | Release the ticket |
| 🔀 Move | More than 1 type configured | Open type selection |
| 🗑️ Delete Ticket | After closing | Delete channel after confirmation |
| ♻️ Reopen | After closing (`reopenOption.enabled`) | Reopen the ticket — restores access & moves it back to its category |
| 🔕 Notify me | `userNotifications.enabled: true` | User opts in to DM notifications on staff reply |

---

## 🛠️ Configuration Reference

### Panel Interaction Type

```jsonc
"panel": {
  "interactionType": "BUTTON"    // "BUTTON" (default) or "SELECT_MENU"
}
```

### Panel Logo & Banner

```jsonc
"panel": {
  "logo":   { "enabled": true, "file": "logo.png"   },
  "banner": { "enabled": true, "file": "banner.png" }
}
```

### Bot Status

```jsonc
"status": {
  "enabled": true,
  "dynamic": false,              // true = live ticket count in status
  "dynamicText": "🎫 {open} open tickets", // placeholders: {open}, {total}, {closed}
  "dynamicInterval": 5,          // update interval in minutes
  "text": "Support Tickets",     // used when dynamic: false
  "type": "WATCHING",            // PLAYING, WATCHING, LISTENING, STREAMING, COMPETING
  "status": "online"
}
```

### User Notifications

```jsonc
"userNotifications": {
  "enabled": true   // Show a 🔕 "Notify me" button in new tickets.
                    // User opts in → receives a DM when staff first replies.
                    // Rate-limited to 1 DM per 30 minutes per ticket.
}
```

### Canned Responses (Snippets)

Snippets are defined in a separate file — **not** in `config.jsonc`:

```bash
cp config/snippets.example.jsonc config/snippets.jsonc
```

```jsonc
{
  "snippets": [
    {
      "name": "welcome",
      "description": "Welcome message at the start of a ticket",
      "content": "Hey {user}! 👋 Thanks for opening a ticket. We'll be with you shortly.",
      "embed": {
        "title": "👋 Welcome",
        "color": "#5865F2"
      }
    },
    {
      "name": "docs",
      "description": "Link to the MSK-Scripts documentation",
      "content": "Hey {user}, check out our docs: https://docu.msk-scripts.de",
      "embed": null
    }
  ]
}
```

**Available placeholders:** `{user}` · `{staff}` · `{type}` · `{priority}`

**Commands:** `/snippet send <name>` · `/snippet list`

Snippets support autocomplete — start typing the name or description to filter.

### Staff Reminder

```jsonc
"staffReminder": { "enabled": true, "afterHours": 4, "pingRoles": true }
```

### Rating System

```jsonc
"ratingSystem": { "enabled": true, "dmUser": true, "ratingsChannelId": "CHANNEL_ID" }
```

### Startup Log Visibility

```jsonc
"showLog": true   // Show INFO log messages on startup (commands, events, components)
                  // Set to false for a cleaner output in production
```

### Auto-Close

```jsonc
"autoClose": { "enabled": true, "inactiveHours": 48, "warnBeforeHours": 6, "excludeClaimed": true }
```

### Reopen

Closed tickets can be reopened via a `♻️ Reopen` button on the closed-ticket message and the `/reopen` command.

```jsonc
"reopenOption": {
  "enabled": true,           // Master switch for the reopen feature (button + /reopen)
  "button": true,            // Show the ♻️ Reopen button on the closed-ticket message
  "whoCanReopen": "STAFFONLY" // "EVERYONE" or "STAFFONLY"
}
```

Reopening restores the creator's channel access, moves the channel back to its ticket type's category and drops the `closed-` name prefix.

### Transcript Design

The HTML transcript can be rendered in a modern, minimal MSK-branded style or the classic Discord-style layout, and in English or German.

```jsonc
"transcriptDesign": "modern",  // "modern" (default) or "classic"
"transcriptLang": "en"         // "en" or "de" — falls back to English if omitted/unsupported
```

Both styles are fully self-contained (offline-safe): avatars and custom emojis are embedded as Base64, user mentions and the **Created by / Claimed by / Closed by** fields are shown as display names instead of raw IDs, and the header includes the closer and the close reason (the reason only when one was provided). Code blocks have a **copy button**, and `transcriptLang` localizes all transcript labels and the date format.

### Predefined Priority per Ticket Type

Each ticket type may define a `priority` that new tickets of that type start with (instead of the default `medium`). It is reflected in the channel topic and opening embed, and can still be changed later via `/priority`.

```jsonc
"ticketTypes": [
  {
    "codeName": "support",
    "priority": "high",   // "low", "medium", "high" or "urgent" — defaults to "medium" if omitted
    // ...
  }
]
```

### Channel State Overview

| State | Channel Name | Channel Topic | Opening Embed |
|---|---|---|---|
| Ticket opened | `ticket-username` | `🟡 Medium` | Priority: 🟡 Medium |
| `/priority urgent` | `ticket-username` | `🔴 Urgent` | Priority: 🔴 Urgent |
| `/claim` | `ticket-username` | `🟡 Medium \| 🙋 Claimed by @Staff` | + Claimed by field |
| `/lock lock` | `ticket-username` | unchanged | lock notice posted |
| Ticket closed | `closed-ticket-username` | unchanged | all buttons removed |
| Ticket reopened | `ticket-username` | restored | reopen embed + ticket buttons restored |

---

## 🗄️ Database Schema

The SQLite database is created automatically at `data/tickets.db`. Columns are added automatically via migration if they are missing.

| Table | Contents |
|---|---|
| `tickets` | All tickets: status, type, priority, claim, lock, notify, reminder, transcript |
| `blacklist` | Blocked users with reason and timestamp |
| `staff_notes` | Private staff notes per ticket |
| `ratings` | Ratings (1–5 ⭐) with optional comment |

**Columns added in recent updates:**

| Column | Default | Purpose |
|---|---|---|
| `locked` | `0` | Whether the ticket is currently locked |
| `notify_on_reply` | `0` | Whether the creator opted in to DM notifications |
| `last_notify_sent` | `NULL` | Timestamp of the last notification DM (30-min cooldown) |

---

## 🌍 Adding a New Language

1. Copy `locales/en.json`, e.g. as `locales/fr.json`
2. Translate all strings
3. Set `"lang": "fr"` in `config/config.jsonc`

---

## 📖 Documentation

Full documentation: **[docu.msk-scripts.de](https://docu.msk-scripts.de/discord/discord_ticketbot/getting-started)**

---

## 🤝 Contributing

Contributions are welcome! Please read the **[Contributing Guidelines](CONTRIBUTING.md)**
before opening an issue or pull request. By participating you agree to our
[Code of Conduct](CODE_OF_CONDUCT.md). Found a security issue? See [SECURITY.md](SECURITY.md).

---

## 📝 License

AGPL-3.0 — Source code must remain open and be published under the same license when distributed or hosted.

Forks and modifications that remove or bypass the MSK Transcript Service integration are not permitted.
