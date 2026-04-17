# 🎫 Discord Ticket Bot

A modern, self-hosted Discord ticket bot built on **Discord.js v14** and **SQLite** — no external database, no telemetry, full feature set out of the box.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎫 Ticket Types | Up to 25 configurable types with individual emoji, color, category & questions |
| 📋 Questionnaires | Modal forms (up to 5 questions) shown when opening a ticket |
| 🙋 Claim System | Staff can claim and unclaim tickets — renames channel and updates topic |
| 🔴 Priorities | Low / Medium / High / Urgent via `/priority` — shown in channel topic |
| 📝 Staff Notes | Private notes via `/note add` / `/note list` |
| 🔀 Move Ticket | Move to a different type/category via `/move` or button (staff only) |
| 🛡️ Type-specific Staff Roles | Each ticket type can define its own staff roles |
| 🖼️ Panel Banner | Optional banner image in the ticket panel, configurable in config |
| ⭐ Rating System | 1–5 star feedback after closing, automatically posted to a configured channel |
| ⏰ Staff Reminder | Automatic ping inside the ticket if no staff responds within X hours |
| ⏰ Auto-Close | Automatically close inactive tickets with a configurable warning period |
| 📄 HTML Transcript | Full, beautifully styled HTML transcript sent to log channel and creator via DM |
| 📊 Statistics | Server-wide stats and detailed per-user stats via `/stats` |
| 🚫 Blacklist | `/blacklist add/remove/list` to block users from opening tickets |
| 🌍 Multilingual | German and English included, easily extensible |
| 🗄️ SQLite | No external database required — file is created automatically |

---

## 📁 Project Structure

```
discord_ticketbot/
├── index.js                    # Entry point
├── package.json
├── .env.example                # Environment variable template
├── ticketbot.service           # systemd unit file for Linux servers
├── assets/                     # Static files (panel banner image, etc.)
│   └── banner.png              # Example banner (place your own here)
├── config/
│   └── config.example.jsonc    # Configuration template (with comments)
├── locales/
│   ├── de.json                 # German
│   └── en.json                 # English
├── data/
│   └── tickets.db              # SQLite database (auto-created)
└── src/
    ├── client.js               # Extended Discord Client
    ├── config.js               # Config loader & validation
    ├── database.js             # All DB operations (SQLite)
    ├── handlers/
    │   ├── commandHandler.js   # Loads & registers slash commands
    │   ├── eventHandler.js     # Loads Discord events
    │   └── componentHandler.js # Loads buttons, modals, menus
    ├── commands/               # Slash commands
    │   ├── setup.js            # /setup      – Send panel
    │   ├── close.js            # /close      – Close ticket
    │   ├── add.js              # /add        – Add user
    │   ├── remove.js           # /remove     – Remove user
    │   ├── claim.js            # /claim      – Claim ticket
    │   ├── unclaim.js          # /unclaim    – Unclaim ticket
    │   ├── move.js             # /move       – Move ticket
    │   ├── rename.js           # /rename     – Rename channel
    │   ├── transcript.js       # /transcript – HTML transcript
    │   ├── priority.js         # /priority   – Set priority (updates topic)
    │   ├── note.js             # /note       – Staff notes
    │   ├── blacklist.js        # /blacklist  – Block users
    │   └── stats.js            # /stats      – Statistics (server & user)
    ├── events/
    │   ├── ready.js            # Bot start, status, auto-close & staff reminder loop
    │   ├── messageCreate.js    # Track last activity
    │   └── interactionCreate.js # Route all interactions
    ├── components/
    │   ├── buttons/
    │   │   ├── openTicket.js       # tb_open
    │   │   ├── closeTicket.js      # tb_close
    │   │   ├── claimTicket.js      # tb_claim
    │   │   ├── moveTicket.js       # tb_move       (opens type selection)
    │   │   ├── deleteTicket.js     # tb_delete     (confirmation step)
    │   │   ├── deleteConfirm.js    # tb_deleteConfirm
    │   │   ├── deleteCancel.js     # tb_deleteCancel
    │   │   └── rateTicket.js       # tb_rate:N
    │   ├── modals/
    │   │   ├── closeReason.js      # tb_modalClose
    │   │   └── ticketQuestions.js  # tb_modalQuestions:type
    │   └── menus/
    │       ├── ticketType.js       # tb_selectType
    │       └── moveSelect.js       # tb_moveSelect
    └── utils/
        ├── logger.js           # Coloured console logger
        ├── embeds.js           # All embed constructors
        ├── transcript.js       # HTML transcript generator
        └── ticketActions.js    # Core logic: openTicket, performClose, performMove, updateChannelTopic
```

---

## 🚀 Installation

### Requirements
- **Node.js** v18 or newer
- A Discord bot token (https://discord.com/developers/applications)

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
TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
```

### 3. Set up the configuration

```bash
cp config/config.example.jsonc config/config.jsonc
```

Edit `config/config.jsonc` as needed — all fields are commented.

### 4. Start the bot

```bash
npm start
```

On first start the bot will automatically:
- Create the SQLite database at `data/tickets.db`
- Register all slash commands on your server

### 5. Set up the panel

Run `/setup` on your Discord server (Administrator permission required). The bot will send the ticket panel to the channel configured in `openTicketChannelId`.

---

## 🖥️ Autostart with systemd (Linux Server)

The included `ticketbot.service` file lets the bot start automatically after a server reboot.

### 1. Copy the bot files to the server

```bash
# Copy project folder to /opt
sudo cp -r discord_ticketbot /opt/discord_ticketbot

# Create a dedicated system user (recommended — never run as root)
sudo useradd -r -s /bin/false discord

# Set permissions
sudo chown -R discord:discord /opt/discord_ticketbot
```

### 2. Set up .env on the server

```bash
sudo nano /opt/discord_ticketbot/.env
```

### 3. Verify the Node.js path

```bash
which node
# Output e.g.: /usr/bin/node
```

If the path differs, adjust `ExecStart` in `ticketbot.service` accordingly.

### 4. Install the systemd unit

```bash
sudo cp /opt/discord_ticketbot/ticketbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ticketbot.service
```

### 5. Check the status

```bash
# Show current status
sudo systemctl status ticketbot.service

# Follow live logs
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
| `sudo journalctl -u ticketbot.service -f` | Follow live logs |

---

## ⚙️ Slash Commands

| Command | Permission | Description |
|---|---|---|
| `/setup` | Administrator | Send the ticket panel |
| `/close [reason]` | Configurable | Close the current ticket |
| `/claim` | Staff | Claim a ticket (renames channel + updates topic) |
| `/unclaim` | Staff | Release a claimed ticket (restores name + updates topic) |
| `/move` | Staff | Move ticket to a different type/category |
| `/add <user>` | Staff | Add a user to the ticket |
| `/remove <user>` | Staff | Remove a user from the ticket |
| `/rename <n>` | Staff | Rename the ticket channel |
| `/transcript` | Staff | Generate an HTML transcript |
| `/priority <level>` | Staff | Set ticket priority (updates channel topic) |
| `/note add <text>` | Staff | Add a staff note |
| `/note list` | Staff | List all notes for this ticket |
| `/stats` | Staff | Server-wide ticket statistics |
| `/stats @user` | Staff | Detailed statistics for a specific user |
| `/blacklist add` | Manage Guild | Block a user |
| `/blacklist remove` | Manage Guild | Unblock a user |
| `/blacklist list` | Manage Guild | Show the blacklist |

---

## 🔘 Ticket Buttons

Every ticket channel contains a button row at the top:

| Button | Visible when | Description |
|---|---|---|
| 🔒 Close Ticket | Always (configurable) | Disables all buttons, generates transcript, closes ticket |
| 🙋 Claim | `claimButton: true` | Staff claims the ticket, renames channel + updates topic |
| 🔀 Move | More than 1 ticket type | Staff opens type selection (staff only) |
| 🗑️ Delete Ticket | After closing | Deletes the channel after confirmation |

---

## 🛠️ Configuration Reference

### Panel Banner

An optional image can be shown at the bottom of the ticket panel embed.

```jsonc
"panel": {
  "banner": {
    "enabled": true,        // Set to true to show the banner
    "file": "banner.png"    // Filename inside the assets/ folder
  }
}
```

Place the image file (PNG, JPG, GIF or WEBP) in the `assets/` folder, then run `/setup` again to apply. If the file is not found, the bot logs a warning and sends the panel without the banner.

### Priority & Channel Topic

`/priority` no longer renames the channel — it updates the **channel topic** instead, which has no rate-limit. The topic is also updated automatically when a ticket is claimed or unclaimed.

| State | Channel Name | Channel Topic |
|---|---|---|
| Ticket opened | `ticket-username` | `🟡 Mittel` |
| `/priority urgent` | `ticket-username` | `🔴 Dringend` |
| `/claim` | `✔️ ticket-username` | `🟡 Mittel \| 🙋 Claimed by @Staff` |
| `/unclaim` | `ticket-username` | `🟡 Mittel` |

### Ticket Types

```jsonc
{
  "codeName": "support",          // Unique identifier (lowercase)
  "name": "Support",              // Display name in the menu
  "description": "...",           // Description in the selection menu
  "emoji": "💡",
  "color": "#ff0000",             // Hex color or "" to use mainColor
  "categoryId": "123456789",      // Discord category ID
  "ticketNameOption": "",         // Channel name template: USERNAME, USERID, TICKETCOUNT
  "customDescription": "...",     // Variables: REASON1, REASON2, USERNAME, USERID
  "cantAccess": ["roleId"],       // Roles that cannot access this type
  "staffRoles": [],               // Type-specific staff roles (see below)
  "askQuestions": true,
  "questions": [
    {
      "label": "Question",
      "placeholder": "Example...",
      "style": "SHORT",           // SHORT or PARAGRAPH
      "maxLength": 500
    }
  ]
}
```

**Note on `TICKETCOUNT`:** This is a global sequential counter across all tickets on the server — it never resets, even if tickets are closed. Each new ticket always gets a higher number than the previous one regardless of type or user.

### Type-specific Staff Roles (`staffRoles`)

Each ticket type can define its own staff roles, controlling who can see, manage and claim the ticket.

```jsonc
// Only developers can see "Bug Report" tickets:
{ "codeName": "bugreport", "staffRoles": ["ROLE_ID_DEVELOPER"] }

// Leave empty → global rolesWhoHaveAccessToTheTickets are used:
{ "codeName": "support", "staffRoles": [] }
```

When moving a ticket (`/move`), permissions are automatically updated to match the new type. On ticket open, type-specific roles are pinged instead of the global `roleToPingWhenOpenedId`.

### Moving Tickets (`/move` & Button)

When more than one ticket type is configured, a **🔀 Move** button appears automatically in every ticket. Only staff can use it. Both the button and the `/move` command open a selection menu listing all other available types. After selecting, the channel is moved to the new category, permissions (including `staffRoles`) are updated, and a message is posted in the ticket.

### Staff Reminder

```jsonc
"staffReminder": {
  "enabled": true,
  "afterHours": 4,     // Send reminder after X hours without any message
  "pingRoles": true    // Whether to @mention the staff roles of the ticket type
}
```

The bot checks all open tickets every **15 minutes**. Each ticket is only reminded **once** — no spam.

### Rating System

```jsonc
"ratingSystem": {
  "enabled": true,
  "dmUser": true,
  "ratingsChannelId": "CHANNEL_ID_HERE"   // Channel where ratings are posted automatically
}
```

After closing, the ticket creator receives a 1–5 ⭐ rating request via DM. Once they rate, the result is automatically posted to `ratingsChannelId`.

### Auto-Close

```jsonc
"autoClose": {
  "enabled": true,
  "inactiveHours": 48,       // Close after N hours without activity
  "warnBeforeHours": 6,      // Send a warning N hours beforehand
  "excludeClaimed": true     // Exclude claimed tickets from auto-close
}
```

### Statistics

`/stats` shows server-wide numbers. `/stats @user` shows a detailed profile split into two sections — **👤 As a User** (tickets opened, favourite type, average rating given) and **🛡️ As Staff** (tickets closed & claimed, average rating received — only shown if applicable).

---

## 🗄️ Database Schema

The SQLite database is created automatically at `data/tickets.db`. Existing databases are automatically migrated if columns are missing.

| Table | Contents |
|---|---|
| `tickets` | All tickets: status, type, priority, claim info, reminder, transcript |
| `blacklist` | Blocked users with reason and timestamp |
| `staff_notes` | Private staff notes per ticket |
| `ratings` | Ratings (1–5 ⭐) with optional comment |

---

## 🌍 Adding a New Language

1. Copy `locales/de.json`, e.g. as `locales/fr.json`
2. Translate all strings
3. Set `"lang": "fr"` in `config/config.jsonc`

---

## 📝 License

AGPL-3.0 — Source code must remain open and be published under the same license when distributed or hosted.
