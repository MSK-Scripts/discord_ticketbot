# Funktionen und Befehle

Was der Bot kann, alle Slash-Befehle und alle Buttons. Zurück zur [README](../README_GER.md) · [English](features-en.md)

## Funktionen

| Funktion | Beschreibung |
|---|---|
| 🎫 Ticket-Typen | Bis zu 25 Typen, jeder mit eigenem Emoji, Farbe, Kategorie, Staff-Rollen, Start-Priorität und Fragen |
| 📋 Fragebögen | Bis zu 5 Fragen in einem Formular beim Öffnen. Die Antworten stehen im Ticket und im Transkript |
| 🎛️ Panel | Button oder Auswahlmenü, optional mit Logo und Banner. Das `/setup`-Panel aktualisiert sich bei jedem Start selbst |
| 🙋 Claim-System | Übernehmen und Freigeben per Button oder Befehl, Embed und Kanalthema passen sich an |
| 🔴 Prioritäten | Low, Medium, High, Urgent. Pro Ticket-Typ vorgegeben oder per `/priority` |
| 🛡️ Staff pro Typ | Ein Ticket-Typ mit eigenen `staffRoles` wird nur von diesen Rollen betreut, beim Kanalzugriff und bei jeder Staff-Aktion |
| 🚧 Sperren beim Öffnen | Gesperrte Rollen, `cantAccess` pro Typ, eine Blacklist und ein Limit offener Tickets pro Nutzer, das sich nicht umgehen lässt |
| 📝 Staff-Notizen | Private Notizen pro Ticket mit `/note` |
| 🔀 Ticket verschieben | In einen anderen Typ und dessen Kategorie, mit den passenden Rechten |
| 🔒 Sperren | Ticket sperren, Ersteller und hinzugefügte Nutzer können nicht mehr schreiben |
| ♻️ Wieder öffnen | Geschlossenes Ticket per Button oder `/reopen` wieder öffnen, Zugriff und Kategorie werden wiederhergestellt |
| ⏰ Auto-Close | Schließt inaktive Tickets nach einer Warnung, pro Ticket pausierbar mit `/autoclose` |
| ⏰ Staff-Erinnerung | Pingt die Staff-Rollen des Tickets, wenn nach X Stunden niemand geantwortet hat |
| ⭐ Bewertungen | 1 bis 5 Sterne mit optionalem Kommentar, gepostet mit Ticket-Kategorie und Avatar des Nutzers. Das Team kann über das Kontextmenü **Comment Feedback** darauf antworten |
| 📄 HTML-Transkripte | Eigenständiges HTML im Design **modern** oder **classic**. Avatare, eigene Emojis und ohne API-Key auch die Bilder sind eingebettet, die Datei funktioniert also offline |
| 🔗 Gehostete Transkripte | Mit einem MSK-API-Key wird das Transkript hochgeladen und als Link geteilt, auf Wunsch unter eigener Domain. Siehe [Service-Einrichtung](setup-de.md) |
| 💬 Textbausteine | Snippets mit Platzhaltern und Autovervollständigung, definiert in `snippets.jsonc` |
| 📢 Broadcast | Eine Nachricht an alle offenen Tickets |
| 🔔 Benachrichtigungen | Optionaler Button „Notify me“, der Ersteller bekommt eine DM, wenn das Team antwortet |
| 📊 Statistiken | Für den Server und pro Nutzer mit `/stats` |
| 🎮 Dynamischer Status | Zeigt die Zahl offener Tickets im Bot-Status |
| 🌍 Sieben Sprachen | Englisch, Deutsch, Französisch, Spanisch, Portugiesisch, Polnisch und Ungarisch, für den Bot und das Transkript |
| 🗄️ Flexible Datenbank | SQLite ohne Einrichtung, optional MySQL, MariaDB oder PostgreSQL, mit Migrationsskript |
| 🔄 Update-Hinweis | Prüft beim Start die GitHub-Releases und meldet neue Versionen im Log-Kanal |
| 🖥️ Web-Dashboard | Optionales Browser-Dashboard: Tickets, Statistiken, Config-Editor, Bot-Steuerung, Rechte und ein Portal für Endnutzer. Siehe [Dashboard](dashboard-de.md) |
| 🐳 Docker | Offizielle Images für `linux/amd64` und `linux/arm64` |

## Slash-Befehle

| Befehl | Wer | Beschreibung |
|---|---|---|
| `/setup` | Administrator | Ticket-Panel in `openTicketChannelId` senden |
| `/close [reason]` | `closeOption.whoCanCloseTicket` | Aktuelles Ticket schließen |
| `/reopen` | `reopenOption.whoCanReopen` | Geschlossenes Ticket wieder öffnen |
| `/claim` · `/unclaim` | Staff | Ticket übernehmen oder freigeben |
| `/move` | Staff | Ticket in einen anderen Typ verschieben |
| `/add <user>` · `/remove <user>` | Staff | Nutzer hinzufügen oder entfernen |
| `/rename <name>` | Staff | Ticket-Kanal umbenennen |
| `/priority <level>` | Staff | low, medium, high oder urgent setzen |
| `/note add <text>` · `/note list` | Staff | Private Staff-Notizen |
| `/lock lock [reason]` · `/lock unlock` | Staff | Ticket sperren oder entsperren |
| `/autoclose pause` · `/autoclose resume` | Staff | Auto-Close und Staff-Erinnerung für dieses Ticket pausieren oder fortsetzen |
| `/transcript` | Staff | HTML-Transkript sofort erzeugen |
| `/snippet send <name>` · `/snippet list` | Staff | Textbaustein senden oder auflisten |
| `/broadcast <message> [type] [embed]` | Staff | Nachricht an alle offenen Tickets |
| `/blacklist add/remove/list` | Server verwalten | Blacklist pflegen |
| `/stats [user]` | Staff | Statistiken für den Server oder einen Nutzer |

„Staff“ heißt: die Staff-Rollen des Ticket-Typs, bei Typen ohne eigene die globalen `rolesWhoHaveAccessToTheTickets`. Administratoren zählen immer als Staff. `/setup` und `/blacklist` bringen eine Standard-Berechtigung mit, die der Server-Admin unter *Servereinstellungen → Integrationen* erweitern kann.

### Kontextmenü

| Eintrag | Ziel | Wer | Beschreibung |
|---|---|---|---|
| **Comment Feedback** | Eine gepostete Bewertung (Rechtsklick → Apps) | `ratingSystem.commentRoles`, sonst Staff | Fügt einen Team-Kommentar ins Bewertungs-Embed ein. Ein zweiter Kommentar derselben Person ersetzt den ersten |

## Buttons

| Button | Sichtbar wenn | Beschreibung |
|---|---|---|
| 🔒 Schließen | `closeOption.closeButton` | Ticket schließen, optional mit Grund |
| 🙋 Claim / 🙌 Unclaim | `claimOption.claimButton` | Wechselt zwischen beiden |
| 🔀 Verschieben | Mehr als ein Ticket-Typ | Neuen Typ wählen |
| 🔕 Notify me | `userNotifications.enabled` | Ersteller meldet sich für DM-Benachrichtigungen an |
| 🗑️ Löschen | Nach dem Schließen | Kanal nach Bestätigung löschen |
| ♻️ Wieder öffnen | Nach dem Schließen, `reopenOption.button` | Ticket wieder öffnen |
| ⭐ 1 bis 5 | Bewertungsanfrage nach dem Schließen | Nur der Ersteller kann bewerten |

## Zustände des Kanals

| Zustand | Kanalname | Kanalthema |
|---|---|---|
| Geöffnet | `ticket-username` | `🟡 Medium` |
| `/priority urgent` | unverändert | `🔴 Urgent` |
| Übernommen | nach `claimOption.nameWhenClaimed` | `🟡 Medium \| 🙋 Claimed by @Staff` |
| Gesperrt | unverändert | unverändert, Hinweis im Kanal |
| Geschlossen | `closed-ticket-username` | unverändert, Buttons deaktiviert |
| Wieder geöffnet | `ticket-username` | wiederhergestellt, Ticket-Buttons neu gepostet |

Discord erlaubt zwei Umbenennungen pro Kanal in 10 Minuten. Wird dasselbe Ticket mehrmals hintereinander geschlossen und wieder geöffnet, kann der Name ein paar Minuten auf `closed-…` stehen bleiben; das korrigiert sich von selbst.
