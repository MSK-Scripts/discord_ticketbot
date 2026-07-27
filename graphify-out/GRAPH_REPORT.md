# Graph Report - .  (2026-07-27)

## Corpus Check
- 177 files · ~130,258 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1180 nodes · 1959 edges · 106 communities (84 shown, 22 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 230 edges (avg confidence: 0.58)
- Token cost: 584,357 input · 0 output

## Community Hubs (Navigation)
- Dashboard Frontend Shell
- Config & Env Form Editor
- Setup Panel & Bot IPC Bridge
- Supervisor Entrypoint & Guided Setup
- Dashboard Documentation & Transcript Previews
- Ticket Opening & Blacklist Gate
- Bot Runtime Dependencies
- Database Query API
- HTML Transcript Generation
- Dashboard Settings Store
- Ticket Member & Channel Commands
- OAuth Auth & Express Server
- Dashboard API Routes
- Bot Supervisor Process Control
- Ticket Close Lifecycle
- Session, CSRF & Rate Limiting
- Snippets & Canned Responses
- Dashboard Permission Model
- Close Command & Reason Modal
- Discord REST Client
- Dashboard UI Dependencies
- Bot Boot Flow & API Tier Check
- Embed Factories & Broadcast
- Hosted Customer Dashboard Screenshot
- Dependency-Light Build Philosophy
- Database URL Parsing & Migration
- Ticket Reopen Flow
- Delete Confirm & Interaction Router
- Transcript Preview Generator
- Ticket Claim Flow
- Ticket Move Flow
- Ticket Unclaim Flow
- Frontend Build Tooling
- Internationalization & Changelog Rules
- Dashboard Access Control Evolution
- Ticket Statistics
- Rating & Feedback Modals
- Dashboard i18n Tests
- Web Package Manifest
- Priority & Channel Topic Sync
- MSK Brand Identity
- Discord Message Security Hardening
- Transcript Upload Resilience & Licensing
- Community Governance Docs
- JSONC Config Loader
- Bot Entrypoint & TicketClient
- Config Validation Tests
- Slash Command Loader
- Multi-Engine Database Support
- Release Automation Conventions
- Ticket Lock Command
- Staff Notes Command
- Reply Notification Toggle
- Component Loader
- Syntax Highlighting
- Startup Banner & Version Check
- Auto-Close Pause Command
- Event Loader
- ANSI Console Logger
- Dashboard User Resolution Tests
- Alert Component
- CodeQL Security Scanning
- SQLite Driver
- Self-Contained Transcript Assets
- API Key Verification Flow
- Badge Component
- Button Component
- Panel Logo & Banner Assets
- Platform-Aware Proxy Setup
- Modern Transcript Design Release
- Class Variance Authority
- DM Sans Font
- Syne Font
- JSONC Parser Dependency
- Radix Dialog Primitive
- Radix Dropdown Primitive
- Radix Separator Primitive
- Radix Slot Primitive
- Radix Tabs Primitive
- Radix Tooltip Primitive
- React
- React DOM
- Tailwind Merge
- Transcript Accent Color Release
- Dependabot Actions Schedule

## God Nodes (most connected - your core abstractions)
1. `getTicketByChannel()` - 51 edges
2. `useT()` - 26 edges
3. `generateTranscript()` - 20 edges
4. `err()` - 20 edges
5. `registerRoutes()` - 19 edges
6. `BotSupervisor` - 15 edges
7. `openTicket()` - 15 edges
8. `startServer()` - 14 edges
9. `performCloseInner()` - 12 edges
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

## Communities (106 total, 22 thin omitted)

### Community 0 - "Dashboard Frontend Shell"
Cohesion: 0.05
Nodes (77): COLORS, parseAnsi(), api, ApiError, logout(), readCookie(), request(), allowed() (+69 more)

### Community 1 - "Config & Env Form Editor"
Cohesion: 0.08
Nodes (49): ConfigForm(), detectEol(), parseEnv(), setEnvValue(), splitLines(), unquote(), EnvEditor(), isTruthy() (+41 more)

### Community 2 - "Setup Panel & Bot IPC Bridge"
Cohesion: 0.05
Nodes (49): { buildTicketPanel }, execute(), { savePanelMessage }, {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
}, ALLOWED_WHEN_CLOSED, assertMutable(), db, ESCAPE_UNTRUSTED (+41 more)

### Community 3 - "Supervisor Entrypoint & Guided Setup"
Cohesion: 0.07
Nodes (42): { BotSupervisor }, installShutdownHandlers(), { loadDashboardConfig, validateDashboardConfig, ensureSessionSecret }, main(), crypto, ENV_PATH, fs, main() (+34 more)

### Community 4 - "Dashboard Documentation & Transcript Previews"
Cohesion: 0.06
Nodes (43): Web-Dashboard Guide (DE), Per-User Dashboard Language (7 translations), Discord OAuth Login (identify scope), Dashboard Permission Model, Public End-User Portal (DASHBOARD_PUBLIC_PORTAL), Reverse Proxy with HTTPS, Safe-by-Default Dashboard Exposure, Service Manager vs Reverse Proxy Layers (+35 more)

### Community 5 - "Ticket Opening & Blacklist Gate"
Cohesion: 0.11
Nodes (31): { addToBlacklist, removeFromBlacklist, isBlacklisted, getBlacklist }, execute(), { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags }, buildQuestionsModal(), execute(), { isBlacklisted, getOpenTicketsByUser }, {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags,
}, { openTicket } (+23 more)

### Community 6 - "Bot Runtime Dependencies"
Cohesion: 0.06
Nodes (32): better-sqlite3, discord.js, dotenv, express, helmet, mysql2, dependencies, better-sqlite3 (+24 more)

### Community 7 - "Database Query API"
Cohesion: 0.09
Nodes (16): applySchema(), clampInt(), countTickets(), createDriver(), { getCreateStatements, getMigrations }, getDashboardAudit(), initDatabase(), listTickets() (+8 more)

### Community 8 - "HTML Transcript Generation"
Cohesion: 0.15
Nodes (26): execute(), { generateTranscript }, { getTicketByChannel }, { SlashCommandBuilder, AttachmentBuilder, MessageFlags }, buildAvatarMap(), buildChannelMap(), buildEmojiMap(), buildMessageRows() (+18 more)

### Community 9 - "Dashboard Settings Store"
Cohesion: 0.11
Nodes (25): clearFavicon(), DATA_DIR, detectFaviconType(), ensureDataDir(), FAVICON_BASE, FAVICON_TYPES, fs, getFaviconFile() (+17 more)

### Community 10 - "Ticket Member & Channel Commands"
Cohesion: 0.10
Nodes (20): execute(), { getTicketByChannel }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel } (+12 more)

### Community 11 - "OAuth Auth & Express Server"
Cohesion: 0.12
Nodes (24): buildAuthorizeUrl(), exchangeCode(), fetchOAuthUser(), { redirectUri }, redirectUri(), { buildAuthorizeUrl, exchangeCode, fetchOAuthUser }, db, express (+16 more)

### Community 12 - "Dashboard API Routes"
Cohesion: 0.11
Nodes (22): PERMISSION_LABELS, asyncRoute(), audit(), CONFIG_FILES, configPath(), db, express, fs (+14 more)

### Community 13 - "Bot Supervisor Process Control"
Cohesion: 0.14
Nodes (9): BOT_ENTRY, BotSupervisor, ENV_PATH, EventEmitter, { fork }, fs, path, ROOT (+1 more)

### Community 14 - "Ticket Close Lifecycle"
Cohesion: 0.12
Nodes (21): ratingRequestEmbed(), ticketClosedDMEmbed(), ticketClosedEmbed(), ALLOWED_ATTACHMENT_EXTS, buildClosedButtons(), buildRatingRow(), closingChannels, collectAttachments() (+13 more)

### Community 15 - "Session, CSRF & Rate Limiting"
Cohesion: 0.15
Nodes (15): b64url(), buckets, createOAuthState(), createSession(), createToken(), crypto, getSecret(), safeEqual() (+7 more)

### Community 16 - "Snippets & Canned Responses"
Cohesion: 0.20
Nodes (14): autocomplete(), execute(), { getAllSnippets, getSnippet, applyPlaceholders }, { getTicketByChannel }, {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
}, applyPlaceholders(), describeParseError(), fs (+6 more)

### Community 17 - "Dashboard Permission Model"
Cohesion: 0.21
Nodes (15): canUseDashboard(), checkSelfEdit(), hasPermission(), isPermission(), isSubjectType(), parsePermissions(), PERMISSIONS, resolvePermissions() (+7 more)

### Community 18 - "Close Command & Reason Modal"
Cohesion: 0.15
Nodes (13): execute(), { getTicketByChannel }, { performClose }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
}, { performClose } (+5 more)

### Community 19 - "Discord REST Client"
Cohesion: 0.24
Nodes (14): avatarUrl(), cacheUser(), DiscordApiError, getChannelMessages(), getGuild(), getGuildChannels(), getGuildLookups(), getGuildMember() (+6 more)

### Community 20 - "Dashboard UI Dependencies"
Cohesion: 0.13
Nodes (15): clsx, @fontsource/space-mono, lucide-react, @radix-ui/react-label, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-switch, dependencies (+7 more)

### Community 21 - "Bot Boot Flow & API Tier Check"
Cohesion: 0.15
Nodes (13): { checkApiKey }, { checkVersion }, { Client, GatewayIntentBits, Partials, Collection }, { initDatabase }, { loadCommands }, { loadComponents }, { loadConfig, validateConfig }, { loadEvents } (+5 more)

### Community 22 - "Embed Factories & Broadcast"
Cohesion: 0.23
Nodes (12): execute(), { getAllOpenTickets }, { parseColor }, { SlashCommandBuilder, EmbedBuilder, MessageFlags }, getAllOpenTickets(), { EmbedBuilder, Colors }, formatDuration(), panelEmbed() (+4 more)

### Community 23 - "Hosted Customer Dashboard Screenshot"
Cohesion: 0.21
Nodes (13): Hosted Bot Dashboard Screenshot (msk-scripts.de), Generate new API key / Documentation / Logout Actions, Bot Boot Log Output (Components, Ready, Bridge, StaffReminder), Bot Control Panel (Start/Restart/Stop/Update), MSK Dark Theme with Green Accent Design Language, Dashboard IPC Bridge Active (log evidence), Live Logs Console (real-time stream, Clear/Disconnect), Open Bot Dashboard Deep-Link Card (+5 more)

### Community 24 - "Dependency-Light Build Philosophy"
Cohesion: 0.17
Nodes (12): Auto-Close Routed Through Shared performClose Flow, Committed web/dist so Self-Hosters Never Build, node:test Built-In Test Suite (zero new dependencies), express/helmet as optionalDependencies, package.json overrides Forcing undici ^6.27.0, v2.5.1 — Auto-close parity + undici advisories patched, Coding Conventions (CommonJS, tb_ prefix, client.logger), Dependency-Light, No-Build-Step Principle (+4 more)

### Community 25 - "Database URL Parsing & Migration"
Cohesion: 0.18
Nodes (7): { DEFAULT_SQLITE_PATH }, { openDatabase }, path, TABLES, DEFAULT_SQLITE_PATH, parseDatabaseUrl(), path

### Community 26 - "Ticket Reopen Flow"
Cohesion: 0.20
Nodes (10): execute(), { getTicketByChannel }, { performReopen }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performReopen } (+2 more)

### Community 27 - "Delete Confirm & Interaction Router"
Cohesion: 0.20
Nodes (10): { captureFinalTranscript }, execute(), { getTicketByChannel }, { MessageFlags }, execute(), { MessageFlags }, sleep(), uploadTranscript() (+2 more)

### Community 28 - "Transcript Preview Generator"
Cohesion: 0.20
Nodes (10): channel, fs, { generateTranscript }, guild, member(), MEMBERS, messages, msg() (+2 more)

### Community 29 - "Ticket Claim Flow"
Cohesion: 0.22
Nodes (9): execute(), { getTicketByChannel }, { performClaim }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performClaim } (+1 more)

### Community 30 - "Ticket Move Flow"
Cohesion: 0.20
Nodes (9): execute(), { getTicketByChannel }, { performMove }, {
  SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ActionRowBuilder, MessageFlags,
}, execute(), { getTicketByChannel }, { MessageFlags }, { performMove } (+1 more)

### Community 31 - "Ticket Unclaim Flow"
Cohesion: 0.22
Nodes (9): execute(), { getTicketByChannel }, { performUnclaim }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performUnclaim } (+1 more)

### Community 32 - "Frontend Build Tooling"
Cohesion: 0.18
Nodes (11): tailwindcss, @tailwindcss/vite, tw-animate-css, vite, @vitejs/plugin-react, devDependencies, tailwindcss, @tailwindcss/vite (+3 more)

### Community 35 - "Internationalization & Changelog Rules"
Cohesion: 0.20
Nodes (10): Auto-Refreshing /setup Panel via panel_messages Table, Per-Ticket Auto-Close Pause (auto_close_paused), Dashboard UI Internationalization (per-browser language), Keep a Changelog + SemVer Convention, Transcript UI Strings Moved into Locale Files, v2.13.0 — Dashboard i18n with per-user language, v2.4.0 — Auto-refreshing ticket panel + Hungarian locale, v2.9.0 — Four new bot languages (fr, es, pt, pl) (+2 more)

### Community 36 - "Dashboard Access Control Evolution"
Cohesion: 0.22
Nodes (10): Dashboard Permission Model (user entry overrides role entries), Dashboard History Router and Deep Links, .env Editor Restricted to Guild Owner, DASHBOARD_PUBLIC_PORTAL End-User Portal, Delegatable Dashboard Settings Permissions, Trusted-Proxy Authentication (identity vouching, live permissions), v2.11.0 — autoclose pause + public end-user portal, v2.12.0 — settings.view / settings.edit permissions (+2 more)

### Community 37 - "Ticket Statistics"
Cohesion: 0.29
Nodes (9): execute(), { getStats, getUserStats }, { SlashCommandBuilder, MessageFlags }, { statsEmbed, userStatsEmbed }, getStats(), getTotalTicketCount(), getUserStats(), num() (+1 more)

### Community 38 - "Rating & Feedback Modals"
Cohesion: 0.27
Nodes (8): execute(), { getRating }, {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
}, { EmbedBuilder, MessageFlags }, execute(), { getRating, addRating }, addRating(), getRating()

### Community 39 - "Dashboard i18n Tests"
Cohesion: 0.20
Nodes (5): assert, fs, LOCALES_DIR, path, test

### Community 40 - "Web Package Manifest"
Cohesion: 0.20
Nodes (9): description, name, private, scripts, build, dev, preview, type (+1 more)

### Community 42 - "Priority & Channel Topic Sync"
Cohesion: 0.31
Nodes (8): execute(), { getTicketByChannel, setPriority }, { SlashCommandBuilder, MessageFlags }, { updateChannelTopic, refreshTicketMessage }, setPriority(), buildTicketButtons(), refreshTicketMessage(), updateChannelTopic()

### Community 43 - "MSK Brand Identity"
Cohesion: 0.39
Nodes (8): Angular Beveled Geometry Motif, MSK Scripts / Musiker15 Brand Identity, Green Gradient Color Language, Stylized Letter M Monogram, MSK Scripts Logo Mark (assets/logo.png), Rationale: Single-Letter Mark for Small Embed Thumbnails, Usage in Discord Ticket Setup Panel Embed, Transparent-Background Raster Brand Asset

### Community 44 - "Discord Message Security Hardening"
Cohesion: 0.29
Nodes (8): Decoupling asUser from requireCreator in ticket.reply, Closed Tickets Read-Only via Central Deny-List, Global allowedMentions Policy Blocks @everyone/@here, Locked-Ticket Flag Enforcement Beyond Discord Overwrites, Masked-Link Escaping Against Webhook Phishing, Dashboard Supervisor Forks the Bot as Child Process, v2.7.0 — Web dashboard, v2.7.1 — Dashboard replies posted under the sender's identity

### Community 45 - "Transcript Upload Resilience & Licensing"
Cohesion: 0.25
Nodes (8): Transient-Failure Retry with Backoff for Transcript Upload, v2.9.2 — Transcript upload retry on transient failures, Graceful Degradation Without MSK_API_KEY, Mirror to Codeberg Workflow, Deleting refs/remotes/origin/HEAD Before Mirror Push, Serial Mirror Concurrency Guard, GNU Affero General Public License v3.0, Section 7 Additional Term: MSK Transcript Service Integration

### Community 46 - "Community Governance Docs"
Cohesion: 0.25
Nodes (8): Contributor Covenant Code of Conduct v2.0, Community Impact Enforcement Ladder, Mozilla Code of Conduct Enforcement Ladder (cited source), Contributing Guide, Private Security Disclosure Policy, GitHub Sponsors Funding (MSK-Scripts), Bug Report Issue Template, Feature Request Issue Template

### Community 47 - "JSONC Config Loader"
Cohesion: 0.32
Nodes (7): CONFIG_PATH, describeParseError(), EXAMPLE_PATH, fs, loadConfig(), path, stripJsonComments()

### Community 50 - "Bot Entrypoint & TicketClient"
Cohesion: 0.29
Nodes (3): client, { TicketClient }, TicketClient

### Community 51 - "Config Validation Tests"
Cohesion: 0.33
Nodes (5): validateConfig(), assert, errorsOf(), test, { validateConfig }

### Community 52 - "Slash Command Loader"
Cohesion: 0.33
Nodes (6): COMMANDS_DIR, fs, getFiles(), loadCommands(), path, { REST, Routes }

### Community 54 - "Multi-Engine Database Support"
Cohesion: 0.33
Nodes (6): npm run db:migrate SQLite-to-Target Migration Script, Engine-Agnostic Async Database Layer (DATABASE_URL), Multi-Tenant Guild Scoping (blacklist, loops, name cache), v2.6.0 — MySQL/MariaDB and PostgreSQL support, v2.9.1 — LONGTEXT transcript column on MySQL, Database Change Rules (inline migrations, three dialects)

### Community 55 - "Release Automation Conventions"
Cohesion: 0.33
Nodes (6): Conventional Commits in English, Release Notes Label Categories, Auto Release Workflow, CHANGELOG Section Extraction (awk, string-based), Prerelease Detection from Tag Suffix, Tag vs package.json Version Consistency Check

### Community 56 - "Ticket Lock Command"
Cohesion: 0.47
Nodes (5): execute(), { getTicketByChannel, lockTicket, unlockTicket }, { SlashCommandBuilder, MessageFlags }, lockTicket(), unlockTicket()

### Community 57 - "Staff Notes Command"
Cohesion: 0.47
Nodes (5): execute(), { getTicketByChannel, addNote, getNotes }, { SlashCommandBuilder, EmbedBuilder, MessageFlags }, addNote(), getNotes()

### Community 58 - "Reply Notification Toggle"
Cohesion: 0.47
Nodes (5): {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
}, buildNotifyButton(), execute(), { getTicketByChannel, setNotifyOnReply }, setNotifyOnReply()

### Community 59 - "Component Loader"
Cohesion: 0.40
Nodes (5): COMPONENTS_DIR, fs, getFiles(), loadComponents(), path

### Community 60 - "Syntax Highlighting"
Cohesion: 0.60
Nodes (5): esc(), ESCAPE, highlight(), highlightEnv(), highlightJsonc()

### Community 61 - "Startup Banner & Version Check"
Cohesion: 0.50
Nodes (3): printBanner(), checkVersion(), isNewer()

### Community 62 - "Auto-Close Pause Command"
Cohesion: 0.50
Nodes (4): execute(), { getTicketByChannel, setAutoClosePaused }, { SlashCommandBuilder, MessageFlags }, setAutoClosePaused()

### Community 63 - "Event Loader"
Cohesion: 0.40
Nodes (4): EVENTS_DIR, fs, loadEvents(), path

### Community 64 - "ANSI Console Logger"
Cohesion: 0.50
Nodes (4): COLORS, format(), logger, timestamp()

### Community 65 - "Dashboard User Resolution Tests"
Cohesion: 0.40
Nodes (3): assert, { resolveUsers }, test

### Community 69 - "CodeQL Security Scanning"
Cohesion: 0.50
Nodes (4): Allow-List Path Resolution for Config and Locale Files, v2.7.2 — CodeQL hardening of the dashboard, CodeQL Advanced Analysis Workflow, security-extended + security-and-quality Query Packs

### Community 71 - "Self-Contained Transcript Assets"
Cohesion: 0.67
Nodes (3): Self-Contained Offline HTML Transcript (Base64 assets), v2.2.2 — Transcript attachments served from MSK server, v2.3.0 — Transcript copy button + transcriptLang

### Community 72 - "API Key Verification Flow"
Cohesion: 0.67
Nodes (3): Per-Guild API Key Verification, Discord Verify OAuth App, Startup Console Output & Tier Detection

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
- **Why does `err()` connect `Delete Confirm & Interaction Router` to `Config & Env Form Editor`, `Setup Panel & Bot IPC Bridge`, `Ticket Opening & Blacklist Gate`, `HTML Transcript Generation`, `Ticket Member & Channel Commands`, `OAuth Auth & Express Server`, `Ticket Close Lifecycle`, `JSONC Config Loader`, `Snippets & Canned Responses`, `Slash Command Loader`, `Component Loader`, `Event Loader`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `startServer()` connect `OAuth Auth & Express Server` to `Dashboard Frontend Shell`, `Dashboard Permission Model`, `Delete Confirm & Interaction Router`, `Dashboard API Routes`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._