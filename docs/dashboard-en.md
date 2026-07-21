# Web Dashboard

*[Deutsche Version: dashboard-de.md](dashboard-de.md)*

Manage tickets, statistics and the bot configuration in your browser instead of
editing files over SSH.

The dashboard is **optional and disabled by default**. If you never enable it,
nothing about your bot changes.

---

## What it can do

| Area | What you get |
|---|---|
| **My tickets** | Every member sees the tickets they opened and can reply to the open ones. Their reply is posted in the Discord channel under their own name. Closed tickets offer a transcript download and, on premium, an "Open transcript" link. |
| **Tickets** | Full list with filters, ticket detail with the live conversation, claim / close / reopen / move / lock / priority. |
| **Statistics** | Totals, average rating, average handling time, and a team ranking by tickets closed. |
| **Configuration** | Edit `config.jsonc`, `snippets.jsonc`, `.env` and the locale files in either a structured **form** view or a raw **file** view (with line numbers and syntax highlighting). Form edits preserve the `//` comments, and a side panel resolves Discord role/channel/category **names** so you never have to hunt for raw IDs. |
| **Bot control** | Start, stop, restart and update the bot, plus a live console. |
| **Permissions** | Decide which roles and users may use the dashboard, and what they may do. |

---

## Quick start

```bash
npm run dashboard:setup   # guided setup: generates secrets, writes .env
npm run dashboard         # starts the bot WITH the dashboard
```

`npm start` keeps working exactly as before and runs the plain bot with no web
server at all.

The setup wizard asks how you want to reach the dashboard and writes the right
configuration for you. It **refuses** to write an unsafe combination.

---

## How it runs

The dashboard is **not** inside the bot process. It is the **parent** process and
runs the bot as a child:

```
node dashboard.js   ← the dashboard (web server + supervisor)
   └── index.js     ← the bot
```

This is why the dashboard can restart the bot at all. A dashboard living inside
the bot could not restart the process it is served from, and would be gone
exactly when you need it most: after a crash. With the split, the dashboard stays
up, shows you the crash in the console, and lets you start the bot again.

---

## Security

The dashboard can restart your bot and edit your `.env`. Treat it like an admin
panel, because that is what it is.

### It is safe by default

* **Disabled** unless you set `DASHBOARD_ENABLED=true`.
* **Bound to `127.0.0.1`**, so it is not reachable from the internet at all.
* **Refuses to start** if you bind it to a public interface without HTTPS.
  You will get a clear error telling you how to fix it, rather than a silently
  exposed panel.
* The signing secret (`SESSION_SECRET`) is **generated per installation**. There
  is no shipped default, because a shared default would let anyone forge a login
  on every installation at once.

### Reaching it

**Option A: SSH tunnel (simplest, nothing exposed)**

```bash
ssh -L 3010:127.0.0.1:3010 user@your-server
```

Then open `http://127.0.0.1:3010` on your own computer.

**Option B: reverse proxy with HTTPS (for real use)**

Keep `DASHBOARD_HOST=127.0.0.1`. Your web server talks to the dashboard locally,
so the port never has to be open to the internet. `npm run dashboard:setup`
detects your operating system and prints a matching reverse-proxy config: an
Apache vhost plus the `certbot` command on Linux, or an IIS `web.config` (URL
Rewrite + ARR) and a Caddy alternative on Windows. The dashboard polls for logs
(no long-lived streaming), so any standard reverse proxy works without special
buffering settings.

> **Do not** simply set `DASHBOARD_HOST=0.0.0.0` and open the port. Without TLS
> your session cookie and everything you type travels in plaintext. The bot will
> refuse to start in that configuration anyway.

---

## Login and permissions

Login is **Discord OAuth** using the application you already created for the bot.
You only need to:

1. Add the redirect URI shown by the setup wizard in the
   [Discord Developer Portal](https://discord.com/developers/applications)
   under **OAuth2 → Redirects**.
2. Copy the **Client Secret** from **OAuth2 → Client Secret** into `CLIENT_SECRET`.

Your Discord roles are resolved **server-side by the bot**. The dashboard never
takes your word for what permissions you have.

### The permission model

* The **server owner** always has every permission and can never be locked out.
* You grant access to **roles** or to individual **users**.
* **A user entry overrides that person's role entries completely.** This is the
  point of having both: it lets you take a single permission *away* from one
  person that their role grants them.
* Someone with no entry at all sees **only their own tickets** and can reply to
  them, nothing more — and even that only when the **end-user portal** is switched
  on (see below). By default the dashboard is **staff-only**.

| Permission | Allows |
|---|---|
| `tickets.view` | See the ticket list and ticket details |
| `tickets.act` | Claim, close, reopen, move, lock, set priority |
| `tickets.reply` | Reply in a ticket as the bot |
| `stats.view` | See statistics and team performance |
| `config.view` / `config.edit` | Read / write the config files |
| `bot.control` | Start, stop, restart, update the bot |
| `blacklist.manage` | Manage the blacklist |
| `access.manage` | Manage these permissions |

You cannot remove your own `access.manage`, deactivate yourself, or grant
yourself a permission you do not already have. Granting permissions to *other*
people is unrestricted.

Every change made through the dashboard is written to an audit log.

### The public end-user portal

By default the dashboard is **staff-only**: only the owner and members you have
granted at least one permission can sign in. Turning the dashboard on for your
team does **not** silently give every server member a login.

Set `DASHBOARD_PUBLIC_PORTAL=true` (the setup wizard also offers this) to open the
end-user portal. Any member can then sign in with Discord and gets a **"My
tickets"** view that shows **only their own tickets**, where they can:

* follow the live conversation of an open ticket and **reply** to it (the reply
  appears in Discord under their own name),
* download the transcript of a closed ticket (plus, on premium, an "Open
  transcript" link).

That is the whole of the portal — a member with no permissions can never see
other people's tickets, statistics, the config, or the bot controls. Everything
staff-facing still requires an explicit permission. Whether the portal is on or
off, the reply route re-checks server-side that the ticket is open, not locked,
the member is not blacklisted, and it really is their own ticket before anything
reaches Discord.

---

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `DASHBOARD_ENABLED` | `false` | Master switch |
| `DASHBOARD_HOST` | `127.0.0.1` | Bind address. Leave it alone unless you know why. |
| `DASHBOARD_PORT` | `3010` | Port |
| `DASHBOARD_PUBLIC_URL` | `http://127.0.0.1:<port>` | The URL your browser uses. Must match the Discord redirect URI. |
| `DASHBOARD_PUBLIC_PORTAL` | `false` | Staff-only when off. When on, any member may sign in to manage only their own tickets. |
| `DASHBOARD_ALLOW_INSECURE` | `false` | Only if you terminate TLS somewhere the bot cannot see |
| `SESSION_SECRET` | *generated* | Cookie signing key. Never share or reuse it. |
| `CLIENT_SECRET` | (none) | Discord OAuth2 client secret |

---

## Running it as a service

> **Reverse proxy and service manager are two separate layers.** A reverse proxy
> (Apache, Caddy or IIS) only terminates HTTPS and forwards to the dashboard; it
> does **not** run the Node process. A service manager (systemd, or NSSM / Task
> Scheduler on Windows) keeps the Node process (`node dashboard.js`) alive; it
> does **not** handle HTTPS. For public use you need both. One Caddy/IIS instance
> can also front several apps at once (one site block per hostname), so it never
> conflicts with a proxy you already run — just add another block, do not start a
> second instance.

Use `dashboard.js` instead of `index.js` as the entry point. The service manager
keeps the dashboard alive, and the dashboard keeps the bot alive.

**Linux (systemd):**

```ini
[Service]
ExecStart=/usr/bin/node /opt/discord_ticketbot/dashboard.js
```

**Windows:** register `dashboard.js` as a service, e.g. with
[NSSM](https://nssm.cc):

```
nssm install TicketBot "C:\Program Files\nodejs\node.exe" dashboard.js
nssm set TicketBot AppDirectory C:\path\to\discord_ticketbot
```

or create a Task Scheduler task set to "Run whether user is logged on or not"
and triggered at system startup. The dashboard runs on Windows as-is: it starts
the bot with `fork()` and shells out to `npm.cmd`/`git` for updates. One
difference: "Stop"/"Restart" from the dashboard terminates the bot directly
(Windows has no catchable `SIGTERM`), which is safe here since there is no
critical unflushed state.

---

## Troubleshooting

**The dashboard refuses to start, saying the configuration is not safe**
You bound the dashboard to a public interface without HTTPS. Either go back to
`DASHBOARD_HOST=127.0.0.1` and use a reverse proxy, or set `DASHBOARD_PUBLIC_URL`
to your `https://` address.

**Login redirects back with an error**
The redirect URI in the Discord portal must match `DASHBOARD_PUBLIC_URL` +
`/auth/callback` **exactly**, including `https` and any trailing path.

**A member is told the dashboard is "limited to staff"**
The dashboard is staff-only by default. Either grant that person a permission
under **Permissions**, or set `DASHBOARD_PUBLIC_PORTAL=true` to open the end-user
portal so any member can manage their own tickets.

**The conversation in a ticket is empty**
The bot needs the **Message Content** intent (Developer Portal → Bot →
Privileged Gateway Intents) and `Read Message History` in the ticket channels.
Without the latter Discord returns an empty list rather than an error.

**Replies posted under a user's name do not appear**
The bot needs the **Manage Webhooks** permission. Discord offers no way to post
*as* a user, so the reply is sent through a webhook carrying that user's name and
avatar. It will still show an `APP` badge, which is Discord's anti-impersonation
protection and cannot be removed.
