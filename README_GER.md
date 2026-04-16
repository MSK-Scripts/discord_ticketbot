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

### Ticket verschieben (`/move` & Button)

Wenn mehr als ein Ticket-Typ konfiguriert ist, erscheint automatisch ein **🔀 Verschieben**-Button in jedem Ticket. Nur Staff kann ihn nutzen. Der Button und der `/move`-Command öffnen ein Auswahlmenü mit allen anderen verfügbaren Typen. Nach der Auswahl wird der Kanal in die neue Kategorie verschoben, Berechtigungen werden angepasst und eine Nachricht im Ticket gepostet.

### Staff-Erinnerung

```jsonc
"staffReminder": {
  "enabled": true,
  "afterHours": 4,     // Erinnerung nach X Stunden ohne Nachricht
  "pingRoles": true    // Ob die konfigurierten Staff-Rollen gepingt werden
}
```

Der Bot prüft alle **15 Minuten** offene Tickets. Sobald ein Ticket `afterHours` Stunden keine Aktivität hatte und noch keine Erinnerung gesendet wurde, postet er eine Nachricht im Ticket-Kanal. Jedes Ticket wird dabei **nur einmal** erinnert — kein Spam.

### Bewertungssystem

```jsonc
"ratingSystem": {
  "enabled": true,
  "dmUser": true,                          // Bewertungsanfrage per DM senden
  "ratingsChannelId": "CHANNEL_ID_HERE"   // Channel für automatische Bewertungs-Posts
}
```

Nach dem Schließen erhält der Nutzer eine 1–5 ⭐ Bewertungsanfrage (per DM oder im Ticket). Sobald er bewertet, wird das Ergebnis automatisch in `ratingsChannelId` gepostet.

### Auto-Close

```jsonc
"autoClose": {
  "enabled": true,
  "inactiveHours": 48,       // Schließen nach N Stunden ohne Aktivität
  "warnBeforeHours": 6,      // Warnung N Stunden vorher senden
  "excludeClaimed": true     // Beanspruchte Tickets ausschließen
}
```

### Statistiken

`/stats` zeigt server-weite Zahlen. `/stats @nutzer` zeigt ein detailliertes Profil:

**👤 Als Nutzer**
- Tickets eröffnet (gesamt, offen, geschlossen)
- Häufigster genutzter Ticket-Typ
- Durchschnittliche Bewertung die der Nutzer selbst vergeben hat

**🛡️ Als Staff** *(nur sichtbar wenn vorhanden)*
- Tickets geschlossen & beansprucht
- Durchschnittliche Bewertung die der Staff für seine geschlossenen Tickets erhalten hat

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

AGPL-3.0
