/**
 * Discord OAuth2 login for the dashboard.
 *
 * Self-hosters already have a Discord application (they created it for the bot),
 * so re-using it for the login means no second account system. They only need to
 * add CLIENT_SECRET and register the redirect URI.
 *
 * We request the `identify` scope ONLY. It answers exactly one question: who is
 * this person? Their roles and owner status are then resolved SERVER-SIDE via
 * the bot (see discord.js → resolveMemberContext). We deliberately do not ask
 * for `guilds.members.read`: never let the client tell us what permissions it
 * should have, and keep the requested scope as small as possible.
 */

const { redirectUri } = require('./config');

const OAUTH_AUTHORIZE = 'https://discord.com/oauth2/authorize';
const OAUTH_TOKEN     = 'https://discord.com/api/v10/oauth2/token';
const USER_ME         = 'https://discord.com/api/v10/users/@me';

const SCOPE = 'identify';

/** The URL we send the user to. `state` is a signed, short-lived token (CSRF for OAuth). */
function buildAuthorizeUrl(cfg, state) {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(cfg),
    response_type: 'code',
    scope: SCOPE,
    state,
    prompt: 'none',
  });
  return `${OAUTH_AUTHORIZE}?${params}`;
}

/**
 * Exchange the authorization code for an access token.
 * redirect_uri must match the registered one EXACTLY (Discord does a string compare).
 */
async function exchangeCode(cfg, code) {
  const res = await fetch(OAUTH_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(cfg),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OAuth token exchange failed (${res.status}): ${detail}`);
  }
  return res.json();
}

/** Who the user is, according to their own access token. */
async function fetchOAuthUser(accessToken) {
  const res = await fetch(USER_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to load the Discord user (${res.status}).`);

  const user = await res.json();
  return {
    id: user.id,
    username: user.username,
    displayName: user.global_name || user.username,
    avatar: user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
      : null,
  };
}

module.exports = { buildAuthorizeUrl, exchangeCode, fetchOAuthUser, SCOPE };
