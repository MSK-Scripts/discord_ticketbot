# Graph Report - discord_ticketbot  (2026-09-15)

## Corpus Check
- 179 files · ~182,249 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1258 nodes · 2093 edges · 113 communities (67 shown, 24 thin omitted)
- Extraction: 89% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 218 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4dc8a05a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- Config.jsx
- Bot Bridge and Webhooks
- BotSupervisor
- Dashboard Documentation and Features
- panelSelect.js
- dependencies
- database/index.js
- utils/transcript.js
- Dashboard Settings and Favicons
- getTicketByChannel
- server.js
- routes.js
- dashboard-setup.js
- ticketActions.js
- security.js
- Snippet Management System
- permissions.js
- Ticket Move Command
- dashboard/discord.js
- dependencies
- client.js
- embeds.js
- feedback-comments.test.js
- Development and Release Policies
- migrate-db.js
- performReopen
- Interaction Create Event
- Transcript Preview Utility
- Ticket Claim Command
- panel.js
- Ticket Unclaim Command
- Vite and Tailwind Build
- Localization and Auto-Refresh
- Access Control and Authentication
- ready.js
- rateComment.js
- Internationalization Tests
- Web Package Configuration
- performClose
- Brand Identity and Assets
- Security and Process Isolation
- Transcript Service and Licensing
- Community and Security Guidelines
- src/config.js
- rateLimits.js
- priority.js
- updateNotice.js
- Multi-Dialect Database Support
- Release and Commit Workflow
- Ticket Lock Commands
- Ticket Note Commands
- stats.js
- package.json
- Syntax Highlighting Utilities
- update-notice.test.js
- Auto-Close Management
- optionalDependencies
- scripts
- User Resolution Tests
- Alert UI Components
- Security Hardening and CodeQL
- SQLite Driver Implementation
- HTML Transcript Features
- API Key Verification
- Badge UI Components
- Button UI Components
- Panel Asset Configuration
- Reverse Proxy Documentation
- Transcript Design Updates
- mskApi.js
- DM Sans Font
- Syne Font
- JSONC Parser
- Radix Dialog Primitive
- Radix Dropdown Primitive
- Radix Separator Primitive
- Radix Slot Primitive
- Radix Tabs Primitive
- Radix Tooltip Primitive
- React DOM Library
- versionCheck.js
- Tailwind Merge Utility
- Software Release Notes
- Dependency Update Configuration
- attachment-budget.test.js
- React Icon Library
- Permission Check Utilities
- blacklist.js
- docker-entrypoint.sh
- react

## God Nodes (most connected - your core abstractions)
1. `getTicketByChannel()` - 51 edges
2. `useT()` - 26 edges
3. `generateTranscript()` - 20 edges
4. `BotSupervisor` - 17 edges
5. `registerRoutes()` - 16 edges
6. `startServer()` - 16 edges
7. `openTicket()` - 15 edges
8. `isBlacklisted()` - 11 edges
9. `performClose()` - 11 edges
10. `performCloseInner()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Per-User Dashboard Language (7 translations)` --semantically_similar_to--> `Discord Ticket Bot (README EN)`  [AMBIGUOUS] [semantically similar]
  docs/dashboard-en.md → README.md
- `package.json overrides Forcing undici ^6.27.0` --semantically_similar_to--> `Major-Version Bump Block for better-sqlite3 and dotenv`  [INFERRED] [semantically similar]
  CHANGELOG.md → .github/dependabot.yml
- `Dashboard UI Internationalization (per-browser language)` --semantically_similar_to--> `i18n Rules (client.t, three locale files in sync)`  [INFERRED] [semantically similar]
  CHANGELOG.md → CONTRIBUTING.md
- `Web Dashboard Guide (EN)` --semantically_similar_to--> `Hosted Bot Management`  [INFERRED] [semantically similar]
  docs/dashboard-en.md → README.md
- `Pull Request Template & Merge Checklist` --references--> `Coding Conventions (CommonJS, tb_ prefix, client.logger)`  [EXTRACTED]
  .github/PULL_REQUEST_TEMPLATE.md → CONTRIBUTING.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Dashboard Exposure Safety Stack** — docs_dashboard_en_safe_by_default, docs_dashboard_en_reverse_proxy_setup, docs_dashboard_en_service_vs_proxy_layers, docs_dashboard_en_discord_oauth_login, docs_dashboard_en_permission_model, security_operator_notes [EXTRACTED 1.00]
- **Dashboard Security Hardening Pattern** — changelog_dashboard_permission_model, changelog_global_allowed_mentions, changelog_locked_flag_enforcement, changelog_masked_link_escaping, changelog_multi_tenant_guild_scoping, changelog_closed_ticket_readonly_denylist [EXTRACTED 1.00]
- **MSK Premium Service Chain (verify to hosted transcript)** — docs_setup_en_discord_verify_oauth_app, docs_setup_en_api_key_verification, docs_setup_en_stripe_billing, readme_subscription_tiers, readme_custom_domain, readme_msk_transcript_service [EXTRACTED 1.00]
- **Tag-to-Release Automation Pipeline** — github_workflows_release_auto_release, github_workflows_release_changelog_section_extraction, github_workflows_release_tag_version_consistency_check, github_workflows_release_prerelease_detection, changelog_keep_a_changelog_format, contributing_commit_conventions [EXTRACTED 1.00]
- **Lean Runtime Discipline (no build step, minimal deps)** — contributing_dependency_light_principle, changelog_optional_dependencies_express_helmet, changelog_committed_web_dist, changelog_node_builtin_test_suite, changelog_dashboard_url_routing, github_dependabot_major_bump_block [INFERRED 0.85]
- **Transcript Rendering Family (modern / classic / localized)** — readme_html_transcript, docs_preview_preview_transcript_modern_sample, docs_preview_preview_transcript_de_localized_sample, docs_preview_preview_transcript_classic_sample, docs_preview_preview_transcript_modern_design_tokens [INFERRED 0.85]

## Communities (113 total, 24 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.06
Nodes (71): COLORS, parseAnsi(), api, ApiError, logout(), readCookie(), request(), allowed() (+63 more)

### Community 1 - "Config.jsx"
Cohesion: 0.07
Nodes (57): ConfigForm(), detectEol(), parseEnv(), setEnvValue(), splitLines(), unquote(), EnvEditor(), isTruthy() (+49 more)

### Community 2 - "Bot Bridge and Webhooks"
Cohesion: 0.13
Nodes (16): ALLOWED_WHEN_CLOSED, assertMutable(), db, ESCAPE_UNTRUSTED, { escapeMarkdown }, { performClose, performReopen, performMove, performClaim, performUnclaim }, registerBotBridge(), sanitizeUserText() (+8 more)

### Community 3 - "BotSupervisor"
Cohesion: 0.06
Nodes (30): { BotSupervisor }, installShutdownHandlers(), { loadDashboardConfig, validateDashboardConfig, ensureSessionSecret }, main(), crypto, ensureSessionSecret(), ENV_PATH, fs (+22 more)

### Community 4 - "Dashboard Documentation and Features"
Cohesion: 0.07
Nodes (43): Web-Dashboard Guide (DE), Per-User Dashboard Language (7 translations), Discord OAuth Login (identify scope), Dashboard Permission Model, Public End-User Portal (DASHBOARD_PUBLIC_PORTAL), Reverse Proxy with HTTPS, Safe-by-Default Dashboard Exposure, Service Manager vs Reverse Proxy Layers (+35 more)

### Community 5 - "panelSelect.js"
Cohesion: 0.11
Nodes (30): {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
}, buildNotifyButton(), execute(), { getTicketByChannel, setNotifyOnReply }, buildQuestionsModal(), execute(), { isBlacklisted, getOpenTicketsByUser }, {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags,
} (+22 more)

### Community 6 - "dependencies"
Cohesion: 0.18
Nodes (11): better-sqlite3, dotenv, mysql2, dependencies, better-sqlite3, discord.js, dotenv, mysql2 (+3 more)

### Community 7 - "database/index.js"
Cohesion: 0.09
Nodes (16): applySchema(), clampInt(), countTickets(), createDriver(), { getCreateStatements, getMigrations }, getDashboardAudit(), initDatabase(), listTickets() (+8 more)

### Community 8 - "utils/transcript.js"
Cohesion: 0.14
Nodes (28): execute(), { generateTranscript }, { getTicketByChannel }, { SlashCommandBuilder, AttachmentBuilder, MessageFlags }, buildAvatarMap(), buildChannelMap(), buildEmojiMap(), buildMessageRows() (+20 more)

### Community 9 - "Dashboard Settings and Favicons"
Cohesion: 0.11
Nodes (25): clearFavicon(), DATA_DIR, detectFaviconType(), ensureDataDir(), FAVICON_BASE, FAVICON_TYPES, fs, getFaviconFile() (+17 more)

### Community 10 - "getTicketByChannel"
Cohesion: 0.10
Nodes (20): execute(), { getTicketByChannel }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel } (+12 more)

### Community 11 - "server.js"
Cohesion: 0.11
Nodes (26): buildAuthorizeUrl(), exchangeCode(), fetchOAuthUser(), { redirectUri }, redirectUri(), canUseDashboard(), { buildAuthorizeUrl, exchangeCode, fetchOAuthUser }, { createLimiters } (+18 more)

### Community 12 - "routes.js"
Cohesion: 0.13
Nodes (19): isSubjectType(), PERMISSION_LABELS, asyncRoute(), audit(), CONFIG_FILES, configPath(), db, express (+11 more)

### Community 13 - "dashboard-setup.js"
Cohesion: 0.14
Nodes (21): crypto, ENV_PATH, fs, main(), path, printLinuxReverseProxy(), printWindowsReverseProxy(), readline (+13 more)

### Community 14 - "ticketActions.js"
Cohesion: 0.11
Nodes (22): ratingRequestEmbed(), ticketClosedDMEmbed(), ticketClosedEmbed(), ALLOWED_ATTACHMENT_EXTS, buildClosedButtons(), buildRatingRow(), closingChannels, collectAttachments() (+14 more)

### Community 15 - "security.js"
Cohesion: 0.14
Nodes (18): b64url(), createOAuthState(), createSession(), createToken(), crypto, getSecret(), safeEqual(), sign() (+10 more)

### Community 16 - "Snippet Management System"
Cohesion: 0.20
Nodes (14): autocomplete(), execute(), { getAllSnippets, getSnippet, applyPlaceholders }, { getTicketByChannel }, {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
}, applyPlaceholders(), describeParseError(), fs (+6 more)

### Community 17 - "permissions.js"
Cohesion: 0.22
Nodes (13): checkSelfEdit(), hasPermission(), isPermission(), parsePermissions(), PERMISSIONS, resolvePermissions(), selectAccessRows(), SUBJECT_TYPES (+5 more)

### Community 18 - "Ticket Move Command"
Cohesion: 0.20
Nodes (9): execute(), { getTicketByChannel }, { performMove }, {
  SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ActionRowBuilder, MessageFlags,
}, execute(), { getTicketByChannel }, { MessageFlags }, { performMove } (+1 more)

### Community 19 - "dashboard/discord.js"
Cohesion: 0.17
Nodes (17): avatarUrl(), cacheUser(), DiscordApiError, getChannelMessages(), getGuild(), getGuildChannels(), getGuildLookups(), getGuildMember() (+9 more)

### Community 20 - "dependencies"
Cohesion: 0.13
Nodes (15): class-variance-authority, clsx, @fontsource/space-mono, @radix-ui/react-label, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-switch, dependencies (+7 more)

### Community 21 - "client.js"
Cohesion: 0.06
Nodes (36): client, { TicketClient }, { checkApiKey }, { checkVersion }, { Client, GatewayIntentBits, Partials, Collection }, { initDatabase }, { loadCommands }, { loadComponents } (+28 more)

### Community 22 - "embeds.js"
Cohesion: 0.23
Nodes (12): execute(), { getAllOpenTickets }, { parseColor }, { SlashCommandBuilder, EmbedBuilder, MessageFlags }, getAllOpenTickets(), { EmbedBuilder, Colors }, formatDuration(), panelEmbed() (+4 more)

### Community 23 - "feedback-comments.test.js"
Cohesion: 0.20
Nodes (14): {
  ContextMenuCommandBuilder, ApplicationCommandType,
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  MessageFlags,
}, execute(), {
  isRatingMessage, canCommentFeedback, commentFieldName, existingComment,
}, { EmbedBuilder, MessageFlags }, execute(), {
  isRatingMessage, canCommentFeedback, commentFieldName, upsertComment,
}, canCommentFeedback(), commentFieldName() (+6 more)

### Community 24 - "Development and Release Policies"
Cohesion: 0.17
Nodes (12): Auto-Close Routed Through Shared performClose Flow, Committed web/dist so Self-Hosters Never Build, node:test Built-In Test Suite (zero new dependencies), express/helmet as optionalDependencies, package.json overrides Forcing undici ^6.27.0, v2.5.1 — Auto-close parity + undici advisories patched, Coding Conventions (CommonJS, tb_ prefix, client.logger), Dependency-Light, No-Build-Step Principle (+4 more)

### Community 25 - "migrate-db.js"
Cohesion: 0.18
Nodes (7): { DEFAULT_SQLITE_PATH }, { openDatabase }, path, TABLES, DEFAULT_SQLITE_PATH, parseDatabaseUrl(), path

### Community 26 - "performReopen"
Cohesion: 0.20
Nodes (10): execute(), { getTicketByChannel }, { performReopen }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performReopen } (+2 more)

### Community 28 - "Transcript Preview Utility"
Cohesion: 0.20
Nodes (10): channel, fs, { generateTranscript }, guild, member(), MEMBERS, messages, msg() (+2 more)

### Community 29 - "Ticket Claim Command"
Cohesion: 0.22
Nodes (9): execute(), { getTicketByChannel }, { performClaim }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performClaim } (+1 more)

### Community 30 - "panel.js"
Cohesion: 0.21
Nodes (10): { buildTicketPanel }, execute(), { savePanelMessage }, {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
}, savePanelMessage(), {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
}, buildTicketPanel(), fs (+2 more)

### Community 31 - "Ticket Unclaim Command"
Cohesion: 0.22
Nodes (9): execute(), { getTicketByChannel }, { performUnclaim }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performUnclaim } (+1 more)

### Community 32 - "Vite and Tailwind Build"
Cohesion: 0.18
Nodes (11): tailwindcss, @tailwindcss/vite, tw-animate-css, vite, @vitejs/plugin-react, devDependencies, tailwindcss, @tailwindcss/vite (+3 more)

### Community 35 - "Localization and Auto-Refresh"
Cohesion: 0.20
Nodes (10): Auto-Refreshing /setup Panel via panel_messages Table, Per-Ticket Auto-Close Pause (auto_close_paused), Dashboard UI Internationalization (per-browser language), Keep a Changelog + SemVer Convention, Transcript UI Strings Moved into Locale Files, v2.13.0 — Dashboard i18n with per-user language, v2.4.0 — Auto-refreshing ticket panel + Hungarian locale, v2.9.0 — Four new bot languages (fr, es, pt, pl) (+2 more)

### Community 36 - "Access Control and Authentication"
Cohesion: 0.22
Nodes (10): Dashboard Permission Model (user entry overrides role entries), Dashboard History Router and Deep Links, .env Editor Restricted to Guild Owner, DASHBOARD_PUBLIC_PORTAL End-User Portal, Delegatable Dashboard Settings Permissions, Trusted-Proxy Authentication (identity vouching, live permissions), v2.11.0 — autoclose pause + public end-user portal, v2.12.0 — settings.view / settings.edit permissions (+2 more)

### Community 37 - "ready.js"
Cohesion: 0.16
Nodes (18): deletePanelMessage(), getInactiveTickets(), getPanelMessage(), getTicketsNeedingStaffReminder(), setStaffReminded(), ACTIVITY_TYPE_MAP, { ActivityType }, { buildTicketPanel } (+10 more)

### Community 38 - "rateComment.js"
Cohesion: 0.25
Nodes (9): execute(), { getRating }, {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
}, { EmbedBuilder, MessageFlags }, execute(), { getRating, addRating, getTicketById }, addRating(), getRating() (+1 more)

### Community 39 - "Internationalization Tests"
Cohesion: 0.20
Nodes (5): assert, fs, LOCALES_DIR, path, test

### Community 40 - "Web Package Configuration"
Cohesion: 0.20
Nodes (9): description, name, private, scripts, build, dev, preview, type (+1 more)

### Community 42 - "performClose"
Cohesion: 0.15
Nodes (13): execute(), { getTicketByChannel }, { performClose }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
}, { performClose } (+5 more)

### Community 43 - "Brand Identity and Assets"
Cohesion: 0.39
Nodes (8): Angular Beveled Geometry Motif, MSK Scripts / Musiker15 Brand Identity, Green Gradient Color Language, Stylized Letter M Monogram, MSK Scripts Logo Mark (assets/logo.png), Rationale: Single-Letter Mark for Small Embed Thumbnails, Usage in Discord Ticket Setup Panel Embed, Transparent-Background Raster Brand Asset

### Community 44 - "Security and Process Isolation"
Cohesion: 0.29
Nodes (8): Decoupling asUser from requireCreator in ticket.reply, Closed Tickets Read-Only via Central Deny-List, Global allowedMentions Policy Blocks @everyone/@here, Locked-Ticket Flag Enforcement Beyond Discord Overwrites, Masked-Link Escaping Against Webhook Phishing, Dashboard Supervisor Forks the Bot as Child Process, v2.7.0 — Web dashboard, v2.7.1 — Dashboard replies posted under the sender's identity

### Community 45 - "Transcript Service and Licensing"
Cohesion: 0.25
Nodes (8): Transient-Failure Retry with Backoff for Transcript Upload, v2.9.2 — Transcript upload retry on transient failures, Graceful Degradation Without MSK_API_KEY, Mirror to Codeberg Workflow, Deleting refs/remotes/origin/HEAD Before Mirror Push, Serial Mirror Concurrency Guard, GNU Affero General Public License v3.0, Section 7 Additional Term: MSK Transcript Service Integration

### Community 46 - "Community and Security Guidelines"
Cohesion: 0.25
Nodes (8): Contributor Covenant Code of Conduct v2.0, Community Impact Enforcement Ladder, Mozilla Code of Conduct Enforcement Ladder (cited source), Contributing Guide, Private Security Disclosure Policy, GitHub Sponsors Funding (MSK-Scripts), Bug Report Issue Template, Feature Request Issue Template

### Community 47 - "src/config.js"
Cohesion: 0.13
Nodes (18): CONFIG_PATH, describeParseError(), EXAMPLE_PATH, fs, inspectConfig(), loadConfig(), path, stripJsonComments() (+10 more)

### Community 50 - "rateLimits.js"
Cohesion: 0.22
Nodes (11): build(), byClientIp(), createLimiters(), DEFAULT_LIMITS, { rateLimit, ipKeyGenerator }, retryAfterSeconds(), assert, { createLimiters } (+3 more)

### Community 51 - "priority.js"
Cohesion: 0.15
Nodes (13): execute(), { getTicketByChannel, setPriority }, { SlashCommandBuilder, MessageFlags }, { updateChannelTopic, refreshTicketMessage }, setPriority(), buildTicketButtons(), claimedByLabel(), refreshTicketMessage() (+5 more)

### Community 52 - "updateNotice.js"
Cohesion: 0.25
Nodes (10): updateAvailableEmbed(), { fetchLatestRelease, isNewer }, fs, path, readAnnounced(), runUpdateCheck(), shouldAnnounce(), STORE_FILE (+2 more)

### Community 54 - "Multi-Dialect Database Support"
Cohesion: 0.33
Nodes (6): npm run db:migrate SQLite-to-Target Migration Script, Engine-Agnostic Async Database Layer (DATABASE_URL), Multi-Tenant Guild Scoping (blacklist, loops, name cache), v2.6.0 — MySQL/MariaDB and PostgreSQL support, v2.9.1 — LONGTEXT transcript column on MySQL, Database Change Rules (inline migrations, three dialects)

### Community 55 - "Release and Commit Workflow"
Cohesion: 0.33
Nodes (6): Conventional Commits in English, Release Notes Label Categories, Auto Release Workflow, CHANGELOG Section Extraction (awk, string-based), Prerelease Detection from Tag Suffix, Tag vs package.json Version Consistency Check

### Community 56 - "Ticket Lock Commands"
Cohesion: 0.47
Nodes (5): execute(), { getTicketByChannel, lockTicket, unlockTicket }, { SlashCommandBuilder, MessageFlags }, lockTicket(), unlockTicket()

### Community 57 - "Ticket Note Commands"
Cohesion: 0.47
Nodes (5): execute(), { getTicketByChannel, addNote, getNotes }, { SlashCommandBuilder, EmbedBuilder, MessageFlags }, addNote(), getNotes()

### Community 58 - "stats.js"
Cohesion: 0.29
Nodes (9): execute(), { getStats, getUserStats }, { SlashCommandBuilder, MessageFlags }, { statsEmbed, userStatsEmbed }, getStats(), getTotalTicketCount(), getUserStats(), num() (+1 more)

### Community 59 - "package.json"
Cohesion: 0.25
Nodes (7): description, engines, node, license, main, name, version

### Community 60 - "Syntax Highlighting Utilities"
Cohesion: 0.60
Nodes (5): esc(), ESCAPE, highlight(), highlightEnv(), highlightJsonc()

### Community 61 - "update-notice.test.js"
Cohesion: 0.29
Nodes (7): resolveConfig(), startUpdateNotifier(), assert, cfg(), { isNewer, parseRelease }, { shouldAnnounce, resolveConfig, DEFAULT_INTERVAL_HOURS, MIN_INTERVAL_HOURS }, test

### Community 62 - "Auto-Close Management"
Cohesion: 0.50
Nodes (4): execute(), { getTicketByChannel, setAutoClosePaused }, { SlashCommandBuilder, MessageFlags }, setAutoClosePaused()

### Community 63 - "optionalDependencies"
Cohesion: 0.29
Nodes (7): express, express-rate-limit, helmet, optionalDependencies, express, express-rate-limit, helmet

### Community 64 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, dashboard, dashboard:setup, db:migrate, dev, start, test

### Community 65 - "User Resolution Tests"
Cohesion: 0.40
Nodes (3): assert, { resolveUsers }, test

### Community 69 - "Security Hardening and CodeQL"
Cohesion: 0.50
Nodes (4): Allow-List Path Resolution for Config and Locale Files, v2.7.2 — CodeQL hardening of the dashboard, CodeQL Advanced Analysis Workflow, security-extended + security-and-quality Query Packs

### Community 71 - "HTML Transcript Features"
Cohesion: 0.67
Nodes (3): Self-Contained Offline HTML Transcript (Base64 assets), v2.2.2 — Transcript attachments served from MSK server, v2.3.0 — Transcript copy button + transcriptLang

### Community 72 - "API Key Verification"
Cohesion: 0.67
Nodes (3): Per-Guild API Key Verification, Discord Verify OAuth App, Startup Console Output & Tier Detection

### Community 79 - "mskApi.js"
Cohesion: 0.21
Nodes (10): { captureFinalTranscript }, execute(), { getTicketByChannel }, { MessageFlags }, attemptUpload(), RETRYABLE_STATUS, sleep(), UPLOAD_RETRY_DELAYS_MS (+2 more)

### Community 90 - "versionCheck.js"
Cohesion: 0.70
Nodes (4): checkVersion(), fetchLatestRelease(), isNewer(), parseRelease()

### Community 106 - "attachment-budget.test.js"
Cohesion: 0.50
Nodes (3): assert, { resolveAttachmentBudget }, test

### Community 108 - "Permission Check Utilities"
Cohesion: 0.33
Nodes (6): BITFIELD, checkBotPermissions(), inviteUrl(), OPTIONAL, { PermissionFlagsBits }, REQUIRED

### Community 110 - "blacklist.js"
Cohesion: 0.43
Nodes (6): { addToBlacklist, removeFromBlacklist, isBlacklisted, getBlacklist }, execute(), { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags }, addToBlacklist(), getBlacklist(), removeFromBlacklist()

## Ambiguous Edges - Review These
- `AGPL Section 13 Remote Network Interaction` → `DASHBOARD_PUBLIC_PORTAL End-User Portal`  [AMBIGUOUS]
  LICENSE.md · relation: conceptually_related_to
- `Per-User Dashboard Language (7 translations)` → `Discord Ticket Bot (README EN)`  [AMBIGUOUS]
  docs/dashboard-en.md · relation: semantically_similar_to
- `Angular Beveled Geometry Motif` → `Green Gradient Color Language`  [AMBIGUOUS]
  assets/logo.png · relation: semantically_similar_to
- `Mirror to Codeberg Workflow` → `GNU Affero General Public License v3.0`  [AMBIGUOUS]
  .github/workflows/mirror.yml · relation: conceptually_related_to

## Knowledge Gaps
- **424 isolated node(s):** `{ loadDashboardConfig, validateDashboardConfig, ensureSessionSecret }`, `{ BotSupervisor }`, `docker-entrypoint.sh script`, `fs`, `path` (+419 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 583 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `AGPL Section 13 Remote Network Interaction` and `DASHBOARD_PUBLIC_PORTAL End-User Portal`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Per-User Dashboard Language (7 translations)` and `Discord Ticket Bot (README EN)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Angular Beveled Geometry Motif` and `Green Gradient Color Language`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Mirror to Codeberg Workflow` and `GNU Affero General Public License v3.0`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `getTicketByChannel()` connect `getTicketByChannel` to `panelSelect.js`, `database/index.js`, `utils/transcript.js`, `performClose`, `mskApi.js`, `Snippet Management System`, `Ticket Move Command`, `priority.js`, `Ticket Lock Commands`, `Ticket Note Commands`, `performReopen`, `Ticket Claim Command`, `Auto-Close Management`, `Ticket Unclaim Command`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `checkVersion()` connect `versionCheck.js` to `package.json`, `client.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `{ loadDashboardConfig, validateDashboardConfig, ensureSessionSecret }`, `{ BotSupervisor }`, `docker-entrypoint.sh script` to the rest of the system?**
  _424 weakly-connected nodes found - possible documentation gaps or missing edges._