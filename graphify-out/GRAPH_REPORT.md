# Graph Report - discord_ticketbot  (2026-08-16)

## Corpus Check
- 165 files · ~164,373 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1180 nodes · 1952 edges · 108 communities (86 shown, 22 thin omitted)
- Extraction: 88% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 220 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf98b591`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- FormRenderer.jsx
- ready.js
- dashboard/config.js
- Web Dashboard Guide (EN)
- panelSelect.js
- package.json
- database/index.js
- utils/transcript.js
- dashboard/settings.js
- getTicketByChannel
- server.js
- routes.js
- BotSupervisor
- ticketActions.js
- security.js
- snippet.js
- permissions.js
- performClose
- discord.js
- dependencies
- client.js
- embeds.js
- Hosted Bot Dashboard Screenshot (msk-scripts.de)
- Dependency-Light, No-Build-Step Principle
- migrate-db.js
- performReopen
- err
- preview-transcript.js
- claim.js
- move.js
- priority.js
- devDependencies
- Pull Request Template & Merge Checklist
- Dashboard Permission Model (user entry overrides role entries)
- stats.js
- rateComment.js
- dashboard-i18n.test.js
- web/package.json
- blacklist.js
- MSK Scripts Logo Mark (assets/logo.png)
- v2.7.0 — Web dashboard
- GNU Affero General Public License v3.0
- Contributing Guide
- src/config.js
- TicketClient
- validateConfig
- commandHandler.js
- Engine-Agnostic Async Database Layer (DATABASE_URL)
- Auto Release Workflow
- lock.js
- note.js
- notifyToggle.js
- componentHandler.js
- highlight.js
- .start
- autoclose.js
- eventHandler.js
- logger.js
- dashboard-users.test.js
- alert.jsx
- v2.7.2 — CodeQL hardening of the dashboard
- sqlite.js
- Self-Contained Offline HTML Transcript (Base64 assets)
- Per-Guild API Key Verification
- badge.jsx
- button.jsx
- Panel Asset Placement (logo.png / banner.png)
- Platform-Aware Reverse Proxy Guidance (Apache vs IIS/Caddy)
- v2.2.0 — Modern HTML transcript design
- mskApi.js
- @fontsource/dm-sans
- @fontsource/syne
- jsonc-parser
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-separator
- @radix-ui/react-slot
- @radix-ui/react-tabs
- @radix-ui/react-tooltip
- react
- react-dom
- tailwind-merge
- v2.5.0 — Transcript accent follows mainColor
- Dependabot GitHub Actions Update Schedule
- messageCreate.js
- lucide-react

## God Nodes (most connected - your core abstractions)
1. `getTicketByChannel()` - 51 edges
2. `useT()` - 26 edges
3. `generateTranscript()` - 20 edges
4. `err()` - 19 edges
5. `registerRoutes()` - 17 edges
6. `BotSupervisor` - 15 edges
7. `openTicket()` - 15 edges
8. `performCloseInner()` - 12 edges
9. `startServer()` - 11 edges
10. `isBlacklisted()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Per-User Dashboard Language (7 translations)` --semantically_similar_to--> `Discord Ticket Bot (README EN)`  [AMBIGUOUS] [semantically similar]
  docs/dashboard-en.md → README.md
- `package.json overrides Forcing undici ^6.27.0` --semantically_similar_to--> `Major-Version Bump Block for better-sqlite3 and dotenv`  [INFERRED] [semantically similar]
  CHANGELOG.md → .github/dependabot.yml
- `Dashboard UI Internationalization (per-browser language)` --semantically_similar_to--> `i18n Rules (client.t, three locale files in sync)`  [INFERRED] [semantically similar]
  CHANGELOG.md → CONTRIBUTING.md
- `Web Dashboard Guide (EN)` --semantically_similar_to--> `Hosted Bot Management`  [INFERRED] [semantically similar]
  docs/dashboard-en.md → README.md
- `execute()` --indirect_call--> `err()`  [INFERRED]
  src/commands/add.js → web/src/botconfig/validateConfig.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dashboard Security Hardening Pattern** — changelog_dashboard_permission_model, changelog_global_allowed_mentions, changelog_locked_flag_enforcement, changelog_masked_link_escaping, changelog_multi_tenant_guild_scoping, changelog_closed_ticket_readonly_denylist [EXTRACTED 1.00]
- **Lean Runtime Discipline (no build step, minimal deps)** — contributing_dependency_light_principle, changelog_optional_dependencies_express_helmet, changelog_committed_web_dist, changelog_node_builtin_test_suite, changelog_dashboard_url_routing, github_dependabot_major_bump_block [INFERRED 0.85]
- **Tag-to-Release Automation Pipeline** — github_workflows_release_auto_release, github_workflows_release_changelog_section_extraction, github_workflows_release_tag_version_consistency_check, github_workflows_release_prerelease_detection, changelog_keep_a_changelog_format, contributing_commit_conventions [EXTRACTED 1.00]
- **MSK Premium Service Chain (verify to hosted transcript)** — docs_setup_en_discord_verify_oauth_app, docs_setup_en_api_key_verification, docs_setup_en_stripe_billing, readme_subscription_tiers, readme_custom_domain, readme_msk_transcript_service [EXTRACTED 1.00]
- **Dashboard Exposure Safety Stack** — docs_dashboard_en_safe_by_default, docs_dashboard_en_reverse_proxy_setup, docs_dashboard_en_service_vs_proxy_layers, docs_dashboard_en_discord_oauth_login, docs_dashboard_en_permission_model, security_operator_notes [EXTRACTED 1.00]
- **Transcript Rendering Family (modern / classic / localized)** — readme_html_transcript, docs_preview_preview_transcript_modern_sample, docs_preview_preview_transcript_de_localized_sample, docs_preview_preview_transcript_classic_sample, docs_preview_preview_transcript_modern_design_tokens [INFERRED 0.85]

## Communities (108 total, 22 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.05
Nodes (77): COLORS, parseAnsi(), api, ApiError, logout(), readCookie(), request(), allowed() (+69 more)

### Community 1 - "FormRenderer.jsx"
Cohesion: 0.08
Nodes (49): ConfigForm(), detectEol(), parseEnv(), setEnvValue(), splitLines(), unquote(), EnvEditor(), isTruthy() (+41 more)

### Community 2 - "ready.js"
Cohesion: 0.05
Nodes (49): { buildTicketPanel }, execute(), { savePanelMessage }, {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
}, ALLOWED_WHEN_CLOSED, assertMutable(), db, ESCAPE_UNTRUSTED (+41 more)

### Community 3 - "dashboard/config.js"
Cohesion: 0.06
Nodes (42): { BotSupervisor }, installShutdownHandlers(), { loadDashboardConfig, validateDashboardConfig, ensureSessionSecret }, main(), crypto, ENV_PATH, fs, main() (+34 more)

### Community 4 - "Web Dashboard Guide (EN)"
Cohesion: 0.06
Nodes (43): Web-Dashboard Guide (DE), Per-User Dashboard Language (7 translations), Discord OAuth Login (identify scope), Dashboard Permission Model, Public End-User Portal (DASHBOARD_PUBLIC_PORTAL), Reverse Proxy with HTTPS, Safe-by-Default Dashboard Exposure, Service Manager vs Reverse Proxy Layers (+35 more)

### Community 5 - "panelSelect.js"
Cohesion: 0.12
Nodes (28): buildQuestionsModal(), execute(), { isBlacklisted, getOpenTicketsByUser }, {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags,
}, { openTicket }, {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
}, buildFreshPanelRow(), { buildQuestionsModal } (+20 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (32): better-sqlite3, discord.js, dotenv, express, helmet, mysql2, dependencies, better-sqlite3 (+24 more)

### Community 7 - "database/index.js"
Cohesion: 0.09
Nodes (16): applySchema(), clampInt(), countTickets(), createDriver(), { getCreateStatements, getMigrations }, getDashboardAudit(), initDatabase(), listTickets() (+8 more)

### Community 8 - "utils/transcript.js"
Cohesion: 0.15
Nodes (26): execute(), { generateTranscript }, { getTicketByChannel }, { SlashCommandBuilder, AttachmentBuilder, MessageFlags }, buildAvatarMap(), buildChannelMap(), buildEmojiMap(), buildMessageRows() (+18 more)

### Community 9 - "dashboard/settings.js"
Cohesion: 0.11
Nodes (25): clearFavicon(), DATA_DIR, detectFaviconType(), ensureDataDir(), FAVICON_BASE, FAVICON_TYPES, fs, getFaviconFile() (+17 more)

### Community 10 - "getTicketByChannel"
Cohesion: 0.12
Nodes (16): execute(), { getTicketByChannel }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel } (+8 more)

### Community 11 - "server.js"
Cohesion: 0.11
Nodes (25): buildAuthorizeUrl(), exchangeCode(), fetchOAuthUser(), { redirectUri }, redirectUri(), canUseDashboard(), { buildAuthorizeUrl, exchangeCode, fetchOAuthUser }, db (+17 more)

### Community 12 - "routes.js"
Cohesion: 0.15
Nodes (16): asyncRoute(), audit(), CONFIG_FILES, configPath(), db, express, fs, { getGuildLookups, getChannelMessages, resolveUsers } (+8 more)

### Community 13 - "BotSupervisor"
Cohesion: 0.14
Nodes (9): BOT_ENTRY, BotSupervisor, ENV_PATH, EventEmitter, { fork }, fs, path, ROOT (+1 more)

### Community 14 - "ticketActions.js"
Cohesion: 0.13
Nodes (19): ratingRequestEmbed(), ticketClosedDMEmbed(), ticketClosedEmbed(), ALLOWED_ATTACHMENT_EXTS, buildClosedButtons(), buildRatingRow(), closingChannels, collectAttachments() (+11 more)

### Community 15 - "security.js"
Cohesion: 0.15
Nodes (15): b64url(), buckets, createOAuthState(), createSession(), createToken(), crypto, getSecret(), safeEqual() (+7 more)

### Community 16 - "snippet.js"
Cohesion: 0.20
Nodes (14): autocomplete(), execute(), { getAllSnippets, getSnippet, applyPlaceholders }, { getTicketByChannel }, {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
}, applyPlaceholders(), describeParseError(), fs (+6 more)

### Community 17 - "permissions.js"
Cohesion: 0.20
Nodes (15): checkSelfEdit(), hasPermission(), isPermission(), isSubjectType(), parsePermissions(), PERMISSION_LABELS, PERMISSIONS, resolvePermissions() (+7 more)

### Community 18 - "performClose"
Cohesion: 0.15
Nodes (13): execute(), { getTicketByChannel }, { performClose }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
}, { performClose } (+5 more)

### Community 19 - "discord.js"
Cohesion: 0.24
Nodes (14): avatarUrl(), cacheUser(), DiscordApiError, getChannelMessages(), getGuild(), getGuildChannels(), getGuildLookups(), getGuildMember() (+6 more)

### Community 20 - "dependencies"
Cohesion: 0.13
Nodes (15): class-variance-authority, clsx, @fontsource/space-mono, @radix-ui/react-label, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-switch, dependencies (+7 more)

### Community 21 - "client.js"
Cohesion: 0.15
Nodes (13): { checkApiKey }, { checkVersion }, { Client, GatewayIntentBits, Partials, Collection }, { initDatabase }, { loadCommands }, { loadComponents }, { loadConfig, validateConfig }, { loadEvents } (+5 more)

### Community 22 - "embeds.js"
Cohesion: 0.23
Nodes (12): execute(), { getAllOpenTickets }, { parseColor }, { SlashCommandBuilder, EmbedBuilder, MessageFlags }, getAllOpenTickets(), { EmbedBuilder, Colors }, formatDuration(), panelEmbed() (+4 more)

### Community 23 - "Hosted Bot Dashboard Screenshot (msk-scripts.de)"
Cohesion: 0.21
Nodes (13): Hosted Bot Dashboard Screenshot (msk-scripts.de), Generate new API key / Documentation / Logout Actions, Bot Boot Log Output (Components, Ready, Bridge, StaffReminder), Bot Control Panel (Start/Restart/Stop/Update), MSK Dark Theme with Green Accent Design Language, Dashboard IPC Bridge Active (log evidence), Live Logs Console (real-time stream, Clear/Disconnect), Open Bot Dashboard Deep-Link Card (+5 more)

### Community 24 - "Dependency-Light, No-Build-Step Principle"
Cohesion: 0.17
Nodes (12): Auto-Close Routed Through Shared performClose Flow, Committed web/dist so Self-Hosters Never Build, node:test Built-In Test Suite (zero new dependencies), express/helmet as optionalDependencies, package.json overrides Forcing undici ^6.27.0, v2.5.1 — Auto-close parity + undici advisories patched, Coding Conventions (CommonJS, tb_ prefix, client.logger), Dependency-Light, No-Build-Step Principle (+4 more)

### Community 25 - "migrate-db.js"
Cohesion: 0.18
Nodes (7): { DEFAULT_SQLITE_PATH }, { openDatabase }, path, TABLES, DEFAULT_SQLITE_PATH, parseDatabaseUrl(), path

### Community 26 - "performReopen"
Cohesion: 0.20
Nodes (10): execute(), { getTicketByChannel }, { performReopen }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performReopen } (+2 more)

### Community 27 - "err"
Cohesion: 0.24
Nodes (8): { captureFinalTranscript }, execute(), { getTicketByChannel }, { MessageFlags }, execute(), { MessageFlags }, captureFinalTranscript(), err()

### Community 28 - "preview-transcript.js"
Cohesion: 0.20
Nodes (10): channel, fs, { generateTranscript }, guild, member(), MEMBERS, messages, msg() (+2 more)

### Community 29 - "claim.js"
Cohesion: 0.22
Nodes (9): execute(), { getTicketByChannel }, { performClaim }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performClaim } (+1 more)

### Community 30 - "move.js"
Cohesion: 0.20
Nodes (9): execute(), { getTicketByChannel }, { performMove }, {
  SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ActionRowBuilder, MessageFlags,
}, execute(), { getTicketByChannel }, { MessageFlags }, { performMove } (+1 more)

### Community 31 - "priority.js"
Cohesion: 0.14
Nodes (16): execute(), { getTicketByChannel, setPriority }, { SlashCommandBuilder, MessageFlags }, { updateChannelTopic, refreshTicketMessage }, execute(), { getTicketByChannel }, { performUnclaim }, { SlashCommandBuilder, MessageFlags } (+8 more)

### Community 32 - "devDependencies"
Cohesion: 0.18
Nodes (11): tailwindcss, @tailwindcss/vite, tw-animate-css, vite, @vitejs/plugin-react, devDependencies, tailwindcss, @tailwindcss/vite (+3 more)

### Community 35 - "Pull Request Template & Merge Checklist"
Cohesion: 0.20
Nodes (10): Auto-Refreshing /setup Panel via panel_messages Table, Per-Ticket Auto-Close Pause (auto_close_paused), Dashboard UI Internationalization (per-browser language), Keep a Changelog + SemVer Convention, Transcript UI Strings Moved into Locale Files, v2.13.0 — Dashboard i18n with per-user language, v2.4.0 — Auto-refreshing ticket panel + Hungarian locale, v2.9.0 — Four new bot languages (fr, es, pt, pl) (+2 more)

### Community 36 - "Dashboard Permission Model (user entry overrides role entries)"
Cohesion: 0.22
Nodes (10): Dashboard Permission Model (user entry overrides role entries), Dashboard History Router and Deep Links, .env Editor Restricted to Guild Owner, DASHBOARD_PUBLIC_PORTAL End-User Portal, Delegatable Dashboard Settings Permissions, Trusted-Proxy Authentication (identity vouching, live permissions), v2.11.0 — autoclose pause + public end-user portal, v2.12.0 — settings.view / settings.edit permissions (+2 more)

### Community 37 - "stats.js"
Cohesion: 0.29
Nodes (9): execute(), { getStats, getUserStats }, { SlashCommandBuilder, MessageFlags }, { statsEmbed, userStatsEmbed }, getStats(), getTotalTicketCount(), getUserStats(), num() (+1 more)

### Community 38 - "rateComment.js"
Cohesion: 0.27
Nodes (8): execute(), { getRating }, {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
}, { EmbedBuilder, MessageFlags }, execute(), { getRating, addRating }, addRating(), getRating()

### Community 39 - "dashboard-i18n.test.js"
Cohesion: 0.20
Nodes (5): assert, fs, LOCALES_DIR, path, test

### Community 40 - "web/package.json"
Cohesion: 0.20
Nodes (9): description, name, private, scripts, build, dev, preview, type (+1 more)

### Community 42 - "blacklist.js"
Cohesion: 0.43
Nodes (6): { addToBlacklist, removeFromBlacklist, isBlacklisted, getBlacklist }, execute(), { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags }, addToBlacklist(), getBlacklist(), removeFromBlacklist()

### Community 43 - "MSK Scripts Logo Mark (assets/logo.png)"
Cohesion: 0.39
Nodes (8): Angular Beveled Geometry Motif, MSK Scripts / Musiker15 Brand Identity, Green Gradient Color Language, Stylized Letter M Monogram, MSK Scripts Logo Mark (assets/logo.png), Rationale: Single-Letter Mark for Small Embed Thumbnails, Usage in Discord Ticket Setup Panel Embed, Transparent-Background Raster Brand Asset

### Community 44 - "v2.7.0 — Web dashboard"
Cohesion: 0.29
Nodes (8): Decoupling asUser from requireCreator in ticket.reply, Closed Tickets Read-Only via Central Deny-List, Global allowedMentions Policy Blocks @everyone/@here, Locked-Ticket Flag Enforcement Beyond Discord Overwrites, Masked-Link Escaping Against Webhook Phishing, Dashboard Supervisor Forks the Bot as Child Process, v2.7.0 — Web dashboard, v2.7.1 — Dashboard replies posted under the sender's identity

### Community 45 - "GNU Affero General Public License v3.0"
Cohesion: 0.25
Nodes (8): Transient-Failure Retry with Backoff for Transcript Upload, v2.9.2 — Transcript upload retry on transient failures, Graceful Degradation Without MSK_API_KEY, Mirror to Codeberg Workflow, Deleting refs/remotes/origin/HEAD Before Mirror Push, Serial Mirror Concurrency Guard, GNU Affero General Public License v3.0, Section 7 Additional Term: MSK Transcript Service Integration

### Community 46 - "Contributing Guide"
Cohesion: 0.25
Nodes (8): Contributor Covenant Code of Conduct v2.0, Community Impact Enforcement Ladder, Mozilla Code of Conduct Enforcement Ladder (cited source), Contributing Guide, Private Security Disclosure Policy, GitHub Sponsors Funding (MSK-Scripts), Bug Report Issue Template, Feature Request Issue Template

### Community 47 - "src/config.js"
Cohesion: 0.32
Nodes (7): CONFIG_PATH, describeParseError(), EXAMPLE_PATH, fs, loadConfig(), path, stripJsonComments()

### Community 50 - "TicketClient"
Cohesion: 0.29
Nodes (3): client, { TicketClient }, TicketClient

### Community 51 - "validateConfig"
Cohesion: 0.33
Nodes (5): validateConfig(), assert, errorsOf(), test, { validateConfig }

### Community 52 - "commandHandler.js"
Cohesion: 0.33
Nodes (6): COMMANDS_DIR, fs, getFiles(), loadCommands(), path, { REST, Routes }

### Community 54 - "Engine-Agnostic Async Database Layer (DATABASE_URL)"
Cohesion: 0.33
Nodes (6): npm run db:migrate SQLite-to-Target Migration Script, Engine-Agnostic Async Database Layer (DATABASE_URL), Multi-Tenant Guild Scoping (blacklist, loops, name cache), v2.6.0 — MySQL/MariaDB and PostgreSQL support, v2.9.1 — LONGTEXT transcript column on MySQL, Database Change Rules (inline migrations, three dialects)

### Community 55 - "Auto Release Workflow"
Cohesion: 0.33
Nodes (6): Conventional Commits in English, Release Notes Label Categories, Auto Release Workflow, CHANGELOG Section Extraction (awk, string-based), Prerelease Detection from Tag Suffix, Tag vs package.json Version Consistency Check

### Community 56 - "lock.js"
Cohesion: 0.47
Nodes (5): execute(), { getTicketByChannel, lockTicket, unlockTicket }, { SlashCommandBuilder, MessageFlags }, lockTicket(), unlockTicket()

### Community 57 - "note.js"
Cohesion: 0.47
Nodes (5): execute(), { getTicketByChannel, addNote, getNotes }, { SlashCommandBuilder, EmbedBuilder, MessageFlags }, addNote(), getNotes()

### Community 58 - "notifyToggle.js"
Cohesion: 0.47
Nodes (5): {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
}, buildNotifyButton(), execute(), { getTicketByChannel, setNotifyOnReply }, setNotifyOnReply()

### Community 59 - "componentHandler.js"
Cohesion: 0.40
Nodes (5): COMPONENTS_DIR, fs, getFiles(), loadComponents(), path

### Community 60 - "highlight.js"
Cohesion: 0.60
Nodes (5): esc(), ESCAPE, highlight(), highlightEnv(), highlightJsonc()

### Community 61 - ".start"
Cohesion: 0.50
Nodes (3): printBanner(), checkVersion(), isNewer()

### Community 62 - "autoclose.js"
Cohesion: 0.50
Nodes (4): execute(), { getTicketByChannel, setAutoClosePaused }, { SlashCommandBuilder, MessageFlags }, setAutoClosePaused()

### Community 63 - "eventHandler.js"
Cohesion: 0.40
Nodes (4): EVENTS_DIR, fs, loadEvents(), path

### Community 64 - "logger.js"
Cohesion: 0.50
Nodes (4): COLORS, format(), logger, timestamp()

### Community 65 - "dashboard-users.test.js"
Cohesion: 0.40
Nodes (3): assert, { resolveUsers }, test

### Community 69 - "v2.7.2 — CodeQL hardening of the dashboard"
Cohesion: 0.50
Nodes (4): Allow-List Path Resolution for Config and Locale Files, v2.7.2 — CodeQL hardening of the dashboard, CodeQL Advanced Analysis Workflow, security-extended + security-and-quality Query Packs

### Community 71 - "Self-Contained Offline HTML Transcript (Base64 assets)"
Cohesion: 0.67
Nodes (3): Self-Contained Offline HTML Transcript (Base64 assets), v2.2.2 — Transcript attachments served from MSK server, v2.3.0 — Transcript copy button + transcriptLang

### Community 72 - "Per-Guild API Key Verification"
Cohesion: 0.67
Nodes (3): Per-Guild API Key Verification, Discord Verify OAuth App, Startup Console Output & Tier Detection

### Community 79 - "mskApi.js"
Cohesion: 0.43
Nodes (6): attemptUpload(), getTranscriptUrl(), RETRYABLE_STATUS, sleep(), UPLOAD_RETRY_DELAYS_MS, uploadTranscript()

### Community 106 - "messageCreate.js"
Cohesion: 0.60
Nodes (4): setLastNotifySent(), updateLastActivity(), execute(), { updateLastActivity, getTicketByChannel, setLastNotifySent }

## Ambiguous Edges - Review These
- `Mirror to Codeberg Workflow` → `GNU Affero General Public License v3.0`  [AMBIGUOUS]
  .github/workflows/mirror.yml · relation: conceptually_related_to
- `DASHBOARD_PUBLIC_PORTAL End-User Portal` → `AGPL Section 13 Remote Network Interaction`  [AMBIGUOUS]
  LICENSE.md · relation: conceptually_related_to
- `Discord Ticket Bot (README EN)` → `Per-User Dashboard Language (7 translations)`  [AMBIGUOUS]
  docs/dashboard-en.md · relation: semantically_similar_to
- `Open Bot Dashboard Deep-Link Card` → `Premium Upsell (14 days free, billed monthly)`  [AMBIGUOUS]
  assets/dashboard-hosted.png · relation: conceptually_related_to
- `Green Gradient Color Language` → `Angular Beveled Geometry Motif`  [AMBIGUOUS]
  assets/logo.png · relation: semantically_similar_to

## Knowledge Gaps
- **384 isolated node(s):** `{ loadDashboardConfig, validateDashboardConfig, ensureSessionSecret }`, `{ BotSupervisor }`, `fs`, `path`, `{ generateTranscript }` (+379 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Mirror to Codeberg Workflow` and `GNU Affero General Public License v3.0`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `DASHBOARD_PUBLIC_PORTAL End-User Portal` and `AGPL Section 13 Remote Network Interaction`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Discord Ticket Bot (README EN)` and `Per-User Dashboard Language (7 translations)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Open Bot Dashboard Deep-Link Card` and `Premium Upsell (14 days free, billed monthly)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Green Gradient Color Language` and `Angular Beveled Geometry Motif`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `err()` connect `err` to `FormRenderer.jsx`, `ready.js`, `panelSelect.js`, `utils/transcript.js`, `getTicketByChannel`, `ticketActions.js`, `src/config.js`, `snippet.js`, `commandHandler.js`, `componentHandler.js`, `eventHandler.js`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `getTicketByChannel()` connect `getTicketByChannel` to `notifyToggle.js`, `database/index.js`, `utils/transcript.js`, `messageCreate.js`, `snippet.js`, `performClose`, `move.js`, `lock.js`, `note.js`, `performReopen`, `err`, `claim.js`, `autoclose.js`, `priority.js`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._