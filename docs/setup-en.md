# MSK Ticket Bot – Service Setup (English)

This guide explains how to set up the MSK Transcript Service for your self-hosted bot instance.  
The service stores ticket transcripts online and makes them accessible via a public link.  
Optionally, Premium users can serve transcripts under their own custom domain.

---

## Table of Contents

1. [What is the Transcript Service?](#1-what-is-the-transcript-service)
2. [Subscription Tiers](#2-subscription-tiers)
3. [Step 1 – Set up Stripe (subscriptions)](#3-step-1--set-up-stripe-subscriptions)
4. [Step 2 – Create a Discord OAuth App](#4-step-2--create-a-discord-oauth-app)
5. [Step 3 – Verify on the Website](#5-step-3--verify-on-the-website)
6. [Step 4 – Add the API Key to the Bot](#6-step-4--add-the-api-key-to-the-bot)
7. [Step 5 – Set up a Custom Domain (Premium)](#7-step-5--set-up-a-custom-domain-premium)
8. [Console Output on Startup](#8-console-output-on-startup)
9. [FAQ](#9-faq)

---

## 1. What is the Transcript Service?

When a ticket is closed, the bot generates a complete HTML transcript of all messages.  
Without a configured API key, the transcript is sent as a file attachment via DM — as before.

With the MSK Transcript Service, the transcript is uploaded to **www.msk-scripts.de** instead  
and a public link is returned. Users can open the transcript directly in their browser.

Premium users additionally get downloadable file attachments in the transcript and can  
configure a **custom domain** so transcripts are served under their own URL.

---

## 2. Subscription Tiers

| Feature | Basic (free) | Premium (€3.99/month) | Premium+ (€6.99/month) | Business (€9.99/month) |
|---|---|---|---|---|
| Transcript as link | ✅ | ✅ | ✅ | ✅ |
| Max. transcript size | 10 MB | 50 MB | 100 MB | 200 MB |
| File attachments in transcript | ❌ | ✅ | ✅ | ✅ |
| Max. attachment size per ticket | — | 100 MB | 200 MB | 500 MB |
| Custom domain | ❌ | ✅ | ✅ | ✅ |
| Storage duration | 30 days | 180 days | 365 days | 10 years |
| Remove the MSK notice | ❌ | ✅ | ✅ | ✅ |
| **Hosted bot management** | ❌ | ✅ | ✅ | ✅ |

> Paid tiers are subscribed in your dashboard via **Stripe**, with a **14-day free trial** and no card  
> for new customers (cancel anytime). Manage or cancel anytime via the Stripe customer portal.

---

## 3. Step 1 – Set up Stripe (subscriptions)

> **Purpose:** Premium and Premium+ are billed via Stripe. This step is only needed  
> if you self-host the website — on the official **msk-scripts.de** it is already configured.

### Instructions

1. In the [Stripe Dashboard](https://dashboard.stripe.com) → **Products**, create two products,
   each with a **recurring monthly price**:
   - `Ticketbot Premium` → €3.99 / month
   - `Ticketbot Premium+` → €6.99 / month
   - `Ticketbot Business` → €9.99 / month

   Copy each **Price ID** (`price_…`). Do **not** configure a trial on the price — the
   14-day trial is applied automatically in code for new customers.
2. **Developers → API keys** → copy your **Secret key** (`sk_…`).
3. **Settings → Billing → Customer portal** → enable it (allow cancellation + plan changes).
4. **Developers → Webhooks** → add an endpoint `https://www.msk-scripts.de/api/webhook/stripe`
   with the events `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
   `invoice.payment_succeeded`, `invoice.payment_failed`. Copy the **signing secret** (`whsec_…`).

### Where to add these

These values go into `.env.local` on the **web server** (not the bot's `.env`):

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PREMIUM=price_xxx
STRIPE_PRICE_PREMIUM_PLUS=price_xxx
```

---

## 4. Step 2 – Create a Discord OAuth App

> **Purpose:** The website reads your Discord server list so you can select  
> which server the API key should apply to.

### Instructions

1. Open [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **"New Application"**
3. Give it a name, e.g. `MSK Ticket Verify`
4. Click **"OAuth2"** in the left sidebar
5. Under **"Redirects"**, click **"Add Redirect"** and enter:
   ```
   https://www.msk-scripts.de/api/auth/discord-verify/callback
   ```
6. Click **"Save Changes"**
7. Copy the **Client ID** shown on the OAuth2 page
8. Click **"Reset Secret"** and copy the **Client Secret**

### Where to add these

```env
DISCORD_VERIFY_CLIENT_ID=your_client_id_here
DISCORD_VERIFY_CLIENT_SECRET=your_client_secret_here
```

> ⚠️ This is a **separate** application from the Discord bot itself.  
> Do not use the bot token here — only Client ID and Secret.

---

## 5. Step 3 – Verify on the Website

This process must be completed **once per server** by a server administrator.

### 5.1 Open the website

Go to **[www.msk-scripts.de/ticketbot/verify](https://www.msk-scripts.de/ticketbot/verify)** in your browser.

---

### 5.2 Connect Discord

Click **"Sign in with Discord"**.  
You will be redirected to Discord — click **"Authorize"**.

The app requests two permissions:
- **`identify`** — to recognize your Discord account
- **`guilds`** — to display the list of your servers

---

### 5.3 Select your server

You will see a list of all Discord servers where you have **Administrator** permissions.  
Select the server you want the API key for and click **"Generate API Key"**.

> ℹ️ Each server requires its own separate API key.  
> If you manage multiple servers, repeat the process for each one.

---

### 5.4 Save your API Key

After generation, your personal API key is displayed.  
**Copy it immediately** — it will not be shown again.

```
MSK_API_KEY=a1b2c3d4e5f6...
```

> ⚠️ **Important:** If you run the verify process again for the same server,  
> a new API key is generated and the old one becomes **invalid immediately**.  
> You will need to update the key in your bot's `.env` and restart the bot.

> 🔒 Never share this key. Anyone who has it can upload transcripts on your behalf.

> ✅ You can close this page once you have safely copied the key.

---

## 6. Step 4 – Add the API Key to the Bot

Open the `.env` file in your bot folder and add:

```env
MSK_API_KEY="your_api_key_here"
MSK_API_URL="https://www.msk-scripts.de"
```

Then restart the bot.

---

## 7. Step 5 – Set up a Custom Domain (Premium)

> This step is **only available for Premium and Premium+** subscribers.  
> Basic users can skip this step.

A custom domain lets your users access transcripts under your own URL,  
e.g. `https://tickets.yourserver.com/...` instead of `https://www.msk-scripts.de/...`

### 7.1 Open the Dashboard

After completing the verify process, click **"Go to Dashboard"**,  
or visit **[www.msk-scripts.de/ticketbot/dashboard](https://www.msk-scripts.de/ticketbot/dashboard)** directly.

---

### 7.2 Enter your domain

In the **"Custom Domain"** section, enter your desired domain, e.g.:
```
tickets.yourserver.com
```

Click **"Set"**. If the DNS is not yet pointing to the server, you will see the DNS instructions.

---

### 7.3 Set the DNS A-Record

Log in to your domain registrar (e.g. Cloudflare, Namecheap, IONOS) and create an **A-Record**:

| Type | Name | Target (IP) |
|---|---|---|
| `A` | `tickets` (or `@` for root) | The IP address shown in the dashboard |

> ⏱ DNS propagation can take up to **24 hours**.  
> Most providers process changes within a few minutes to an hour.

---

### 7.4 Validate DNS and activate

Once DNS has propagated, click **"Check DNS"** in the dashboard.  
If the domain points correctly to the server, it will be activated automatically:

- An **Apache2 VirtualHost** is created on the server
- A **free SSL certificate** (Let's Encrypt) is obtained via Certbot
- Your transcripts are immediately accessible under your domain

---

### 7.5 Remove a domain

To remove a custom domain, click the **trash icon** next to the active domain in the dashboard.  
The VirtualHost will be removed from the server and transcripts revert to the default URL.

---

## 8. Console Output on Startup

When the bot starts you will see the following in the terminal:

```
                        ███╗   ███╗███████╗██╗  ██╗
                        ████╗ ████║██╔════╝██║ ██╔╝
                        ██╔████╔██║███████╗█████╔╝
                        ██║╚██╔╝██║╚════██║██╔═██╗
                        ██║ ╚═╝ ██║███████║██║  ██╗
                        ╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
████████╗██╗ ██████╗██╗  ██╗███████╗████████╗    ██████╗  ██████╗ ████████╗
...
                 https://github.com/MSK-Scripts/discord_ticketbot

Checking for updates... up to date (v2.10.0)
Checking API Key... API key valid → Premium+

Connecting to Discord...

[INFO] Database initialized.
[INFO] Commands loaded...
[OK  ] Slash commands registered successfully.
...
[OK  ] Logged in as BotName#1234
[INFO] Serving 1 guild(s).
[INFO] Status set: WATCHING "Support Tickets"

  ✔ MSK Ticket Bot successfully started!
  ──────────────────────────────────────────
  Bot       BotName#1234
  Guilds    1
  Commands  16
```

> **Tip:** To see colors when running as a systemd service, use:
> ```bash
> journalctl -u ticketbot -f --output=cat
> ```

### Possible API Key results

| Output | Meaning |
|---|---|
| `No API key configured → Basic` | No `MSK_API_KEY` set in `.env` |
| `Invalid API key → Basic` | The key is incorrect or has been regenerated |
| `MSK server unreachable → Basic` | www.msk-scripts.de is temporarily unreachable |
| `API key valid → Premium` | ✅ Premium active |
| `API key valid → Premium+` | ✅ Premium+ active |

---

## 9. FAQ

**Do I need an API key?**  
No. Without an API key the bot works normally and sends the transcript as a file via DM.  
The API key is only needed if you want transcripts stored as public links.

**What happens when I cancel my subscription?**  
At the end of the paid period your tier is automatically downgraded to Basic (cancelling  
during the 14-day free trial incurs no charge). Existing transcripts remain accessible  
until their individual expiry date. Custom domains are deactivated.

**Can I use the same API key for multiple servers?**  
No. Each API key is bound to one specific Discord server.  
Complete the verify process separately for each server you want to use the service for.

**I lost my API key — what now?**  
Visit [www.msk-scripts.de/ticketbot/verify](https://www.msk-scripts.de/ticketbot/verify) again and complete the process.  
A new key is generated and the old one is invalidated immediately.  
Don't forget to update the key in your bot's `.env` and restart.

**My domain shows "DNS pending" after a long time — what should I check?**  
Verify that the A-record is set correctly at your domain registrar and points to the exact IP  
shown in the dashboard. You can check propagation using tools like [dnschecker.org](https://dnschecker.org).

**Is the SSL certificate free?**  
Yes. SSL certificates are obtained automatically via **Let's Encrypt** (Certbot) at no cost.  
They renew automatically before expiry.

**What is "Hosted Bot Management"?**  
Premium+ customers can have their bot instance fully hosted by MSK Scripts. The bot runs on the MSK server and can be managed entirely through the dashboard — including editing config files, starting/stopping/restarting the bot, running updates, and watching live log output in real time. Contact MSK Scripts via [Discord](https://discord.gg/5hHSBRHvJE) to arrange a hosted Premium+ plan.
