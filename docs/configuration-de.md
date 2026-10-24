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
| `panel` | `interactionType` (`BUTTON` oder `SELECT_MENU`), `autoUpdateOnStart`, `logo`, `banner` (Dateien aus `assets/`) |
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
    "staffRoles": [],                 // leer = globale Staff-Rollen
    "askQuestions": true,
    "questions": [ /* bis zu 5 */ ]
  }
]
```

**`staffRoles` ersetzt die globalen Rollen.** Ein Typ mit eigenen `staffRoles` wird nur von diesen Rollen betreut: Sie sehen den Kanal, können übernehmen, sperren, verschieben und schließen, und die Staff-Erinnerung pingt sie. Die globalen `rolesWhoHaveAccessToTheTickets` wirken bei so einem Ticket nicht. Soll die globale Staff-Rolle Zugriff behalten, gehört sie in die `staffRoles` des Typs. Administratoren haben immer Zugriff.

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

## Eine Sprache hinzufügen

1. `locales/en.json` nach `locales/<code>.json` kopieren, etwa `locales/it.json`.
2. Alle Texte übersetzen, auch den Block `transcript`.
3. In der `config.jsonc` `"lang": "it"` (und `"transcriptLang": "it"`) setzen.

Fehlende Schlüssel erscheinen als ihr Pfad (etwa `messages.foo`), Lücken fallen also sofort auf. Pull Requests mit neuen Sprachen sind willkommen, siehe [CONTRIBUTING](../CONTRIBUTING.md).
