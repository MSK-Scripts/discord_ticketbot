<!--
Thanks for contributing to Discord Ticket Bot! 🎫
Please read CONTRIBUTING.md before opening this PR.
Fill in the sections below and delete anything that doesn't apply.
-->

## Description

<!-- What does this PR do and why? Keep it focused on one logical change. -->

## Related Issue

<!-- Link the issue this resolves, e.g. "Closes #123". Open an issue first for larger features. -->

Closes #

## Type of Change

<!-- Mark all that apply with an "x". -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that changes existing behavior)
- [ ] 🌍 Translation / locale update
- [ ] 📖 Documentation only
- [ ] 🔧 Refactor / chore (no functional change)

## How Was This Tested?

<!--
There is no automated test suite — please verify manually on a TEST server you own.
Describe the flows you exercised (e.g. open, claim, close, reopen, transcript).
-->

- Node.js version:
- Tested flows:

## Checklist

- [ ] My code follows the project's conventions (CommonJS, no TypeScript, `tb_` custom-id prefix, `client.logger`, etc.)
- [ ] No new production dependencies were added (or it was discussed in an issue first)
- [ ] User-facing strings go through `client.t(...)` and **all three** locale files (`main.json`, `en.json`, `de.json`) are in sync
- [ ] Any DB schema change uses an inline migration in `initDatabase()` (`ALTER TABLE` / `CREATE TABLE IF NOT EXISTS`)
- [ ] The bot still works **without** `MSK_API_KEY` (premium features degrade gracefully)
- [ ] The bot starts cleanly (`npm start`) and I verified my change on a test server
- [ ] I updated the relevant docs (`docs/` in both languages, `config.example.jsonc`, `CLAUDE.md`) where behavior, config keys, commands or the schema changed
- [ ] I added a `CHANGELOG.md` entry under `[Unreleased]`
- [ ] My commit messages are in English and follow Conventional Commits (`feat:`, `fix:`, `docs:`, …)

## Screenshots / Logs (optional)

<!-- Add screenshots or console output if they help reviewers. Never include tokens or secrets. -->
