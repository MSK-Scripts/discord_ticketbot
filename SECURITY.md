# Security Policy

## Supported Versions

Only the latest release receives security updates. Please always run the most
recent version — see the
[Releases](https://github.com/MSK-Scripts/discord_ticketbot/releases) page (the
bot also checks for new releases on startup).

| Version | Supported          |
|---------|--------------------|
| 2.7.x   | :white_check_mark: |
| < 2.7.0 | :x:                |

## Reporting a Vulnerability

In order for vulnerability reports to reach the maintainers as soon as possible,
the preferred way is to use the **"Report a vulnerability"** button under the
**"Security"** tab of the GitHub project. This creates a private communication
channel between the reporter and the maintainers.

If you are absolutely unable to — or have strong reasons not to — use GitHub's
private vulnerability reporting workflow, please reach out by mailing
**info@msk-scripts.de**.

Where possible, please include:

- the affected version or commit,
- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- any suggested remediation.

**Please do not** open public issues, pull requests or Discord posts for
security-sensitive reports, and please do not disclose the vulnerability
publicly until a fix has been released.

## Response

We aim to acknowledge a valid report within a few days and to ship a fix in a
timely manner, coordinating a disclosure timeline with the reporter. Reporters
are credited unless they prefer to stay anonymous.

## Scope & Operator Notes

This policy covers the bot in this repository. A few things worth keeping in
mind when self-hosting:

- The bot is **self-hosted** — keep your `.env` (bot `TOKEN`, `MSK_API_KEY`)
  private and never commit it. `.env` is already covered by `.gitignore`.
- HTML transcripts are **self-contained** and embed message content, avatars,
  custom emojis and (on premium) attachments. Treat the generated files and any
  public transcript links as containing potentially sensitive ticket data.
- The optional **MSK Transcript Service** (transcript hosting, custom domains,
  hosted-bot management) is operated separately under
  [msk-scripts.de](https://www.msk-scripts.de); vulnerabilities in that hosted
  platform can be reported through the same channels above.
- The optional **web dashboard** is an admin panel: it can restart the bot and
  edit your `.env`. It is off by default and binds to `127.0.0.1`; if you expose
  it, put it behind a reverse proxy with HTTPS (it refuses to start on a public
  interface without HTTPS). Keep `SESSION_SECRET` and `CLIENT_SECRET` private, and
  grant dashboard permissions sparingly. See
  [docs/dashboard-en.md](docs/dashboard-en.md) for the full security model.
