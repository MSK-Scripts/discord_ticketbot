# MSK Ticket Bot – Service Setup (Deutsch)

Diese Anleitung erklärt, wie du den MSK Transcript Service für deinen selbst-gehosteten Bot einrichtest.  
Der Service speichert Ticket-Transkripte online und macht sie über einen öffentlichen Link abrufbar.  
Premium-Nutzer können Transkripte zusätzlich unter ihrer eigenen Domain bereitstellen.

---

## Inhaltsverzeichnis

1. [Was ist der Transcript Service?](#1-was-ist-der-transcript-service)
2. [Abo-Modelle im Überblick](#2-abo-modelle-im-überblick)
3. [Schritt 1 – Stripe einrichten (Abos)](#3-schritt-1--stripe-einrichten-abos)
4. [Schritt 2 – Discord OAuth App erstellen](#4-schritt-2--discord-oauth-app-erstellen)
5. [Schritt 3 – Verifizierung auf der Website](#5-schritt-3--verifizierung-auf-der-website)
6. [Schritt 4 – API Key in den Bot eintragen](#6-schritt-4--api-key-in-den-bot-eintragen)
7. [Schritt 5 – Eigene Domain einrichten (Premium)](#7-schritt-5--eigene-domain-einrichten-premium)
8. [Konsolenausgabe beim Start](#8-konsolenausgabe-beim-start)
9. [Häufige Fragen](#9-häufige-fragen)

---

## 1. Was ist der Transcript Service?

Wenn ein Ticket geschlossen wird, generiert der Bot ein vollständiges HTML-Transkript aller Nachrichten.  
Ohne konfigurierten API Key wird das Transkript wie bisher als Dateianhang per DM versendet.

Mit dem MSK Transcript Service wird das Transkript stattdessen auf **www.msk-scripts.de** hochgeladen  
und ein öffentlicher Link zurückgegeben. Nutzer können das Transkript direkt im Browser öffnen.

Premium-Nutzer erhalten zusätzlich herunterladbare Dateianhänge im Transkript und können eine  
**eigene Domain** konfigurieren, sodass Transkripte unter ihrer eigenen URL abrufbar sind.

---

## 2. Abo-Modelle im Überblick

| Feature | Basic (kostenlos) | Premium (3,99 €/Monat) | Premium+ (6,99 €/Monat) |
|---|---|---|---|
| Transkript als Link | ✅ | ✅ | ✅ |
| Max. Transkriptgröße | 10 MB | 100 MB | 250 MB |
| Dateianhänge im Transkript | ❌ | ✅ | ✅ |
| Max. Anhangsgröße pro Ticket | — | 150 MB | 500 MB |
| Eigene Domain | ❌ | ✅ | ✅ |
| Speicherdauer | 30 Tage | 60 Tage | 90 Tage |
| **Gehostetes Bot-Management** | ❌ | ✅ | ✅ |

> Premium und Premium+ werden im Dashboard über **Stripe** abonniert, mit **14 Tagen kostenloser Testphase**  
> für Neukunden (jederzeit kündbar). Verwaltung/Kündigung jederzeit über das Stripe-Kundenportal.

---

## 3. Schritt 1 – Stripe einrichten (Abos)

> **Zweck:** Premium und Premium+ werden über Stripe abgerechnet. Dieser Schritt ist nur nötig,  
> wenn du die Website selbst hostest — auf dem offiziellen **msk-scripts.de** ist alles bereits eingerichtet.

### Anleitung

1. Im [Stripe-Dashboard](https://dashboard.stripe.com) → **Produkte** zwei Produkte mit je einem
   **monatlichen wiederkehrenden Preis** anlegen:
   - `Ticketbot Premium` → 3,99 € / Monat
   - `Ticketbot Premium+` → 6,99 € / Monat

   Kopiere jeweils die **Price-ID** (`price_…`). Am Preis **keine** Testphase einstellen — die
   14-Tage-Testphase wird im Code automatisch für Neukunden angewendet.
2. **Entwickler → API-Schlüssel** → **Geheimen Schlüssel** (`sk_…`) kopieren.
3. **Einstellungen → Abrechnung → Kundenportal** → aktivieren (Kündigung + Tarifwechsel erlauben).
4. **Entwickler → Webhooks** → Endpunkt `https://www.msk-scripts.de/api/webhook/stripe` mit den Events
   `checkout.session.completed`, `customer.subscription.created/updated/deleted`,
   `invoice.payment_succeeded`, `invoice.payment_failed` anlegen. **Signing-Secret** (`whsec_…`) kopieren.

### Wo eintragen

Diese Werte kommen in die `.env.local` auf dem **Webserver** (nicht in die Bot-`.env`):

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PREMIUM=price_xxx
STRIPE_PRICE_PREMIUM_PLUS=price_xxx
```

---

## 4. Schritt 2 – Discord OAuth App erstellen

> **Zweck:** Die Website liest deine Discord-Server-Liste, damit du auswählen kannst,  
> für welchen Server der API Key gelten soll.

### Anleitung

1. Öffne [discord.com/developers/applications](https://discord.com/developers/applications)
2. Klicke auf **„New Application"**
3. Vergib einen Namen, z.B. `MSK Ticket Verify`
4. Klicke links auf **„OAuth2"**
5. Klicke unter **„Redirects"** auf **„Add Redirect"** und trage ein:
   ```
   https://www.msk-scripts.de/api/auth/discord-verify/callback
   ```
6. Klicke auf **„Save Changes"**
7. Kopiere die **Client ID** auf der OAuth2-Seite
8. Klicke auf **„Reset Secret"** und kopiere das **Client Secret**

### Wo eintragen

```env
DISCORD_VERIFY_CLIENT_ID=deine_client_id_hier
DISCORD_VERIFY_CLIENT_SECRET=dein_client_secret_hier
```

> ⚠️ Dies ist eine **separate** App vom Discord-Bot selbst.  
> Verwende hier nicht den Bot-Token — nur Client ID und Secret.

---

## 5. Schritt 3 – Verifizierung auf der Website

Dieser Prozess muss **einmalig pro Server** von einem Server-Administrator durchgeführt werden.

### 5.1 Website aufrufen

Öffne **[www.msk-scripts.de/verify](https://www.msk-scripts.de/verify)** in deinem Browser.

---

### 5.2 Discord verbinden

Klicke auf **„Mit Discord anmelden"**.  
Du wirst zu Discord weitergeleitet — klicke dort auf **„Autorisieren"**.

Die App benötigt zwei Berechtigungen:
- **`identify`** — damit dein Discord-Account erkannt werden kann
- **`guilds`** — damit deine Server-Liste angezeigt werden kann

---

### 5.3 Server auswählen

Du siehst nun eine Liste aller Discord-Server, auf denen du **Administrator**-Rechte hast.  
Wähle den Server aus, für den du den API Key haben möchtest, und klicke auf **„API Key generieren"**.

> ℹ️ Jeder Server benötigt einen eigenen API Key.  
> Wenn du mehrere Server betreust, führe den Prozess für jeden Server separat durch.

---

### 5.4 API Key speichern

Nach der Generierung wird dein persönlicher API Key angezeigt.  
**Kopiere ihn sofort** — er wird nicht erneut angezeigt.

```
MSK_API_KEY=a1b2c3d4e5f6...
```

> ⚠️ **Wichtig:** Wenn du den Verify-Prozess für denselben Server erneut durchläufst,  
> wird ein neuer API Key generiert und der alte wird **sofort ungültig**.  
> Du musst den neuen Key in der `.env` deines Bots eintragen und den Bot neu starten.

> 🔒 Teile diesen Key mit niemandem. Wer ihn kennt, kann Transkripte in deinem Namen hochladen.

> ✅ Du kannst diese Seite schließen, sobald du den Key sicher kopiert hast.

---

## 6. Schritt 4 – API Key in den Bot eintragen

Öffne die `.env`-Datei in deinem Bot-Ordner und trage ein:

```env
MSK_API_KEY="dein_api_key_hier"
MSK_API_URL="https://www.msk-scripts.de"
```

Starte den Bot danach neu.

---

## 7. Schritt 5 – Eigene Domain einrichten (Premium)

> Dieser Schritt ist **nur für Premium und Premium+** verfügbar.  
> Basic-Nutzer können diesen Schritt überspringen.

Mit einer eigenen Domain sind Transkripte unter deiner URL abrufbar,  
z.B. `https://tickets.deinserver.de/...` statt `https://www.msk-scripts.de/...`

### 7.1 Dashboard aufrufen

Klicke nach der Verifizierung auf **„Zum Dashboard"**,  
oder öffne direkt **[www.msk-scripts.de/dashboard](https://www.msk-scripts.de/dashboard)**.

---

### 7.2 Domain eintragen

Im Bereich **„Eigene Domain"** trägst du deine gewünschte Domain ein, z.B.:
```
tickets.deinserver.de
```

Klicke auf **„Setzen"**. Falls der DNS noch nicht korrekt gesetzt ist, werden die DNS-Anweisungen angezeigt.

---

### 7.3 DNS A-Record setzen

Melde dich bei deinem Domain-Anbieter an (z.B. Cloudflare, IONOS, Namecheap) und erstelle einen **A-Record**:

| Typ | Name | Ziel (IP) |
|---|---|---|
| `A` | `tickets` (oder `@` für die Root-Domain) | Die im Dashboard angezeigte IP-Adresse |

> ⏱ DNS-Änderungen können bis zu **24 Stunden** dauern.  
> Die meisten Anbieter verarbeiten Änderungen jedoch innerhalb weniger Minuten bis einer Stunde.

---

### 7.4 DNS prüfen und aktivieren

Sobald die DNS-Propagierung abgeschlossen ist, klicke im Dashboard auf **„DNS prüfen"**.  
Falls die Domain korrekt auf den Server zeigt, wird sie automatisch aktiviert:

- Ein **Apache2 VirtualHost** wird auf dem Server erstellt
- Ein **kostenloses SSL-Zertifikat** (Let's Encrypt) wird über Certbot eingerichtet
- Deine Transkripte sind sofort unter deiner Domain abrufbar

---

### 7.5 Domain entfernen

Um eine eigene Domain zu entfernen, klicke im Dashboard auf das **Papierkorb-Symbol** neben der aktiven Domain.  
Der VirtualHost wird vom Server entfernt und Transkripte sind wieder über die Standard-URL abrufbar.

---

## 8. Konsolenausgabe beim Start

Beim Start siehst du folgende Ausgabe im Terminal:

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

> **Tipp:** Um Farben beim Betrieb als systemd-Service zu sehen:
> ```bash
> journalctl -u ticketbot -f --output=cat
> ```

### Mögliche API Key Ergebnisse

| Ausgabe | Bedeutung |
|---|---|
| `No API key configured → Basic` | Kein `MSK_API_KEY` in der `.env` eingetragen |
| `Invalid API key → Basic` | Der Key ist falsch oder wurde neu generiert |
| `MSK server unreachable → Basic` | www.msk-scripts.de ist vorübergehend nicht erreichbar |
| `API key valid → Premium` | ✅ Premium aktiv |
| `API key valid → Premium+` | ✅ Premium+ aktiv |

---

## 9. Häufige Fragen

**Muss ich einen API Key haben?**  
Nein. Ohne API Key funktioniert der Bot normal und sendet das Transkript als Datei per DM.  
Der Key ist nur nötig, wenn Transkripte als öffentliche Links gespeichert werden sollen.

**Was passiert wenn ich mein Abo kündige?**  
Zum Ende des bezahlten Zeitraums wird dein Tier automatisch auf Basic zurückgestuft (eine Kündigung  
während der 14-tägigen Testphase verursacht keine Kosten). Bestehende Transkripte bleiben bis zu  
ihrem Ablaufdatum abrufbar. Eigene Domains werden deaktiviert.

**Kann ich den API Key für mehrere Server nutzen?**  
Nein. Jeder API Key ist an genau einen Discord-Server gebunden.  
Für jeden Server muss der Verify-Prozess separat durchgeführt werden.

**Ich habe meinen API Key verloren — was nun?**  
Besuche [www.msk-scripts.de/verify](https://www.msk-scripts.de/verify) erneut und durchlaufe den Prozess.  
Ein neuer Key wird generiert und der alte wird sofort ungültig.  
Vergiss nicht, den Key in der `.env` des Bots zu aktualisieren und ihn neu zu starten.

**Meine Domain zeigt nach langer Zeit noch „DNS ausstehend" — was prüfen?**  
Stelle sicher, dass der A-Record bei deinem Domain-Anbieter korrekt gesetzt ist und auf die  
im Dashboard angezeigte IP zeigt. Die Propagierung kannst du mit [dnschecker.org](https://dnschecker.org) überprüfen.

**Ist das SSL-Zertifikat kostenlos?**  
Ja. SSL-Zertifikate werden automatisch über **Let's Encrypt** (Certbot) ohne Kosten eingerichtet  
und erneuern sich automatisch vor Ablauf.

**Was ist „Gehostetes Bot-Management"?**  
Premium+-Kunden können ihren Bot vollständig von MSK Scripts hosten lassen. Der Bot läuft auf dem MSK-Server und kann komplett über das Dashboard verwaltet werden — Konfigurationsdateien bearbeiten, Bot starten/stoppen/neustarten, Updates einspielen und die Live-Log-Ausgabe in Echtzeit im Browser verfolgen. Melde dich über [Discord](https://discord.gg/5hHSBRHvJE) um ein gehostetes Premium+-Paket zu vereinbaren.
