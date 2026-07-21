#!/usr/bin/env node
/**
 * Guided dashboard setup (`npm run dashboard:setup`).
 *
 * The dashboard can restart the bot and edit .env, so a badly exposed one is a
 * serious problem. This wizard exists so that the safe path is also the easy
 * path: it generates the signing secret, walks through the Discord OAuth setup,
 * prints a ready-to-paste Apache + certbot config, and REFUSES to write an
 * insecure combination instead of quietly allowing it.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline/promises');
const { stdin: input, stdout: output } = require('process');

const { setEnvValue, dedupeEnv } = require('../src/dashboard/envFile');

const ENV_PATH = path.resolve(__dirname, '../.env');

// The wizard is cross-platform; only the reverse-proxy, service and remote-access
// guidance differs between a Linux host (Apache/systemd) and a Windows host
// (IIS/Caddy/Windows service). Detected once here and used to branch that output.
const isWindows = process.platform === 'win32';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

async function main() {
  const rl = readline.createInterface({ input, output });
  const ask = async (q, def) => {
    const answer = (await rl.question(`${q}${def ? ` ${DIM}[${def}]${RESET}` : ''}: `)).trim();
    return answer || def || '';
  };

  console.log('');
  console.log(`${BOLD}Ticket Bot — Dashboard setup${RESET}`);
  console.log(`${DIM}This configures the web dashboard. Press Ctrl+C to abort at any time.${RESET}`);
  console.log('');

  // ── 1. How will it be reached? ─────────────────────────────────────────────
  console.log(`${BOLD}1) How will you reach the dashboard?${RESET}`);
  console.log(`   ${GREEN}a${RESET}) Only from this machine (SSH tunnel)  ${DIM}— safest, no port exposed${RESET}`);
  console.log(`   ${GREEN}b${RESET}) Publicly, behind a reverse proxy with HTTPS  ${DIM}— recommended for real use${RESET}`);
  const mode = (await ask('   Choose a or b', 'a')).toLowerCase();
  const isPublic = mode.startsWith('b');
  console.log('');

  const port = await ask('   Port the dashboard listens on', '3010');

  let host = '127.0.0.1';
  let publicUrl = `http://127.0.0.1:${port}`;

  if (isPublic) {
    // Bind stays on loopback: the reverse proxy connects locally, so the port
    // itself never needs to be open to the internet. That is strictly safer and
    // costs nothing.
    const domain = await ask('   Public domain (e.g. tickets.example.com)');
    if (!domain) {
      console.log(`${RED}   A domain is required for the public setup.${RESET}`);
      process.exit(1);
    }
    publicUrl = `https://${domain}`;
    console.log('');
    console.log(`${GREEN}   The dashboard will still bind to 127.0.0.1.${RESET}`);
    console.log(`${DIM}   Your reverse proxy talks to it locally, so the port stays closed to the internet.${RESET}`);
  }

  // ── 2. Discord OAuth ───────────────────────────────────────────────────────
  console.log('');
  console.log(`${BOLD}2) Discord login${RESET}`);
  console.log(`${DIM}   The dashboard reuses the Discord application you already created for the bot.${RESET}`);
  console.log('');
  console.log(`   ${BOLD}Add this Redirect URI${RESET} in the Discord Developer Portal`);
  console.log(`   ${DIM}(Your App → OAuth2 → Redirects → Add):${RESET}`);
  console.log('');
  console.log(`     ${GREEN}${publicUrl}/auth/callback${RESET}`);
  console.log('');
  await ask(`   ${DIM}Press Enter once you have added it${RESET}`, ' ');

  const existingSecret = process.env.CLIENT_SECRET;
  let clientSecret = existingSecret;
  if (existingSecret) {
    console.log(`${GREEN}   CLIENT_SECRET is already set in .env — keeping it.${RESET}`);
  } else {
    console.log(`   Copy the ${BOLD}Client Secret${RESET} from OAuth2 → Client Secret → Reset Secret.`);
    clientSecret = await ask('   CLIENT_SECRET');
    if (!clientSecret) {
      console.log(`${RED}   CLIENT_SECRET is required for the dashboard login.${RESET}`);
      process.exit(1);
    }
  }

  // ── 3. Write .env ──────────────────────────────────────────────────────────
  console.log('');
  console.log(`${BOLD}3) Writing configuration${RESET}`);

  let env = '';
  try {
    env = fs.readFileSync(ENV_PATH, 'utf-8');
  } catch {
    console.log(`${RED}   .env not found at ${ENV_PATH}. Copy .env.example first.${RESET}`);
    process.exit(1);
  }

  // Self-heal: an earlier version of this script mis-handled CRLF line endings
  // and appended duplicate keys instead of updating them. Collapse any duplicates
  // (keeping the value dotenv would actually resolve to) before writing.
  const { content: deduped, removed } = dedupeEnv(env);
  if (removed.length > 0) {
    env = deduped;
    console.log(`${YELLOW}   ✓ removed ${removed.length} duplicate entr${removed.length === 1 ? 'y' : 'ies'}: ${[...new Set(removed)].join(', ')}${RESET}`);
  }

  // Generated per installation, never shipped as a default: one shared secret
  // would let anyone forge a session on every installation at once.
  let secretNote = 'kept existing';
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    env = setEnvValue(env, 'SESSION_SECRET', crypto.randomBytes(48).toString('base64url'));
    secretNote = 'generated a new one';
  }

  env = setEnvValue(env, 'DASHBOARD_ENABLED', 'true');
  env = setEnvValue(env, 'DASHBOARD_HOST', host);
  env = setEnvValue(env, 'DASHBOARD_PORT', port);
  env = setEnvValue(env, 'DASHBOARD_PUBLIC_URL', publicUrl);
  env = setEnvValue(env, 'CLIENT_SECRET', clientSecret);

  fs.writeFileSync(ENV_PATH, env, 'utf-8');
  console.log(`${GREEN}   ✓ .env updated${RESET} ${DIM}(SESSION_SECRET: ${secretNote})${RESET}`);

  // ── 4. Reverse proxy snippet ───────────────────────────────────────────────
  if (isPublic) {
    const domain = publicUrl.replace(/^https:\/\//, '');
    if (isWindows) {
      printWindowsReverseProxy(domain, port);
    } else {
      printLinuxReverseProxy(domain, port);
    }
  }

  // ── 5. Done ────────────────────────────────────────────────────────────────
  console.log('');
  console.log(`${BOLD}Done.${RESET} Start the bot with the dashboard:`);
  console.log(`     ${GREEN}npm run dashboard${RESET}`);
  console.log('');
  if (!isPublic) {
    console.log(`${DIM}   The dashboard is bound to 127.0.0.1 and is NOT reachable from outside.`);
    if (isWindows) {
      console.log(`   Reach it by opening ${GREEN}http://127.0.0.1:${port}${RESET}${DIM} directly on the server`);
      console.log(`   (e.g. over Remote Desktop), or tunnel from your PC if OpenSSH Server is enabled:`);
      console.log(`     ssh -L ${port}:127.0.0.1:${port} user@your-server${RESET}`);
    } else {
      console.log(`   Reach it from your computer with an SSH tunnel:`);
      console.log(`     ssh -L ${port}:127.0.0.1:${port} user@your-server`);
      console.log(`   then open http://127.0.0.1:${port}${RESET}`);
    }
  } else {
    console.log(`${DIM}   Open ${publicUrl}${RESET}`);
  }

  // Keep it running across reboots.
  console.log('');
  if (isWindows) {
    console.log(`${DIM}   To keep it running after a reboot, register it as a Windows service`);
    console.log(`   (e.g. with NSSM: ${RESET}${GREEN}nssm install TicketBot "C:\\Program Files\\nodejs\\node.exe" dashboard.js${RESET}${DIM})`);
    console.log(`   or as a Task Scheduler task set to run at startup.${RESET}`);
  } else {
    console.log(`${DIM}   To keep it running after a reboot, run it under systemd`);
    console.log(`   (ExecStart=/usr/bin/node /opt/discord_ticketbot/dashboard.js). See docs/dashboard-en.md.${RESET}`);
  }

  console.log('');
  console.log(`${YELLOW}   The server owner is automatically an admin. Everyone else needs to be${RESET}`);
  console.log(`${YELLOW}   granted permissions in the dashboard under "Permissions".${RESET}`);
  console.log('');

  rl.close();
}

/**
 * Print the Linux reverse-proxy guidance (Apache + certbot + systemd).
 * @param {string} domain  public host name
 * @param {string} port    loopback port the dashboard listens on
 */
function printLinuxReverseProxy(domain, port) {
  console.log('');
  console.log(`${BOLD}4) Reverse proxy (Linux / Apache)${RESET}`);
  console.log(`${DIM}   Save as /etc/apache2/sites-available/ticketbot-dashboard.conf:${RESET}`);
  console.log('');
  console.log(`${DIM}<VirtualHost *:80>
    ServerName ${domain}
    RewriteEngine On
    RewriteRule ^/?(.*) https://${domain}/$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName ${domain}

    SSLEngine on
    # certbot fills in the certificate paths for you

    ProxyPreserveHost On
    ProxyPass        / http://127.0.0.1:${port}/
    ProxyPassReverse / http://127.0.0.1:${port}/

    # Required: the dashboard derives the client IP from the RIGHTMOST
    # X-Forwarded-For entry. Apache appends the real client here.
    RequestHeader set X-Forwarded-Proto "https"
</VirtualHost>${RESET}`);
  console.log('');
  console.log(`   Then run:`);
  console.log(`     ${GREEN}sudo a2enmod proxy proxy_http headers rewrite ssl${RESET}`);
  console.log(`     ${GREEN}sudo a2ensite ticketbot-dashboard${RESET}`);
  console.log(`     ${GREEN}sudo certbot --apache -d ${domain}${RESET}`);
  console.log(`     ${GREEN}sudo systemctl reload apache2${RESET}`);
}

/**
 * Print the Windows reverse-proxy guidance. Two options: IIS (native to Windows
 * Server, likely already installed) and Caddy (simplest, automatic HTTPS).
 * The dashboard polls for logs (no SSE) and reads the client IP from the
 * rightmost X-Forwarded-For, which both proxies append, so no special streaming
 * or header config is needed. HTTPS detection comes from DASHBOARD_PUBLIC_URL,
 * not from X-Forwarded-Proto.
 * @param {string} domain  public host name
 * @param {string} port    loopback port the dashboard listens on
 */
function printWindowsReverseProxy(domain, port) {
  console.log('');
  console.log(`${BOLD}4) Reverse proxy (Windows)${RESET}`);
  console.log(`${DIM}   The dashboard listens on 127.0.0.1:${port}. Put a reverse proxy with HTTPS in front.${RESET}`);
  console.log('');

  console.log(`   ${BOLD}Option A — IIS${RESET} ${DIM}(native; often already installed on Windows Server)${RESET}`);
  console.log(`${DIM}   Install "URL Rewrite" + "Application Request Routing" (ARR), enable the ARR`);
  console.log(`   proxy (IIS Manager → server node → Application Request Routing Cache → Server`);
  console.log(`   Proxy Settings → Enable proxy), then put this web.config in the site's root:${RESET}`);
  console.log('');
  console.log(`${DIM}<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ticketbot-dashboard" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:${port}/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>${RESET}`);
  console.log('');
  console.log(`${DIM}   TLS: bind an HTTPS certificate to the site. Easiest is win-acme`);
  console.log(`   (https://www.win-acme.com) — it issues a Let's Encrypt cert and auto-renews.`);
  console.log(`   ARR appends the real client to X-Forwarded-For automatically.${RESET}`);
  console.log('');

  console.log(`   ${BOLD}Option B — Caddy${RESET} ${DIM}(simplest, if port 443 is free — automatic HTTPS)${RESET}`);
  console.log(`${DIM}   Install Caddy for Windows, then use this Caddyfile:${RESET}`);
  console.log('');
  console.log(`${DIM}${domain} {
    reverse_proxy 127.0.0.1:${port}
}${RESET}`);
  console.log('');
  console.log(`${DIM}   Caddy obtains and renews the certificate automatically.${RESET}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`${RED}Setup failed: ${err.message}${RESET}`);
    process.exit(1);
  });
}

module.exports = { printLinuxReverseProxy, printWindowsReverseProxy };
