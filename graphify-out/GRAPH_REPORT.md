# Graph Report - discord_ticketbot  (2026-08-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1184 nodes · 1943 edges · 112 communities (89 shown, 23 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 205 edges (avg confidence: 0.84)
- Token cost: 4,445 input · 1,278 output

## Graph Freshness
- Built from commit: `3e93c407`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- API and Cookie Utilities
- Environment Configuration Forms
- Bot Bridge and Webhooks
- Dashboard Server Setup
- Dashboard Documentation and Features
- Ticket Creation Modals
- Database Driver Dependencies
- Database Schema and Operations
- Transcript Generation Utilities
- Dashboard Settings and Favicons
- Ticket Management Commands
- OAuth and Server Auth
- Dashboard Route Registration
- Bot Process Supervisor
- Ticket Closing Logic
- Security and Session Management
- Snippet Management System
- Permission Logic and Tests
- Ticket Move Command
- Discord API Integration
- Frontend UI Dependencies
- Bot Client Initialization
- Ticket Statistics and Broadcasts
- Dashboard UI Features
- Development and Release Policies
- Database Migration Tools
- Ticket Reopen Command
- Interaction Create Event
- Transcript Preview Utility
- Ticket Claim Command
- Ticket Panel Setup
- Ticket Unclaim Command
- Vite and Tailwind Build
- Localization and Auto-Refresh
- Access Control and Authentication
- Bot Ready Event Tasks
- Ticket Rating System
- Internationalization Tests
- Web Package Configuration
- Blacklist Management
- Brand Identity and Assets
- Security and Process Isolation
- Transcript Service and Licensing
- Community and Security Guidelines
- Configuration Loading and Validation
- Ticket Client Core
- Ticket Priority Management
- Command Loading Handler
- Multi-Dialect Database Support
- Release and Commit Workflow
- Ticket Lock Commands
- Ticket Note Commands
- Notification Toggle Command
- Component Loading Handler
- Syntax Highlighting Utilities
- Package Metadata and Versioning
- Auto-Close Management
- Event Loading Handler
- Logging Utility
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
- Transcript Upload Service
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
- NPM Scripts
- Tailwind Merge Utility
- Software Release Notes
- Dependency Update Configuration
- Activity Tracking Events
- React Icon Library
- Permission Check Utilities
- Optional Server Dependencies
- Component Style Management

## God Nodes (most connected - your core abstractions)
1. `getTicketByChannel()` - 51 edges
2. `useT()` - 26 edges
3. `generateTranscript()` - 20 edges
4. `registerRoutes()` - 16 edges
5. `BotSupervisor` - 15 edges
6. `startServer()` - 15 edges
7. `openTicket()` - 15 edges
8. `performCloseInner()` - 11 edges
9. `performClose()` - 11 edges
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

## Communities (112 total, 23 thin omitted)

### Community 0 - "API and Cookie Utilities"
Cohesion: 0.05
Nodes (78): COLORS, parseAnsi(), api, ApiError, logout(), readCookie(), request(), allowed() (+70 more)

### Community 1 - "Environment Configuration Forms"
Cohesion: 0.07
Nodes (50): ConfigForm(), detectEol(), parseEnv(), setEnvValue(), splitLines(), unquote(), EnvEditor(), isTruthy() (+42 more)

### Community 2 - "Bot Bridge and Webhooks"
Cohesion: 0.13
Nodes (16): ALLOWED_WHEN_CLOSED, assertMutable(), db, ESCAPE_UNTRUSTED, { escapeMarkdown }, { performClose, performReopen, performMove, performClaim, performUnclaim }, registerBotBridge(), sanitizeUserText() (+8 more)

### Community 3 - "Dashboard Server Setup"
Cohesion: 0.06
Nodes (42): { BotSupervisor }, installShutdownHandlers(), { loadDashboardConfig, validateDashboardConfig, ensureSessionSecret }, main(), crypto, ENV_PATH, fs, main() (+34 more)

### Community 4 - "Dashboard Documentation and Features"
Cohesion: 0.06
Nodes (43): Web-Dashboard Guide (DE), Per-User Dashboard Language (7 translations), Discord OAuth Login (identify scope), Dashboard Permission Model, Public End-User Portal (DASHBOARD_PUBLIC_PORTAL), Reverse Proxy with HTTPS, Safe-by-Default Dashboard Exposure, Service Manager vs Reverse Proxy Layers (+35 more)

### Community 5 - "Ticket Creation Modals"
Cohesion: 0.14
Nodes (25): buildQuestionsModal(), execute(), { isBlacklisted, getOpenTicketsByUser }, {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags,
}, { openTicket }, {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
}, buildFreshPanelRow(), { buildQuestionsModal } (+17 more)

### Community 6 - "Database Driver Dependencies"
Cohesion: 0.18
Nodes (11): better-sqlite3, dotenv, mysql2, dependencies, better-sqlite3, discord.js, dotenv, mysql2 (+3 more)

### Community 7 - "Database Schema and Operations"
Cohesion: 0.09
Nodes (16): applySchema(), clampInt(), countTickets(), { getCreateStatements, getMigrations }, getDashboardAudit(), getTotalTicketCount(), getUserStats(), listTickets() (+8 more)

### Community 8 - "Transcript Generation Utilities"
Cohesion: 0.15
Nodes (26): execute(), { generateTranscript }, { getTicketByChannel }, { SlashCommandBuilder, AttachmentBuilder, MessageFlags }, buildAvatarMap(), buildChannelMap(), buildEmojiMap(), buildMessageRows() (+18 more)

### Community 9 - "Dashboard Settings and Favicons"
Cohesion: 0.11
Nodes (25): clearFavicon(), DATA_DIR, detectFaviconType(), ensureDataDir(), FAVICON_BASE, FAVICON_TYPES, fs, getFaviconFile() (+17 more)

### Community 10 - "Ticket Management Commands"
Cohesion: 0.07
Nodes (29): execute(), { getTicketByChannel }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { performClose }, { SlashCommandBuilder, MessageFlags }, execute() (+21 more)

### Community 11 - "OAuth and Server Auth"
Cohesion: 0.11
Nodes (26): buildAuthorizeUrl(), exchangeCode(), fetchOAuthUser(), { redirectUri }, redirectUri(), canUseDashboard(), { buildAuthorizeUrl, exchangeCode, fetchOAuthUser }, db (+18 more)

### Community 12 - "Dashboard Route Registration"
Cohesion: 0.14
Nodes (18): isPermission(), parsePermissions(), asyncRoute(), audit(), CONFIG_FILES, configPath(), db, express (+10 more)

### Community 13 - "Bot Process Supervisor"
Cohesion: 0.14
Nodes (9): BOT_ENTRY, BotSupervisor, ENV_PATH, EventEmitter, { fork }, fs, path, ROOT (+1 more)

### Community 14 - "Ticket Closing Logic"
Cohesion: 0.11
Nodes (21): ratingRequestEmbed(), ticketClosedDMEmbed(), ticketClosedEmbed(), ALLOWED_ATTACHMENT_EXTS, buildClosedButtons(), buildRatingRow(), closingChannels, collectAttachments() (+13 more)

### Community 15 - "Security and Session Management"
Cohesion: 0.15
Nodes (15): b64url(), buckets, createOAuthState(), createSession(), createToken(), crypto, getSecret(), safeEqual() (+7 more)

### Community 16 - "Snippet Management System"
Cohesion: 0.20
Nodes (14): autocomplete(), execute(), { getAllSnippets, getSnippet, applyPlaceholders }, { getTicketByChannel }, {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
}, applyPlaceholders(), describeParseError(), fs (+6 more)

### Community 17 - "Permission Logic and Tests"
Cohesion: 0.16
Nodes (15): checkSelfEdit(), hasPermission(), isSubjectType(), PERMISSION_LABELS, PERMISSIONS, resolvePermissions(), selectAccessRows(), SUBJECT_TYPES (+7 more)

### Community 18 - "Ticket Move Command"
Cohesion: 0.20
Nodes (9): execute(), { getTicketByChannel }, { performMove }, {
  SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ActionRowBuilder, MessageFlags,
}, execute(), { getTicketByChannel }, { MessageFlags }, { performMove } (+1 more)

### Community 19 - "Discord API Integration"
Cohesion: 0.24
Nodes (14): avatarUrl(), cacheUser(), DiscordApiError, getChannelMessages(), getGuild(), getGuildChannels(), getGuildLookups(), getGuildMember() (+6 more)

### Community 20 - "Frontend UI Dependencies"
Cohesion: 0.13
Nodes (15): clsx, @fontsource/space-mono, @radix-ui/react-label, @radix-ui/react-scroll-area, @radix-ui/react-select, @radix-ui/react-switch, react, dependencies (+7 more)

### Community 21 - "Bot Client Initialization"
Cohesion: 0.15
Nodes (13): { checkApiKey }, { checkVersion }, { Client, GatewayIntentBits, Partials, Collection }, { initDatabase }, { loadCommands }, { loadComponents }, { loadConfig, validateConfig }, { loadEvents } (+5 more)

### Community 22 - "Ticket Statistics and Broadcasts"
Cohesion: 0.18
Nodes (16): execute(), { getAllOpenTickets }, { parseColor }, { SlashCommandBuilder, EmbedBuilder, MessageFlags }, execute(), { getStats, getUserStats }, { SlashCommandBuilder, MessageFlags }, { statsEmbed, userStatsEmbed } (+8 more)

### Community 23 - "Dashboard UI Features"
Cohesion: 0.21
Nodes (13): Hosted Bot Dashboard Screenshot (msk-scripts.de), Generate new API key / Documentation / Logout Actions, Bot Boot Log Output (Components, Ready, Bridge, StaffReminder), Bot Control Panel (Start/Restart/Stop/Update), MSK Dark Theme with Green Accent Design Language, Dashboard IPC Bridge Active (log evidence), Live Logs Console (real-time stream, Clear/Disconnect), Open Bot Dashboard Deep-Link Card (+5 more)

### Community 24 - "Development and Release Policies"
Cohesion: 0.17
Nodes (12): Auto-Close Routed Through Shared performClose Flow, Committed web/dist so Self-Hosters Never Build, node:test Built-In Test Suite (zero new dependencies), express/helmet as optionalDependencies, package.json overrides Forcing undici ^6.27.0, v2.5.1 — Auto-close parity + undici advisories patched, Coding Conventions (CommonJS, tb_ prefix, client.logger), Dependency-Light, No-Build-Step Principle (+4 more)

### Community 25 - "Database Migration Tools"
Cohesion: 0.15
Nodes (10): { DEFAULT_SQLITE_PATH }, { openDatabase }, path, TABLES, createDriver(), initDatabase(), openDatabase(), DEFAULT_SQLITE_PATH (+2 more)

### Community 26 - "Ticket Reopen Command"
Cohesion: 0.20
Nodes (10): execute(), { getTicketByChannel }, { performReopen }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performReopen } (+2 more)

### Community 28 - "Transcript Preview Utility"
Cohesion: 0.20
Nodes (10): channel, fs, { generateTranscript }, guild, member(), MEMBERS, messages, msg() (+2 more)

### Community 29 - "Ticket Claim Command"
Cohesion: 0.22
Nodes (9): execute(), { getTicketByChannel }, { performClaim }, { SlashCommandBuilder, MessageFlags }, execute(), { getTicketByChannel }, { MessageFlags }, { performClaim } (+1 more)

### Community 30 - "Ticket Panel Setup"
Cohesion: 0.21
Nodes (11): { buildTicketPanel }, execute(), { savePanelMessage }, {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
}, savePanelMessage(), panelEmbed(), {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
}, buildTicketPanel() (+3 more)

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

### Community 37 - "Bot Ready Event Tasks"
Cohesion: 0.16
Nodes (18): deletePanelMessage(), getInactiveTickets(), getPanelMessage(), getStats(), getTicketsNeedingStaffReminder(), setStaffReminded(), ACTIVITY_TYPE_MAP, { ActivityType } (+10 more)

### Community 38 - "Ticket Rating System"
Cohesion: 0.27
Nodes (8): execute(), { getRating }, {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
}, { EmbedBuilder, MessageFlags }, execute(), { getRating, addRating }, addRating(), getRating()

### Community 39 - "Internationalization Tests"
Cohesion: 0.20
Nodes (5): assert, fs, LOCALES_DIR, path, test

### Community 40 - "Web Package Configuration"
Cohesion: 0.20
Nodes (9): description, name, private, scripts, build, dev, preview, type (+1 more)

### Community 42 - "Blacklist Management"
Cohesion: 0.43
Nodes (6): { addToBlacklist, removeFromBlacklist, isBlacklisted, getBlacklist }, execute(), { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags }, addToBlacklist(), getBlacklist(), removeFromBlacklist()

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

### Community 47 - "Configuration Loading and Validation"
Cohesion: 0.17
Nodes (12): CONFIG_PATH, describeParseError(), EXAMPLE_PATH, fs, loadConfig(), path, stripJsonComments(), validateConfig() (+4 more)

### Community 50 - "Ticket Client Core"
Cohesion: 0.29
Nodes (3): client, { TicketClient }, TicketClient

### Community 51 - "Ticket Priority Management"
Cohesion: 0.31
Nodes (8): execute(), { getTicketByChannel, setPriority }, { SlashCommandBuilder, MessageFlags }, { updateChannelTopic, refreshTicketMessage }, setPriority(), buildTicketButtons(), refreshTicketMessage(), updateChannelTopic()

### Community 52 - "Command Loading Handler"
Cohesion: 0.33
Nodes (6): COMMANDS_DIR, fs, getFiles(), loadCommands(), path, { REST, Routes }

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

### Community 58 - "Notification Toggle Command"
Cohesion: 0.47
Nodes (5): {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
}, buildNotifyButton(), execute(), { getTicketByChannel, setNotifyOnReply }, setNotifyOnReply()

### Community 59 - "Component Loading Handler"
Cohesion: 0.40
Nodes (5): COMPONENTS_DIR, fs, getFiles(), loadComponents(), path

### Community 60 - "Syntax Highlighting Utilities"
Cohesion: 0.60
Nodes (5): esc(), ESCAPE, highlight(), highlightEnv(), highlightJsonc()

### Community 61 - "Package Metadata and Versioning"
Cohesion: 0.22
Nodes (9): description, engines, node, license, main, name, version, checkVersion() (+1 more)

### Community 62 - "Auto-Close Management"
Cohesion: 0.50
Nodes (4): execute(), { getTicketByChannel, setAutoClosePaused }, { SlashCommandBuilder, MessageFlags }, setAutoClosePaused()

### Community 63 - "Event Loading Handler"
Cohesion: 0.29
Nodes (5): printBanner(), EVENTS_DIR, fs, loadEvents(), path

### Community 64 - "Logging Utility"
Cohesion: 0.50
Nodes (4): COLORS, format(), logger, timestamp()

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

### Community 79 - "Transcript Upload Service"
Cohesion: 0.19
Nodes (11): { captureFinalTranscript }, execute(), { getTicketByChannel }, { MessageFlags }, attemptUpload(), getTranscriptUrl(), RETRYABLE_STATUS, sleep() (+3 more)

### Community 90 - "NPM Scripts"
Cohesion: 0.29
Nodes (7): scripts, dashboard, dashboard:setup, db:migrate, dev, start, test

### Community 106 - "Activity Tracking Events"
Cohesion: 0.60
Nodes (4): setLastNotifySent(), updateLastActivity(), execute(), { updateLastActivity, getTicketByChannel, setLastNotifySent }

### Community 108 - "Permission Check Utilities"
Cohesion: 0.33
Nodes (6): BITFIELD, checkBotPermissions(), inviteUrl(), OPTIONAL, { PermissionFlagsBits }, REQUIRED

### Community 109 - "Optional Server Dependencies"
Cohesion: 0.40
Nodes (5): express, helmet, optionalDependencies, express, helmet

## Ambiguous Edges - Review These
- `Open Bot Dashboard Deep-Link Card` → `Premium Upsell (14 days free, billed monthly)`  [AMBIGUOUS]
  assets/dashboard-hosted.png · relation: conceptually_related_to
- `AGPL Section 13 Remote Network Interaction` → `DASHBOARD_PUBLIC_PORTAL End-User Portal`  [AMBIGUOUS]
  LICENSE.md · relation: conceptually_related_to
- `Per-User Dashboard Language (7 translations)` → `Discord Ticket Bot (README EN)`  [AMBIGUOUS]
  docs/dashboard-en.md · relation: semantically_similar_to
- `Angular Beveled Geometry Motif` → `Green Gradient Color Language`  [AMBIGUOUS]
  assets/logo.png · relation: semantically_similar_to
- `Mirror to Codeberg Workflow` → `GNU Affero General Public License v3.0`  [AMBIGUOUS]
  .github/workflows/mirror.yml · relation: conceptually_related_to

## Knowledge Gaps
- **388 isolated node(s):** `COLORS`, `NAV`, `ITEMS`, `BUNDLES`, `I18nContext` (+383 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Open Bot Dashboard Deep-Link Card` and `Premium Upsell (14 days free, billed monthly)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `AGPL Section 13 Remote Network Interaction` and `DASHBOARD_PUBLIC_PORTAL End-User Portal`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Per-User Dashboard Language (7 translations)` and `Discord Ticket Bot (README EN)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Angular Beveled Geometry Motif` and `Green Gradient Color Language`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Mirror to Codeberg Workflow` and `GNU Affero General Public License v3.0`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `checkVersion()` connect `Package Metadata and Versioning` to `Bot Client Initialization`, `Event Loading Handler`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `BotSupervisor` connect `Bot Process Supervisor` to `Dashboard Server Setup`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._