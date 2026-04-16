# 🎫 Discord Ticket Bot

Ein moderner, selbst-gehosteter Discord-Ticket-Bot auf Basis von **Discord.js v14** und **SQLite** — ohne externe Datenbank, ohne Telemetrie, mit vollem Feature-Umfang.

---

## ✨ Features

| Feature | Beschreibung |
|---|---|
| 🎫 Ticket-Typen | Bis zu 25 konfigurierbare Typen mit eigenem Emoji, Farbe, Kategorie & Fragen |
| 📋 Fragebögen | Modale Formulare (bis zu 5 Fragen) bei Ticket-Erstellung |
| 🙋 Claim-System | Staff kann Tickets beanspruchen & freigeben |
| 🔴 Prioritäten | Low / Medium / High / Urgent per `/priority` oder Button |
| 📝 Staff-Notizen | Private Notizen per `/note add` / `/note list` |
| 🔀 Ticket verschieben | Per `/move` oder Button in einen anderen Typ/Kategorie verschieben (Staff only) |
| 🛡️ Typ-spezifische Staff-Rollen | Jeder Ticket-Typ kann eigene Staff-Rollen haben |
| ⭐ Bewertungssystem | 1–5 Sterne Feedback nach Schließung, automatisch in konfigurierten Channel gepostet |
| ⏰ Staff-Erinnerung | Automatischer Ping im Ticket wenn kein Staff nach X Stunden antwortet |
| ⏰ Auto-Close | Inaktive Tickets automatisch schließen mit Warn-Vorlauf (konfigurierbar) |
| 📄 HTML-Transcript | Vollständiges, schön gestaltetes HTML-Transcript lokal als Datei-Attachment |
| 📊 Statistiken | Server-weite Stats sowie detaillierte Per-Nutzer-Stats per `/stats` |
| 🚫 Blacklist | `/blacklist add/remove/list` zum Sperren von Nutzern |
| 🌍 Mehrsprachig | Deutsch und Englisch enthalten, leicht erweiterbar |
| 🗄️ SQLite | Keine externe Datenbank nötig — Datei wird automatisch erstellt |

---

## 📁 Projektstruktur

```
discord_ticketbot/
├── index.js                    # Einstiegspunkt
├── package.json
├── .env.example                # Vorlage für Umgebungsvariablen
├── ticketbot.service           # systemd-Unit-Datei für Linux-Server
├── config/
│   └── config.example.jsonc    # Konfigurationsvorlage (mit Kommentaren)
├── locales/
│   ├── de.json                 # Deutsch
│   └── en.json                 # Englisch
├── data/
│   └── tickets.db              # SQLite-Datenbank (auto-erstellt)
└── src/
    ├── client.js               # Erweiterter Discord Client
    ├── config.js               # Config-Loader & Validierung
    ├── database.js             # Alle DB-Operationen (SQLite)
    ├── handlers/
    │   ├── commandHandler.js   # Lädt & registriert Slash Commands
    │   ├── eventHandler.js     # Lädt Discord-Events
    │   └── componentHandler.js # Lädt Buttons, Modals, Menus
    ├── commands/               # Slash Commands
    │   ├── setup.js            # /setup      – Panel senden
    │   ├── close.js            # /close      – Ticket schließen
    │   ├── add.js              # /add        – Nutzer hinzufügen
    │   ├── remove.js           # /remove     – Nutzer entfernen
    │   ├── claim.js            # /claim      – Ticket beanspruchen
    │   ├── unclaim.js          # /unclaim    – Ticket freigeben
    │   ├── move.js             # /move       – Ticket verschieben
    │   ├── rename.js           # /rename     – Kanal umbenennen
    │   ├── transcript.js       # /transcript – HTML-Transcript
    │   ├── priority.js         # /priority   – Priorität setzen
    │   ├── note.js             # /note       – Staff-Notizen
    │   ├── blacklist.js        # /blacklist  – Nutzer sperren
    │   └── stats.js            # /stats      – Statistiken (Server & Nutzer)
    ├── events/
    │   ├── ready.js            # Bot-Start, Status, Auto-Close & Staff-Reminder Loop
    │   ├── messageCreate.js    # Letzte Aktivität tracken
    │   └── interactionCreate.js # Routing aller Interaktionen
    ├── components/
    │   ├── buttons/
    │   │   ├── openTicket.js       # tb_open
    │   │   ├── closeTicket.js      # tb_close
    │   │   ├── claimTicket.js      # tb_claim
    │   │   ├── moveTicket.js       # tb_move       (öffnet Typ-Auswahl)
    │   │   ├── deleteTicket.js     # tb_delete     (Bestätigungsschritt)
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
        ├── logger.js           # Farbiger Console-Logger
        ├── embeds.js           # Alle Embed-Konstruktoren
        ├── transcript.js       # HTML-Transcript-Generator
        └── ticketActions.js    # Kernlogik: openTicket, performClose, performMove
```

---

## 🚀 Installation

### Voraussetzungen
- **Node.js** v18 oder neuer
- Ein Discord Bot Token (https://discord.com/developers/applications)

### 1. Abhängigkeiten installieren

```bash
cd discord_ticketbot
npm install
```

### 2. Umgebungsvariablen einrichten

```bash
cp .env.example .env
```

`.env` ausfüllen:
```env
TOKEN=dein_bot_token
CLIENT_ID=deine_application_id
GUILD_ID=deine_server_id
```

### 3. Konfiguration einrichten

```bash
cp config/config.example.jsonc config/config.jsonc
```

`config/config.jsonc` nach Bedarf anpassen — alle Felder sind kommentiert.

### 4. Bot starten

```bash
npm start
```

Beim ersten Start werden automatisch:
- Die SQLite-Datenbank in `data/tickets.db` angelegt
- Alle Slash Commands auf deinem Server registriert

### 5. Panel einrichten

`/setup` auf deinem Discord-Server ausführen (Administrator-Berechtigung erforderlich). Der Bot sendet das Ticket-Panel in den konfigurierten Kanal.

---

## 🖥️ Autostart mit systemd (Linux-Server)

Damit der Bot nach einem Server-Neustart automatisch startet, kann die mitgelieferte `ticketbot.service`-Datei verwendet werden.

### 1. Bot-Dateien auf den Server kopieren

```bash
# Projektordner nach /opt kopieren
sudo cp -r discord_ticketbot /opt/discord_ticketbot

# Eigenen Systembenutzer anlegen (empfohlen, niemals als root laufen lassen)
sudo useradd -r -s /bin/false discord

# Berechtigungen setzen
sudo chown -R discord:discord /opt/discord_ticketbot
```

### 2. .env auf dem Server einrichten

```bash
sudo nano /opt/discord_ticketbot/.env
```

### 3. Node.js-Pfad prüfen

```bash
which node
# Ausgabe z.B.: /usr/bin/node
```

Falls der Pfad abweicht, `ExecStart` in der `ticketbot.service`-Datei entsprechend anpassen.

### 4. systemd-Unit installieren

```bash
sudo cp /opt/discord_ticketbot/ticketbot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ticketbot.service
```

### 5. Status prüfen

```bash
# Aktuellen Status anzeigen
sudo systemctl status ticketbot.service

# Live-Logs verfolgen
sudo journalctl -u ticketbot.service -f
```

### Nützliche Befehle

| Befehl | Beschreibung |
|---|---|
| `sudo systemctl start ticketbot.service` | Bot starten |
| `sudo systemctl stop ticketbot.service` | Bot stoppen |
| `sudo systemctl restart ticketbot.service` | Bot neu starten |
| `sudo systemctl enable ticketbot.service` | Autostart aktivieren |
| `sudo systemctl disable ticketbot.service` | Autostart deaktivieren |
| `sudo journalctl -u ticketbot.service -f` | Live-Logs anzeigen |

---

## ⚙️ Slash Commands

| Command | Berechtigung | Beschreibung |
|---|---|---|
| `/setup` | Administrator | Ticket-Panel senden |
| `/close [grund]` | Konfigurierbar | Ticket schließen |
| `/claim` | Staff | Ticket beanspruchen |
| `/unclaim` | Staff | Ticket freigeben |
| `/move` | Staff | Ticket in anderen Typ/Kategorie verschieben |
| `/add <nutzer>` | Staff | Nutzer zum Ticket hinzufügen |
| `/remove <nutzer>` | Staff | Nutzer aus Ticket entfernen |
| `/rename <n>` | Staff | Kanal umbenennen |
| `/transcript` | Staff | HTML-Transcript generieren |
| `/priority <stufe>` | Staff | Priorität setzen |
| `/note add <text>` | Staff | Notiz hinzufügen |
| `/note list` | Staff | Alle Notizen anzeigen |
| `/stats` | Staff | Server-weite Ticket-Statistiken |
| `/stats @nutzer` | Staff | Detaillierte Statistiken für einen Nutzer |
| `/blacklist add` | Manage Guild | Nutzer sperren |
| `/blacklist remove` | Manage Guild | Nutzer entsperren |
| `/blacklist list` | Manage Guild | Blacklist anzeigen |

---

## 🔘 Ticket-Buttons

Jedes Ticket enthält eine Button-Leiste direkt im Kanal:

| Button | Sichtbar wenn | Beschreibung |
|---|---|---|
| 🔒 Ticket schließen | Immer (konfigurierbar) | Öffnet Grund-Modal oder schließt direkt |
| 🙋 Beanspruchen | `claimButton: true` | Staff beansprucht das Ticket |
| 🔀 Verschieben | Mehr als 1 Ticket-Typ | Staff öffnet Typ-Auswahl (nur Staff) |
| 🗑️ Ticket löschen | Nach Schließung | Löscht den Kanal nach Bestätigung |

---

## 🛠️ Konfigurationsreferenz

### Ticket-Typen

```jsonc
{
  "codeName": "support",          // Eindeutiger Bezeichner (Kleinbuchstaben)
  "name": "Support",              // Anzeigename im Menü
  "description": "...",           // Beschreibung im Auswahlmenü
  "emoji": "💡",
  "color": "#ff0000",             // Farbe oder "" für mainColor
  "categoryId": "123456789",      // Discord-Kategorie-ID
  "ticketNameOption": "",         // Kanalname: USERNAME, USERID, TICKETCOUNT
  "customDescription": "...",     // Variablen: REASON1, REASON2, USERNAME, USERID
  "cantAccess": ["roleId"],       // Rollen ohne Zugriff auf diesen Typ
  "staffRoles": [],               // Typ-spezifische Staff-Rollen (siehe unten)
  "askQuestions": true,
  "questions": [
    {
      "label": "Frage",
      "placeholder": "Beispiel...",
      "style": "SHORT",           // SHORT oder PARAGRAPH
      "maxLength": 500
    }
  ]
}
```

### Typ-spezifische Staff-Rollen (`staffRoles`)

Jeder Ticket-Typ kann eigene Staff-Rollen definieren. Diese steuern wer das Ticket sehen, bearbeiten und beanspruchen darf.

```jsonc
// Nur Entwickler können "Bug Report"-Tickets sehen:
{
  "codeName": "bugreport",
  "staffRoles": ["ROLE_ID_DEVELOPER"]
}

// Nur Partner-Manager können "Partnership"-Tickets sehen:
{
  "codeName": "partner",
  "staffRoles": ["ROLE_ID_PARTNER_MANAGER"]
}

// Leer lassen → globale rolesWhoHaveAccessToTheTickets werden verwendet:
{
  "codeName": "support",
  "staffRoles": []
}
```

**Verhalten:**
- Ist `staffRoles` gesetzt und nicht leer → nur diese Rollen haben Zugriff auf den Kanal
- Ist `staffRoles` leer oder nicht vorhanden → die globalen `rolesWhoHaveAccessToTheTickets` werden verwendet
- Beim Verschieben eines Tickets (`/move`) werden die Berechtigungen automatisch auf den neuen Typ angepasst
- Beim Ping bei Ticket-Öffnung werden ebenfalls die typ-spezifischen Rollen anstelle der globalen gepingt

### Ticket verschieben (`/move` & Button)

Wenn mehr als ein Ticket-Typ konfiguriert ist, erscheint automatisch ein **🔀 Verschieben**-Button in jedem Ticket. Nur Staff kann ihn nutzen. Der Button und der `/move`-Command öffnen ein Auswahlmenü mit allen anderen verfügbaren Typen. Nach der Auswahl wird der Kanal in die neue Kategorie verschoben, Berechtigungen (inkl. `staffRoles`) werden angepasst und eine Nachricht im Ticket gepostet.

### Staff-Erinnerung

```jsonc
"staffReminder": {
  "enabled": true,
  "afterHours": 4,     // Erinnerung nach X Stunden ohne Nachricht
  "pingRoles": true    // Ob die Staff-Rollen des Ticket-Typs gepingt werden
}
```

Der Bot prüft alle **15 Minuten** offene Tickets. Sobald ein Ticket `afterHours` Stunden keine Aktivität hatte und noch keine Erinnerung gesendet wurde, postet er eine Nachricht im Ticket-Kanal. Jedes Ticket wird dabei **nur einmal** erinnert — kein Spam.

### Bewertungssystem

```jsonc
"ratingSystem": {
  "enabled": true,
  "dmUser": true,
  "ratingsChannelId": "CHANNEL_ID_HERE"
}
```

Nach dem Schließen erhält der Nutzer eine 1–5 ⭐ Bewertungsanfrage (per DM oder im Ticket). Sobald er bewertet, wird das Ergebnis automatisch in `ratingsChannelId` gepostet.

### Auto-Close

```jsonc
"autoClose": {
  "enabled": true,
  "inactiveHours": 48,
  "warnBeforeHours": 6,
  "excludeClaimed": true
}
```

### Statistiken

`/stats` zeigt server-weite Zahlen. `/stats @nutzer` zeigt ein detailliertes Profil:

**👤 Als Nutzer** — Tickets eröffnet, häufigster Typ, Ø Bewertung vergeben

**🛡️ Als Staff** *(nur sichtbar wenn vorhanden)* — Tickets geschlossen & beansprucht, Ø Bewertung erhalten

---

## 🗄️ Datenbank-Schema

Die SQLite-Datenbank wird automatisch in `data/tickets.db` erstellt. Bestehende Datenbanken werden bei fehlenden Spalten automatisch migriert.

| Tabelle | Inhalt |
|---|---|
| `tickets` | Alle Tickets: Status, Typ, Priorität, Claim-Info, Erinnerung, Transcript |
| `blacklist` | Gesperrte Nutzer mit Grund und Zeitstempel |
| `staff_notes` | Private Staff-Notizen pro Ticket |
| `ratings` | Bewertungen (1–5 ⭐) mit optionalem Kommentar |

---

## 🌍 Neue Sprache hinzufügen

1. `locales/de.json` kopieren, z.B. als `locales/fr.json`
2. Alle Texte übersetzen
3. In `config/config.jsonc` `"lang": "fr"` setzen

---

## 📝 Lizenz

AGPL-3.0 — Quellcode muss bei Weitergabe oder Hosting offen bleiben und unter der gleichen Lizenz veröffentlicht werden.
