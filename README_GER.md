# 🎫 Discord Ticket Bot

Ein moderner, selbst-gehosteter Discord-Ticket-Bot auf Basis von **Discord.js v14** und **SQLite** — ohne externe Datenbank, ohne Telemetrie, mit vollem Feature-Umfang.

---

## ✨ Features

| Feature | Beschreibung |
|---|---|
| 🎫 Ticket-Typen | Bis zu 25 konfigurierbare Typen mit eigenem Emoji, Farbe, Kategorie & Fragen |
| 📋 Fragebögen | Modale Formulare (bis zu 5 Fragen) bei Ticket-Erstellung |
| 🙋 Claim-System | Staff kann Tickets beanspruchen & freigeben — benennt Kanal um und aktualisiert Topic |
| 🔴 Prioritäten | Low / Medium / High / Urgent per `/priority` — wird im Channel-Topic angezeigt |
| 📝 Staff-Notizen | Private Notizen per `/note add` / `/note list` |
| 🔀 Ticket verschieben | Per `/move` oder Button in einen anderen Typ/Kategorie verschieben (Staff only) |
| 🛡️ Typ-spezifische Staff-Rollen | Jeder Ticket-Typ kann eigene Staff-Rollen haben |
| 🖼️ Panel-Banner | Optionales Banner-Bild im Ticket-Panel, konfigurierbar in der Config |
| ⭐ Bewertungssystem | 1–5 Sterne Feedback nach Schließung, automatisch in konfigurierten Channel gepostet |
| ⏰ Staff-Erinnerung | Automatischer Ping im Ticket wenn kein Staff nach X Stunden antwortet |
| ⏰ Auto-Close | Inaktive Tickets automatisch schließen mit Warn-Vorlauf (konfigurierbar) |
| 📄 HTML-Transcript | Vollständiges HTML-Transcript — an Log-Channel und per DM an den Ersteller |
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
├── assets/                     # Statische Dateien (Panel-Banner, etc.)
│   └── banner.png              # Beispiel-Banner (eigenes Bild hier ablegen)
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
    │   ├── priority.js         # /priority   – Priorität setzen (Topic)
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
        └── ticketActions.js    # Kernlogik: openTicket, performClose, performMove, updateChannelTopic
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
sudo cp -r discord_ticketbot /opt/discord_ticketbot
sudo useradd -r -s /bin/false discord
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
sudo systemctl status ticketbot.service
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
| `/claim` | Staff | Ticket beanspruchen (Kanal umbenennen + Topic aktualisieren) |
| `/unclaim` | Staff | Ticket freigeben (Name wiederherstellen + Topic aktualisieren) |
| `/move` | Staff | Ticket in anderen Typ/Kategorie verschieben |
| `/add <nutzer>` | Staff | Nutzer zum Ticket hinzufügen |
| `/remove <nutzer>` | Staff | Nutzer aus Ticket entfernen |
| `/rename <n>` | Staff | Kanal umbenennen |
| `/transcript` | Staff | HTML-Transcript generieren |
| `/priority <stufe>` | Staff | Priorität setzen (Channel-Topic aktualisieren) |
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
| 🔒 Ticket schließen | Immer (konfigurierbar) | Deaktiviert alle Buttons, erstellt Transcript, schließt Ticket |
| 🙋 Beanspruchen | `claimButton: true` | Staff beansprucht Ticket — Kanal umbenennen + Topic aktualisieren |
| 🔀 Verschieben | Mehr als 1 Ticket-Typ | Staff öffnet Typ-Auswahl (nur Staff) |
| 🗑️ Ticket löschen | Nach Schließung | Löscht den Kanal nach Bestätigung |

---

## 🛠️ Konfigurationsreferenz

### Panel-Banner

Ein optionales Bild kann am unteren Ende des Ticket-Panel-Embeds angezeigt werden.

```jsonc
"panel": {
  "banner": {
    "enabled": true,        // true = Banner anzeigen
    "file": "banner.png"    // Dateiname im assets/-Ordner
  }
}
```

Bild (PNG, JPG, GIF oder WEBP) in den `assets/`-Ordner legen und `/setup` erneut ausführen. Falls die Datei nicht gefunden wird, loggt der Bot eine Warnung und sendet das Panel ohne Banner.

### Priorität & Channel-Topic

`/priority` benennt den Kanal **nicht** um — stattdessen wird das **Channel-Topic** aktualisiert, das kein Rate-Limit hat. Das Topic wird auch beim Claim/Unclaim automatisch angepasst.

| Zustand | Kanalname | Channel-Topic |
|---|---|---|
| Ticket geöffnet | `ticket-maxmuster` | `🟡 Mittel` |
| `/priority urgent` | `ticket-maxmuster` | `🔴 Dringend` |
| `/claim` | `✔️ ticket-maxmuster` | `🟡 Mittel \| 🙋 Claimed by @Staff` |
| `/unclaim` | `ticket-maxmuster` | `🟡 Mittel` |

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

**Hinweis zu `TICKETCOUNT`:** Globaler, fortlaufender Zähler über alle Tickets des Servers — setzt sich nie zurück, auch nicht wenn Tickets geschlossen werden. Jedes neue Ticket bekommt immer eine höhere Nummer als das vorherige.

### Typ-spezifische Staff-Rollen (`staffRoles`)

Jeder Ticket-Typ kann eigene Staff-Rollen definieren, die steuern wer das Ticket sehen, verwalten und beanspruchen darf.

```jsonc
// Nur Entwickler können "Bug Report"-Tickets sehen:
{ "codeName": "bugreport", "staffRoles": ["ROLE_ID_DEVELOPER"] }

// Leer lassen → globale rolesWhoHaveAccessToTheTickets werden verwendet:
{ "codeName": "support", "staffRoles": [] }
```

Beim Verschieben eines Tickets (`/move`) werden die Berechtigungen automatisch auf den neuen Typ angepasst. Beim Ping bei Ticket-Öffnung werden die typ-spezifischen Rollen anstelle der globalen gepingt.

### Staff-Erinnerung

```jsonc
"staffReminder": {
  "enabled": true,
  "afterHours": 4,     // Erinnerung nach X Stunden ohne Nachricht
  "pingRoles": true    // Ob die Staff-Rollen des Ticket-Typs gepingt werden
}
```

Der Bot prüft alle **15 Minuten** offene Tickets. Jedes Ticket wird dabei **nur einmal** erinnert — kein Spam.

### Bewertungssystem

```jsonc
"ratingSystem": {
  "enabled": true,
  "dmUser": true,
  "ratingsChannelId": "CHANNEL_ID_HERE"   // Channel für automatische Bewertungs-Posts
}
```

Nach dem Schließen erhält der Nutzer eine 1–5 ⭐ Bewertungsanfrage per DM. Sobald er bewertet, wird das Ergebnis automatisch in `ratingsChannelId` gepostet.

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

`/stats` zeigt server-weite Zahlen. `/stats @nutzer` zeigt ein detailliertes Profil in zwei Sektionen — **👤 Als Nutzer** (Tickets eröffnet, häufigster Typ, Ø Bewertung vergeben) und **🛡️ Als Staff** (Tickets geschlossen & beansprucht, Ø Bewertung erhalten — nur sichtbar wenn vorhanden).

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
