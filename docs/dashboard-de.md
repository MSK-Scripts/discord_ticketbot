# Web-Dashboard

*[English version: dashboard-en.md](dashboard-en.md)*

Verwalte Tickets, Statistiken und die Bot-Konfiguration im Browser, statt Dateien
über SSH zu bearbeiten.

Das Dashboard ist **optional und standardmäßig deaktiviert**. Wenn du es nie
aktivierst, ändert sich an deinem Bot nichts.

---

## Was es kann

| Bereich | Was du bekommst |
|---|---|
| **Meine Tickets** | Jedes Mitglied sieht die selbst geöffneten Tickets und kann in offenen antworten. Die Antwort erscheint im Discord-Kanal unter dem eigenen Namen. Geschlossene Tickets bieten einen Transcript-Download und, mit Premium, einen "Transcript öffnen"-Link. |
| **Tickets** | Vollständige Liste mit Filtern, Ticket-Detail mit dem Live-Verlauf, Claim / Schließen / Wieder öffnen / Verschieben / Sperren / Priorität. |
| **Statistiken** | Gesamtzahlen, Durchschnittsbewertung, durchschnittliche Bearbeitungszeit und ein Team-Ranking nach geschlossenen Tickets. |
| **Konfiguration** | Bearbeite `config.jsonc`, `snippets.jsonc`, `.env` und die Locale-Dateien wahlweise in einer strukturierten **Formular**-Ansicht oder einer rohen **Datei**-Ansicht (mit Zeilennummern und Syntax-Highlighting). Formular-Änderungen erhalten die `//`-Kommentare, und ein Seitenpanel löst Discord-Rollen-/Kanal-/Kategorie-**Namen** auf, sodass du nie nach rohen IDs suchen musst. |
| **Bot-Steuerung** | Starten, stoppen, neu starten und aktualisieren des Bots, plus eine Live-Konsole. |
| **Berechtigungen** | Lege fest, welche Rollen und Nutzer das Dashboard verwenden dürfen und was sie tun dürfen. |

---

## Schnellstart

```bash
npm run dashboard:setup   # geführtes Setup: erzeugt Secrets, schreibt .env
npm run dashboard         # startet den Bot MIT dem Dashboard
```

`npm start` funktioniert weiterhin exakt wie bisher und startet den reinen Bot
ganz ohne Webserver.

Der Setup-Assistent fragt, wie du das Dashboard erreichen willst, und schreibt
die passende Konfiguration für dich. Er **weigert sich**, eine unsichere
Kombination zu schreiben.

---

## Wie es läuft

Das Dashboard läuft **nicht** im Bot-Prozess. Es ist der **Eltern**-Prozess und
startet den Bot als Kindprozess:

```
node dashboard.js   ← das Dashboard (Webserver + Supervisor)
   └── index.js     ← der Bot
```

Genau deshalb kann das Dashboard den Bot überhaupt neu starten. Ein Dashboard
innerhalb des Bots könnte den Prozess, aus dem es serviert wird, nicht neu
starten und wäre genau dann weg, wenn man es am dringendsten braucht: nach einem
Crash. Durch die Trennung bleibt das Dashboard oben, zeigt dir den Crash in der
Konsole und lässt dich den Bot wieder starten.

---

## Sicherheit

Das Dashboard kann deinen Bot neu starten und deine `.env` bearbeiten. Behandle
es wie ein Admin-Panel, denn genau das ist es.

### Standardmäßig sicher

* **Deaktiviert**, solange du nicht `DASHBOARD_ENABLED=true` setzt.
* **An `127.0.0.1` gebunden**, also aus dem Internet gar nicht erreichbar.
* **Verweigert den Start**, wenn du es ohne HTTPS an eine öffentliche
  Schnittstelle bindest. Du bekommst eine klare Fehlermeldung mit Anleitung
  statt eines still exponierten Panels.
* Das Signatur-Secret (`SESSION_SECRET`) wird **pro Installation erzeugt**. Es
  gibt kein ausgeliefertes Default, denn ein geteiltes Default würde es jedem
  erlauben, auf allen Installationen gleichzeitig ein Login zu fälschen.

### So erreichst du es

**Variante A: SSH-Tunnel (am einfachsten, nichts exponiert)**

```bash
ssh -L 3010:127.0.0.1:3010 user@dein-server
```

Dann öffne `http://127.0.0.1:3010` auf deinem eigenen Rechner.

**Variante B: Reverse-Proxy mit HTTPS (für den echten Betrieb)**

Behalte `DASHBOARD_HOST=127.0.0.1`. Dein Webserver spricht das Dashboard lokal
an, sodass der Port nie zum Internet geöffnet werden muss. `npm run
dashboard:setup` erkennt dein Betriebssystem und druckt die passende
Reverse-Proxy-Konfiguration: einen Apache-vhost plus den `certbot`-Befehl unter
Linux, oder eine IIS-`web.config` (URL Rewrite + ARR) und eine Caddy-Alternative
unter Windows. Das Dashboard pollt die Logs (kein Dauer-Streaming), daher
funktioniert jeder Standard-Reverse-Proxy ohne spezielle Buffering-Einstellungen.

> Setze **nicht** einfach `DASHBOARD_HOST=0.0.0.0` und öffne den Port. Ohne TLS
> reisen dein Session-Cookie und alles, was du tippst, im Klartext. Der Bot
> verweigert in dieser Konfiguration ohnehin den Start.

---

## Login und Berechtigungen

Der Login läuft über **Discord OAuth** mit der Anwendung, die du ohnehin schon
für den Bot erstellt hast. Du musst nur:

1. Die vom Setup-Assistenten angezeigte Redirect-URI im
   [Discord Developer Portal](https://discord.com/developers/applications)
   unter **OAuth2 → Redirects** hinzufügen.
2. Das **Client Secret** aus **OAuth2 → Client Secret** in `CLIENT_SECRET`
   kopieren.

Deine Discord-Rollen werden **serverseitig vom Bot** aufgelöst. Das Dashboard
glaubt dir nie einfach, welche Berechtigungen du hast.

### Das Berechtigungsmodell

* Der **Server-Owner** hat immer alle Rechte und kann sich nie aussperren.
* Du vergibst Zugriff an **Rollen** oder an einzelne **Nutzer**.
* **Ein Nutzer-Eintrag überschreibt die Rollen-Einträge dieser Person
  vollständig.** Genau darum gibt es beides: So kannst du einer einzelnen Person
  ein Recht *entziehen*, das ihre Rolle ihr gewährt.
* Wer gar keinen Eintrag hat, sieht **nur die eigenen Tickets** und kann darin
  antworten, mehr nicht — und selbst das nur, wenn das **End-User-Portal**
  eingeschaltet ist (siehe unten). Standardmäßig ist das Dashboard **staff-only**.

| Berechtigung | Erlaubt |
|---|---|
| `tickets.view` | Ticket-Liste und Ticket-Details sehen |
| `tickets.act` | Claim, Schließen, Wieder öffnen, Verschieben, Sperren, Priorität setzen |
| `tickets.reply` | In einem Ticket als Bot antworten |
| `stats.view` | Statistiken und Team-Leistung sehen |
| `config.view` / `config.edit` | Config-Dateien lesen / schreiben |
| `bot.control` | Bot starten, stoppen, neu starten, aktualisieren |
| `blacklist.manage` | Die Blacklist verwalten |
| `access.manage` | Diese Berechtigungen verwalten |

Du kannst dir weder dein eigenes `access.manage` entziehen, dich selbst
deaktivieren noch dir ein Recht geben, das du nicht bereits hast. Rechte an
*andere* zu vergeben ist unbeschränkt.

Jede über das Dashboard vorgenommene Änderung wird in ein Audit-Log geschrieben.

### Das öffentliche End-User-Portal

Standardmäßig ist das Dashboard **staff-only**: Nur der Owner und Mitglieder, denen
du mindestens ein Recht gegeben hast, können sich anmelden. Das Dashboard für dein
Team zu aktivieren gibt also **nicht** stillschweigend jedem Server-Mitglied ein
Login.

Setze `DASHBOARD_PUBLIC_PORTAL=true` (der Setup-Assistent bietet das ebenfalls an),
um das End-User-Portal zu öffnen. Jedes Mitglied kann sich dann mit Discord
anmelden und bekommt eine **"Meine Tickets"**-Ansicht, die **nur die eigenen
Tickets** zeigt, wo es:

* dem Live-Verlauf eines offenen Tickets folgen und darin **antworten** kann (die
  Antwort erscheint in Discord unter dem eigenen Namen),
* das Transcript eines geschlossenen Tickets herunterladen kann (mit Premium plus
  einen "Transcript öffnen"-Link).

Das ist der gesamte Umfang des Portals — ein Mitglied ohne Rechte kann nie fremde
Tickets, Statistiken, die Config oder die Bot-Steuerung sehen. Alles
Staff-Seitige erfordert weiterhin ein explizites Recht. Ob das Portal an oder aus
ist: Die Reply-Route prüft serverseitig erneut, dass das Ticket offen und nicht
gesperrt ist, das Mitglied nicht geblacklistet ist und es wirklich sein eigenes
Ticket ist, bevor irgendetwas Discord erreicht.

---

## Umgebungsvariablen

| Variable | Default | Bedeutung |
|---|---|---|
| `DASHBOARD_ENABLED` | `false` | Hauptschalter |
| `DASHBOARD_HOST` | `127.0.0.1` | Bind-Adresse. Lass sie in Ruhe, außer du weißt, warum. |
| `DASHBOARD_PORT` | `3010` | Port |
| `DASHBOARD_PUBLIC_URL` | `http://127.0.0.1:<port>` | Die URL, die dein Browser nutzt. Muss zur Discord-Redirect-URI passen. |
| `DASHBOARD_PUBLIC_PORTAL` | `false` | Aus = staff-only. An = jedes Mitglied darf sich anmelden und nur die eigenen Tickets verwalten. |
| `DASHBOARD_ALLOW_INSECURE` | `false` | Nur, wenn du TLS an einer Stelle terminierst, die der Bot nicht sieht |
| `SESSION_SECRET` | *erzeugt* | Schlüssel für die Cookie-Signatur. Niemals teilen oder wiederverwenden. |
| `CLIENT_SECRET` | (keins) | Discord-OAuth2-Client-Secret |

---

## Als Dienst betreiben

> **Reverse-Proxy und Dienst-Manager sind zwei getrennte Ebenen.** Ein
> Reverse-Proxy (Apache, Caddy oder IIS) terminiert nur HTTPS und leitet an das
> Dashboard weiter; er startet den Node-Prozess **nicht**. Ein Dienst-Manager
> (systemd, oder NSSM / Task Scheduler unter Windows) hält den Node-Prozess
> (`node dashboard.js`) am Leben; er kümmert sich **nicht** um HTTPS. Für den
> öffentlichen Betrieb brauchst du beides. Eine Caddy-/IIS-Instanz kann außerdem
> mehrere Apps gleichzeitig bedienen (ein Site-Block pro Hostname), sie kollidiert
> also nicht mit einem bereits laufenden Proxy — einfach einen weiteren Block
> ergänzen, keine zweite Instanz starten.

Nutze `dashboard.js` statt `index.js` als Einstiegspunkt. Der Dienst-Manager hält
das Dashboard am Leben, und das Dashboard hält den Bot am Leben.

**Linux (systemd):**

```ini
[Service]
ExecStart=/usr/bin/node /opt/discord_ticketbot/dashboard.js
```

**Windows:** registriere `dashboard.js` als Dienst, z. B. mit
[NSSM](https://nssm.cc):

```
nssm install TicketBot "C:\Program Files\nodejs\node.exe" dashboard.js
nssm set TicketBot AppDirectory C:\pfad\zu\discord_ticketbot
```

oder lege eine Task-Scheduler-Aufgabe an, die auf "Unabhängig von der
Benutzeranmeldung ausführen" gesetzt und beim Systemstart ausgelöst wird. Das
Dashboard läuft auf Windows unverändert: Es startet den Bot mit `fork()` und ruft
für Updates `npm.cmd`/`git` über die Shell auf. Ein Unterschied: "Stop"/"Restart"
aus dem Dashboard beendet den Bot direkt (Windows kennt kein abfangbares
`SIGTERM`), was hier unkritisch ist, da es keinen kritischen ungeschriebenen
Zustand gibt.

---

## Fehlerbehebung

**Eine neue Dashboard-Funktion liefert nach einem Update "Request failed (404)"**
Die Buttons **Update** und **Restart** im Dashboard starten nur den Bot-Prozess
neu, nicht den Webserver selbst. Wenn ein Update den serverseitigen
Dashboard-Code ändert (eine neue API-Route, etwa der Tab "Dashboard settings"),
liefert das laufende Dashboard zwar schon die neue Seite aus, kennt die neue
Route aber noch nicht und antwortet mit 404. Starte den Dienst einmal neu, damit
der Webserver neu lädt: `sudo systemctl restart ticketbot` (oder starte den
NSSM-/PM2-Dienst neu, unter dem du `dashboard.js` laufen lässt). Reine
Bot-Änderungen (Commands, Events, Datenbank) greifen dagegen schon über den
Update-Button.

**Das Dashboard verweigert den Start mit dem Hinweis, die Konfiguration sei nicht sicher**
Du hast das Dashboard ohne HTTPS an eine öffentliche Schnittstelle gebunden. Geh
entweder zurück auf `DASHBOARD_HOST=127.0.0.1` und nutze einen Reverse-Proxy oder
setze `DASHBOARD_PUBLIC_URL` auf deine `https://`-Adresse.

**Der Login leitet mit einem Fehler zurück**
Die Redirect-URI im Discord-Portal muss **exakt** zu `DASHBOARD_PUBLIC_URL` +
`/auth/callback` passen, inklusive `https` und eventuellem Pfad-Anhang.

**Einem Mitglied wird gesagt, das Dashboard sei "limited to staff"**
Das Dashboard ist standardmäßig staff-only. Gib der Person entweder unter
**Berechtigungen** ein Recht, oder setze `DASHBOARD_PUBLIC_PORTAL=true`, um das
End-User-Portal zu öffnen, damit jedes Mitglied die eigenen Tickets verwalten kann.

**Der Verlauf in einem Ticket ist leer**
Der Bot braucht die **Message Content**-Intent (Developer Portal → Bot →
Privileged Gateway Intents) und `Read Message History` in den Ticket-Kanälen.
Ohne Letzteres liefert Discord eine leere Liste statt eines Fehlers.

**Antworten unter dem Namen eines Nutzers erscheinen nicht**
Der Bot braucht die **Manage Webhooks**-Berechtigung. Discord bietet keine
Möglichkeit, *als* Nutzer zu posten, daher wird die Antwort über einen Webhook
mit Name und Avatar dieses Nutzers gesendet. Es bleibt ein `APP`-Badge sichtbar,
das ist Discords Schutz gegen Identitätsvortäuschung und lässt sich nicht
entfernen.
