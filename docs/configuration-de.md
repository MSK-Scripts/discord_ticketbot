# Konfiguration

Der Bot liest `config/config.jsonc` (JSON mit Kommentaren). Jeder Schlüssel ist in [`config/config.example.jsonc`](../config/config.example.jsonc) direkt erklärt; diese Seite ist die Übersicht. Zurück zur [README](../README_GER.md) · [English](configuration-en.md)

Ein Syntaxfehler wird mit Zeile, Spalte und einem Zeiger auf die Stelle gemeldet. Nicht ersetzte Platzhalter halten den Ticket-Ablauf geschlossen, bis sie ausgefüllt sind.

## Oberste Schlüssel

| Schlüssel | Beschreibung |
|---|---|
| `showLog` | INFO-Zeilen in der Konsole zeigen (Warnungen und Fehler immer) |
| `mainColor` | Embed-Farbe und Akzentfarbe des modernen Transkripts, `#rrggbb` |
| `lang` | Sprache des Bots: `en`, `de`, `fr`, `es`, `pt`, `pl`, `hu` |
| `transcriptDesign` | `modern` (Standard) oder `classic` |
| `transcriptLang` | Sprache des Transkripts, dieselben Codes wie `lang`, Rückfall auf Englisch |
| `openTicketChannelId` | Kanal, in den `/setup` das Panel postet |
| `panel` | `interactionType` (`BUTTON` oder `SELECT_MENU`), `autoUpdateOnStart`, `logo`, `banner` (Dateien aus `assets/`, siehe [Panel-Bilder](#panel-bilder)) |
| `ticketTypes` | Bis zu 25 Ticket-Typen, siehe unten |
| `ticketNameOption` | Vorlage für den Kanalnamen: `USERNAME`, `USERID`, `TICKETCOUNT` |
| `claimOption` | `claimButton`, `nameWhenClaimed`, `categoryWhenClaimed` |
| `rolesWhoHaveAccessToTheTickets` | Globale Staff-Rollen, gelten für Typen ohne eigene `staffRoles` |
| `rolesWhoCanNotCreateTickets` | Rollen, die gar keine Tickets öffnen können |
| `pingRoleWhenOpened` · `roleToPingWhenOpenedId` | Rollen beim Öffnen pingen |
| `logs` · `logsChannelId` | Log-Kanal für geschlossene Tickets und Update-Hinweise |
| `updateNotification` | `enabled` (Standard an), `intervalHours` (Standard 1, mindestens 0,25) |
| `closeOption` | Siehe unten |
| `reopenOption` | `enabled`, `button`, `whoCanReopen` (`EVERYONE` oder `STAFFONLY`) |
| `ratingSystem` | `enabled`, `dmUser`, `ratingsChannelId`, `commentRoles` |
| `staffReminder` | `enabled`, `afterHours`, `pingRoles` |
| `autoClose` | `enabled`, `inactiveHours`, `warnBeforeHours`, `excludeClaimed` |
| `maxTicketOpened` | Offene Tickets pro Nutzer, `0` = unbegrenzt |
| `status` | Bot-Status, fester `text` oder `dynamic` mit `{open}`, `{total}`, `{closed}` |
| `userNotifications` | `enabled`: zeigt den Button „Notify me“ in neuen Tickets; höchstens eine DM pro Ticket alle 30 Minuten |

## Ticket-Typen

```jsonc
"ticketTypes": [
  {
    "codeName": "support",            // interne Kennung, nicht ändern, sobald Tickets existieren
    "name": "Support",
    "description": "Allgemeine Fragen",
    "emoji": "🎫",
    "color": "#5eb131",
    "categoryId": "KATEGORIE_ID",
    "priority": "medium",             // low, medium, high, urgent
    "ticketNameOption": "",           // überschreibt die globale Vorlage
    "customDescription": "",
    "cantAccess": [],                 // Rollen, die diesen Typ nicht öffnen können
    "requiredRoles": [],              // leer = alle; sonst wird eine dieser Rollen gebraucht
    "staffRoles": [],                 // leer = globale Staff-Rollen
    "askQuestions": true,
    "questions": [ /* bis zu 5 */ ]
  }
]
```

**`staffRoles` ersetzt die globalen Rollen.** Ein Typ mit eigenen `staffRoles` wird nur von diesen Rollen betreut: Sie sehen den Kanal, können übernehmen, sperren, verschieben und schließen, und die Staff-Erinnerung pingt sie. Die globalen `rolesWhoHaveAccessToTheTickets` wirken bei so einem Ticket nicht. Soll die globale Staff-Rolle Zugriff behalten, gehört sie in die `staffRoles` des Typs. Administratoren haben immer Zugriff.

**`requiredRoles` legt fest, wer einen Typ öffnen darf.** Leer (die Vorgabe) heißt, alle dürfen ihn öffnen. Stehen Rollen drin, braucht ein Mitglied mindestens eine davon, sonst lehnt der Bot mit "Für diese Kategorie brauchst du eine bestimmte Rolle." ab. So lässt sich etwa der Script-Support auf Sponsoren beschränken, während Bestellungen und Rechnungen für alle offen bleiben. `cantAccess` gilt zusätzlich und hat Vorrang: Wer eine gesperrte Rolle hat, kann den Typ nicht öffnen, auch wenn er eine der benötigten Rollen besitzt. Eine Ausnahme für Staff oder Administratoren gibt es nicht. Soll dein Team den Typ selbst öffnen können, gib ihm eine der Rollen. Beim Panel `BUTTON` zeigt die Typ-Auswahl nur die Typen, die das Mitglied öffnen darf; bleibt genau einer übrig, öffnet er direkt. Das Panel `SELECT_MENU` ist für alle gleich, dort erscheint die Ablehnung nach der Auswahl.

## Schließen

```jsonc
"closeOption": {
  "closeButton": true,
  "dmUser": true,               // dem Ersteller beim Schließen eine DM schicken
  "createTranscript": true,
  "transcriptToUser": true,     // false = Transkript nur im Log-Kanal, nicht in der DM
  "askReason": true,
  "whoCanCloseTicket": "EVERYONE",   // oder STAFFONLY
  "closeTicketCategoryId": "KATEGORIE_ID"
}
```

Beide Transkript-Designs zeigen Anzeigenamen statt IDs, im Kopf wer geschlossen hat und mit welchem Grund, und einen Kopier-Button an Codeblöcken. Ohne MSK-API-Key ist das Transkript eine eigenständige HTML-Datei, Avatare, eigene Emojis und Bilder (bis 5 MB) sind eingebettet. Mit Key wird es hochgeladen und als Link geteilt, siehe [Service-Einrichtung](setup-de.md).

## Bewertungen

```jsonc
"ratingSystem": {
  "enabled": true,
  "dmUser": true,               // per DM fragen statt im Kanal
  "ratingsChannelId": "KANAL_ID",
  "commentRoles": []            // wer „Comment Feedback“ nutzen darf; leer = Staff
}
```

## Auto-Close und Staff-Erinnerung

```jsonc
"autoClose":     { "enabled": true, "inactiveHours": 48, "warnBeforeHours": 6, "excludeClaimed": true },
"staffReminder": { "enabled": true, "afterHours": 4, "pingRoles": true }
```

`/autoclose pause` nimmt ein einzelnes Ticket von beidem aus, `/autoclose resume` startet ein frisches Inaktivitätsfenster.

## Textbausteine

Snippets stehen in einer eigenen Datei, `config/snippets.jsonc` (Vorlage: [`snippets.example.jsonc`](../config/snippets.example.jsonc)):

```jsonc
{
  "snippets": [
    {
      "name": "welcome",
      "description": "Begrüßung",
      "content": "Hey {user}! Danke für dein Ticket.",
      "embed": { "title": "👋 Willkommen", "color": "#5865F2" }
    }
  ]
}
```

Platzhalter: `{user}`, `{staff}`, `{type}`, `{priority}`. Befehle: `/snippet send <name>`, `/snippet list`, mit Autovervollständigung.

## Geheimnisse und Umgebung

Tokens, der MSK-API-Key, Datenbank-Zugangsdaten und Dashboard-Secrets gehören in die `.env`, nie in die `config.jsonc`. Siehe [Installation](installation-de.md) und [Dashboard](dashboard-de.md).

## Panel-Bilder

`panel.logo.file` und `panel.banner.file` nennen eine Datei in `assets/`. Dein eigenes Logo oder Banner legst du dort ab, etwa als `assets/logo.png` oder `assets/banner.png`. Liegt die Datei nicht in `assets/`, sucht der Bot in `assets/default/`. Dort liegt das MSK-Logo, `"file": "logo.png"` zeigt also das MSK-Logo, bis du ein eigenes ablegst. Bilder, die du in `assets/` ablegst, ignoriert git, und die Update-Routine legt ein ersetztes `assets/logo.png` beiseite und stellt es danach zurück. Deine Bilder blockieren also kein Update.

Ohne Zugriff auf die Dateien des Servers (ein gehosteter Bot) lädst du Logo oder Banner stattdessen im Dashboard hoch: **Konfiguration**, Abschnitt *Ticket Panel*. Das Dashboard prüft und wandelt das Bild um, legt es unter einem erzeugten Namen wie `custom-logo-3f2a9c1e5b7d4a60.png` in `assets/` ab und trägt diesen Namen in `panel.logo.file` beziehungsweise `panel.banner.file` ein. Aus SVG wird PNG. Das Größenlimit (`ASSET_UPLOAD_MAX_MB`, Vorgabe 5 MB) und der optionale Virenscan mit ClamAV (`CLAMAV_SOCKET` oder `CLAMAV_HOST`/`CLAMAV_PORT`) stehen in der `.env`, siehe [Panel-Bilder im Dashboard](dashboard-de.md#panel-bilder).

Ein Dateiname muss innerhalb von `assets/` bleiben: ein Name wie `../.env` wird ignoriert.

## Texte anpassen

Einen Text des Bots änderst du im Dashboard (Konfiguration, Reiter der Locale-Datei) oder trägst ihn selbst in `locales/custom/<lang>.json` ein. Diese Datei enthält nur die Texte, die du änderst, im selben Aufbau wie `locales/<lang>.json`:

```json
{ "buttons": { "openTicket": "Support kontaktieren" } }
```

Beim Start liest der Bot `locales/<lang>.json` und legt deine Datei darüber. Deine Texte gewinnen, alles andere kommt aus der mitgelieferten Datei, neue Texte aus einem Update erscheinen also von selbst. `locales/<lang>.json` selbst bitte nicht bearbeiten, ein Update ersetzt sie. `locales/custom/` ignoriert git. Eine fehlerhafte eigene Datei erzeugt nur eine Warnung im Log, der Bot nimmt dann die mitgelieferten Texte.

Texte, die mit einer älteren Version in `locales/<lang>.json` geändert wurden, wandern beim nächsten `npm run update` oder Update aus dem Dashboard von selbst nach `locales/custom/`. Die bearbeitete Datei bleibt als `locales/<lang>.json.pre-custom-layer` erhalten.

## Eine Sprache hinzufügen

1. `locales/en.json` nach `locales/<code>.json` kopieren, etwa `locales/it.json`.
2. Alle Texte übersetzen, auch den Block `transcript`.
3. In der `config.jsonc` `"lang": "it"` (und `"transcriptLang": "it"`) setzen.

Fehlende Schlüssel erscheinen als ihr Pfad (etwa `messages.foo`), Lücken fallen also sofort auf. Pull Requests mit neuen Sprachen sind willkommen, siehe [CONTRIBUTING](../CONTRIBUTING.md).
